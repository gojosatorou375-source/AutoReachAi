from datetime import datetime, timezone, timedelta
import imaplib
import email
from email.utils import parseaddr, parsedate_to_datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db_session
from app.models.thread import EmailThread, ThreadStatus, IntentTag
from app.schemas.thread import EmailThreadCreate, EmailThreadList, EmailThreadRead, GmailSyncRequest
from app.services.email_service import _decode_mime_header


router = APIRouter(prefix="/api/threads", tags=["threads"])


async def get_thread_or_404(thread_id: str, session: AsyncSession) -> EmailThread:
    thread = await session.get(EmailThread, thread_id)
    if thread is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email thread not found.",
        )
    return thread


@router.post("/", response_model=EmailThreadRead, status_code=status.HTTP_201_CREATED)
async def create_thread(
    payload: EmailThreadCreate,
    session: AsyncSession = Depends(get_db_session),
) -> EmailThread:
    thread = EmailThread(
        user_id=payload.user_id,
        recipient_email=str(payload.recipient_email),
        recipient_name=payload.recipient_name,
        subject=payload.subject,
        original_body=payload.original_body,
        sent_at=payload.sent_at,
        status=ThreadStatus.TRACKING,
        intent_tag=payload.intent_tag,
        urgency_score=payload.urgency_score,
    )
    session.add(thread)
    await session.commit()
    await session.refresh(thread)
    return thread


@router.get("/", response_model=EmailThreadList)
async def list_threads(
    user_id: str = Query(..., min_length=1),
    status_filter: ThreadStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
) -> EmailThreadList:
    base_query: Select[tuple[EmailThread]] = select(EmailThread).where(EmailThread.user_id == user_id)
    count_query = select(func.count()).select_from(EmailThread).where(EmailThread.user_id == user_id)

    if status_filter is not None:
        base_query = base_query.where(EmailThread.status == status_filter)
        count_query = count_query.where(EmailThread.status == status_filter)

    result = await session.execute(
        base_query.order_by(EmailThread.created_at.desc()).limit(limit).offset(offset)
    )
    total = await session.scalar(count_query)
    return EmailThreadList(threads=list(result.scalars().all()), total=total or 0)


def _parse_email_body(msg) -> str:
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))
            if content_type == "text/plain" and "attachment" not in content_disposition:
                try:
                    payload = part.get_payload(decode=True)
                    if payload:
                        body = payload.decode("utf-8", errors="replace")
                except Exception:
                    pass
                break
    else:
        try:
            payload = msg.get_payload(decode=True)
            if payload:
                body = payload.decode("utf-8", errors="replace")
        except Exception:
            pass
    return body.strip()


@router.post("/sync-gmail", status_code=status.HTTP_200_OK)
async def sync_gmail_sent_threads(
    payload: GmailSyncRequest,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    synced_count = 0
    settings = get_settings()
    
    # Check if a password was provided. If not, try to fetch it from the database User record
    password = payload.gmail_password.replace(" ", "") if payload.gmail_password else ""
    if not password:
        from app.models.user import User
        user_db = await session.get(User, payload.user_id.strip().lower())
        if user_db and user_db.gmail_password:
            password = user_db.gmail_password.replace(" ", "")

    if not password:
        if payload.user_id.strip().lower() == settings.imap_user.strip().lower():
            password = settings.imap_password.replace(" ", "")
        else:
            # Create mock threads for demonstration if it's a mock user and no credentials exist
            mock_threads = [
                {
                    "recipient_email": "investor@sequoiacap.com",
                    "recipient_name": "Sequoia Capital",
                    "subject": "Seed Round Pitch: AutoReach AI",
                    "original_body": "Hi Partners, following up on our pitch deck for AutoReach AI. We have reached $15k MRR with 46% reply rates. Would love to share our progress.",
                    "sent_at": datetime.now(timezone.utc) - timedelta(days=8),
                    "intent_tag": IntentTag.SALES
                },
                {
                    "recipient_email": "hr@google.com",
                    "recipient_name": "Google Careers",
                    "subject": "Software Engineer Internship - Mohan",
                    "original_body": "Dear Hiring Team, I recently submitted my application for the Software Engineer Intern role. I wanted to check if there are any updates.",
                    "sent_at": datetime.now(timezone.utc) - timedelta(days=9),
                    "intent_tag": IntentTag.INTERNSHIP
                }
            ]
            for mt in mock_threads:
                stmt = select(EmailThread).where(
                    EmailThread.user_id == payload.user_id,
                    EmailThread.recipient_email == mt["recipient_email"],
                    EmailThread.subject == mt["subject"],
                )
                res = await session.execute(stmt)
                if not res.scalar_one_or_none():
                    new_thread = EmailThread(
                        user_id=payload.user_id,
                        recipient_email=mt["recipient_email"],
                        recipient_name=mt["recipient_name"],
                        subject=mt["subject"],
                        original_body=mt["original_body"],
                        sent_at=mt["sent_at"],
                        status=ThreadStatus.TRACKING,
                        intent_tag=mt["intent_tag"],
                        urgency_score=0,
                    )
                    session.add(new_thread)
                    synced_count += 1
            if synced_count > 0:
                await session.commit()
            return {"synced_count": synced_count, "mock": True}

    try:
        # 1. Connect and login to Gmail IMAP
        mailbox = imaplib.IMAP4_SSL("imap.gmail.com")
        mailbox.login(payload.user_id, password)
    except imaplib.IMAP4.error as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to login to Gmail: {str(e)}. Please verify your App Password and check if IMAP is enabled.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gmail connection failed: {str(e)}",
        )

    try:
        # 2. Select Sent Mail folder
        select_status, _ = mailbox.select('"[Gmail]/Sent Mail"', readonly=True)
        if select_status != "OK":
            # Fallback for other locales or custom configurations
            select_status, _ = mailbox.select("Sent", readonly=True)
            if select_status != "OK":
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Could not find the Gmail Sent Mail folder.",
                )

        # 3. Retrieve all outbound messages
        search_status, search_data = mailbox.search(None, "ALL")
        if search_status != "OK" or not search_data or not search_data[0]:
            return {"synced_count": 0}

        message_ids = search_data[0].split()
        # Fetch the most recent 15 sent emails
        recent_ids = message_ids[-15:]

        for msg_id in reversed(recent_ids):
            fetch_status, fetch_data = mailbox.fetch(msg_id, "(RFC822)")
            if fetch_status != "OK" or not fetch_data:
                continue

            raw_email = next(
                (part[1] for part in fetch_data if isinstance(part, tuple) and len(part) > 1),
                b"",
            )
            if not raw_email:
                continue

            msg = email.message_from_bytes(raw_email)
            
            # Extract basic headers
            subject = _decode_mime_header(msg.get("Subject", "(No Subject)"))
            to_header = msg.get("To", "")
            
            # Parse recipient
            recipient_name, recipient_email = parseaddr(to_header)
            if not recipient_email:
                continue

            # Parse sent date
            date_header = msg.get("Date")
            if date_header:
                try:
                    sent_at = parsedate_to_datetime(date_header)
                except Exception:
                    sent_at = datetime.now(timezone.utc)
            else:
                sent_at = datetime.now(timezone.utc)

            # Ensure sent_at is timezone-aware and set to UTC
            if sent_at.tzinfo is None:
                sent_at = sent_at.replace(tzinfo=timezone.utc)
            else:
                sent_at = sent_at.astimezone(timezone.utc)

            # Extract body
            original_body = _parse_email_body(msg)

            # 4. Check if thread already exists in database
            stmt = select(EmailThread).where(
                EmailThread.user_id == payload.user_id,
                EmailThread.recipient_email == recipient_email,
                EmailThread.subject == subject,
            )
            res = await session.execute(stmt)
            existing_thread = res.scalar_one_or_none()
            if existing_thread:
                continue

            # 5. Add new email thread
            new_thread = EmailThread(
                user_id=payload.user_id,
                recipient_email=recipient_email,
                recipient_name=recipient_name or recipient_email.split("@")[0],
                subject=subject,
                original_body=original_body or "(No message body)",
                sent_at=sent_at,
                status=ThreadStatus.TRACKING,
                intent_tag=IntentTag.OTHER,
                urgency_score=0,
            )
            session.add(new_thread)
            synced_count += 1

            # 6. Check for PDF attachments in the email and auto-analyze them
            if msg.is_multipart():
                for part in msg.walk():
                    content_type = part.get_content_type()
                    content_disposition = str(part.get("Content-Disposition"))
                    filename = part.get_filename()
                    if filename:
                        filename = _decode_mime_header(filename)
                    else:
                        filename = ""
                        
                    # Check if it is a PDF attachment
                    if content_type == "application/pdf" or (
                        "attachment" in content_disposition and filename.lower().endswith(".pdf")
                    ):
                        pdf_bytes = part.get_payload(decode=True)
                        if pdf_bytes:
                            # Verify if we already have this PDF analyzed for this user
                            from app.models.analyzer import PDFAnalysis
                            stmt_pdf = select(PDFAnalysis).where(
                                PDFAnalysis.user_id == payload.user_id,
                                PDFAnalysis.filename == filename,
                            )
                            res_pdf = await session.execute(stmt_pdf)
                            if not res_pdf.scalar_one_or_none():
                                from app.routers.analyzer import extract_text_from_pdf, parse_pdf_invoice
                                try:
                                    raw_text = extract_text_from_pdf(pdf_bytes)
                                    if raw_text:
                                        # Parse metadata using AI
                                        extracted = await parse_pdf_invoice(raw_text)
                                        # Save analysis
                                        new_analysis = PDFAnalysis(
                                            user_id=payload.user_id,
                                            filename=filename,
                                            vendor=extracted["vendor"],
                                            amount=extracted["amount"],
                                            due_date=extracted["due_date"],
                                            invoice_number=extracted["invoice_number"],
                                            summary=extracted["summary"],
                                            raw_text=raw_text,
                                            chat_history=[
                                                {
                                                    "role": "assistant",
                                                    "content": f"Hi! I automatically extracted this document '{filename}' from your email synced thread '{subject}'. It looks like an invoice from {extracted['vendor'] or 'Unknown'} for {extracted['amount'] or 'N/A'}. Let me know if you have questions!"
                                                }
                                            ]
                                        )
                                        session.add(new_analysis)
                                except Exception as pdf_err:
                                    # Log warning but don't fail the sync
                                    import logging
                                    logging.getLogger(__name__).warning("Failed to auto-parse PDF attachment %s: %s", filename, pdf_err)

        if synced_count > 0:
            await session.commit()

        return {"synced_count": synced_count}

    finally:
        try:
            mailbox.logout()
        except Exception:
            pass


@router.post("/scan-and-generate", status_code=status.HTTP_200_OK)
async def scan_and_generate_drafts(
    stale_days: int = Query(default=7, ge=0),
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    from app.workers.follow_up_worker import scan_stale_threads
    created_count = await scan_stale_threads(stale_days=stale_days, session=session)
    return {"created_count": created_count}


@router.get("/{thread_id}", response_model=EmailThreadRead)
async def get_thread(
    thread_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> EmailThread:
    return await get_thread_or_404(thread_id, session)


@router.patch("/{thread_id}/dismiss", response_model=EmailThreadRead)
async def dismiss_thread(
    thread_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> EmailThread:
    thread = await get_thread_or_404(thread_id, session)
    thread.status = ThreadStatus.DISMISSED
    thread.last_checked_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(thread)
    return thread
