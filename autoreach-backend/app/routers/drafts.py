from datetime import datetime, timezone
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db_session
from app.models.draft import AIDraft, DraftStatus
from app.models.thread import EmailThread, ThreadStatus
from app.schemas.draft import AIDraftList, AIDraftRead, RegenerateDraftRequest, ApproveDraftRequest
from app.services.ai_service import generate_follow_up
from app.workers.follow_up_worker import fallback_draft


router = APIRouter(prefix="/api/drafts", tags=["drafts"])


async def get_draft_or_404(draft_id: str, session: AsyncSession) -> AIDraft:
    draft = await session.get(AIDraft, draft_id)
    if draft is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI draft not found.",
        )
    return draft


@router.get("/", response_model=AIDraftList)
async def list_drafts(
    status_filter: DraftStatus | None = Query(default=None, alias="status"),
    user_id: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
) -> AIDraftList:
    query = select(AIDraft)
    count_query = select(func.count()).select_from(AIDraft)

    if user_id is not None:
        query = query.join(EmailThread).where(EmailThread.user_id == user_id)
        count_query = count_query.join(EmailThread).where(EmailThread.user_id == user_id)

    if status_filter is not None:
        query = query.where(AIDraft.status == status_filter)
        count_query = count_query.where(AIDraft.status == status_filter)

    result = await session.execute(query.order_by(AIDraft.created_at.desc()).limit(limit).offset(offset))
    total = await session.scalar(count_query)
    return AIDraftList(drafts=list(result.scalars().all()), total=total or 0)


@router.get("/{draft_id}", response_model=AIDraftRead)
async def get_draft(
    draft_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> AIDraft:
    return await get_draft_or_404(draft_id, session)


@router.post("/{draft_id}/approve", response_model=AIDraftRead)
async def approve_draft(
    draft_id: str,
    payload: ApproveDraftRequest,
    session: AsyncSession = Depends(get_db_session),
) -> AIDraft:
    draft = await get_draft_or_404(draft_id, session)
    if draft.status == DraftStatus.DISMISSED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Dismissed drafts cannot be approved.",
        )

    thread = await session.get(EmailThread, draft.thread_id)
    if thread is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Draft is not attached to an existing email thread.",
        )

    settings = get_settings()
    
    # Check if we should actually send the email via SMTP
    password = payload.gmail_password.replace(" ", "") if payload.gmail_password else ""
    if not password:
        from app.models.user import User
        user_db = await session.get(User, thread.user_id.strip().lower())
        if user_db and user_db.gmail_password:
            password = user_db.gmail_password.replace(" ", "")

    if not password and thread.user_id.strip().lower() == settings.imap_user.strip().lower():
        password = settings.imap_password.replace(" ", "")

    if password:
        # Actually send via Gmail SMTP
        try:
            # Create message container
            msg = MIMEMultipart()
            msg['From'] = thread.user_id
            msg['To'] = thread.recipient_email
            msg['Subject'] = draft.draft_subject
            
            msg.attach(MIMEText(draft.draft_body, 'plain', 'utf-8'))
            
            # Connect to SMTP
            server = smtplib.SMTP("smtp.gmail.com", 587)
            server.starttls()
            try:
                server.login(thread.user_id, password)
                server.sendmail(thread.user_id, thread.recipient_email, msg.as_string())
            finally:
                server.quit()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to send email via SMTP: {str(e)}",
            )
        draft.status = DraftStatus.SENT
    else:
        # Mock/simulated sending
        draft.status = DraftStatus.SENT

    # Set thread status back to tracking so it monitors for replies to the new follow-up
    thread.status = ThreadStatus.TRACKING
    thread.sent_at = datetime.now(timezone.utc)
    
    await session.commit()
    await session.refresh(draft)
    return draft


@router.post("/{draft_id}/dismiss", response_model=AIDraftRead)
async def dismiss_draft(
    draft_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> AIDraft:
    draft = await get_draft_or_404(draft_id, session)
    draft.status = DraftStatus.DISMISSED
    await session.commit()
    await session.refresh(draft)
    return draft


@router.post("/{draft_id}/regenerate", response_model=AIDraftRead, status_code=status.HTTP_201_CREATED)
async def regenerate_draft(
    draft_id: str,
    payload: RegenerateDraftRequest,
    session: AsyncSession = Depends(get_db_session),
) -> AIDraft:
    draft = await get_draft_or_404(draft_id, session)
    thread = await session.get(EmailThread, draft.thread_id)
    if thread is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Draft is not attached to an existing email thread.",
        )

    try:
        generated = await generate_follow_up(
            original_body=thread.original_body,
            recipient_name=thread.recipient_name,
            tone=payload.tone,
            intent_tag=thread.intent_tag.value,
        )
    except Exception:
        generated = fallback_draft(thread, payload.tone)

    draft.status = DraftStatus.REGENERATED
    new_draft = AIDraft(
        thread_id=thread.id,
        draft_subject=generated["subject"],
        draft_body=generated["body"],
        tone=payload.tone,
        tokens_used=int(generated.get("tokens_used", 0)),
        status=DraftStatus.PENDING,
    )
    thread.status = ThreadStatus.DRAFT_READY
    session.add(new_draft)
    await session.commit()
    await session.refresh(new_draft)
    return new_draft
