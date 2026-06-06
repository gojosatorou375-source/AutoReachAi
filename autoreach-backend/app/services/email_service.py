import asyncio
import imaplib
from datetime import datetime, timezone
from email.header import decode_header
from email.utils import parsedate_to_datetime

from app.config import get_settings
from app.models.thread import EmailThread


def _decode_mime_header(value: bytes | str | None) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        value = value.decode("utf-8", errors="replace")

    fragments: list[str] = []
    for part, encoding in decode_header(value):
        if isinstance(part, bytes):
            fragments.append(part.decode(encoding or "utf-8", errors="replace"))
        else:
            fragments.append(part)
    return "".join(fragments)


def _normalize_subject(subject: str) -> str:
    normalized = subject.strip().lower()
    while normalized.startswith(("re:", "fw:", "fwd:")):
        normalized = normalized.split(":", 1)[1].strip()
    return normalized


def _imap_date(dt: datetime) -> str:
    return dt.strftime("%d-%b-%Y")


def _as_naive_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def _has_reply_sync(thread: EmailThread) -> bool:
    settings = get_settings()
    with imaplib.IMAP4_SSL(settings.imap_host) as mailbox:
        mailbox.login(settings.imap_user, settings.imap_password.replace(" ", ""))
        mailbox.select("INBOX", readonly=True)

        criteria = (
            f'(FROM "{thread.recipient_email}" '
            f'SINCE "{_imap_date(thread.sent_at)}" '
            f'SUBJECT "{_normalize_subject(thread.subject)}")'
        )
        status, data = mailbox.search(None, criteria)
        if status != "OK" or not data or not data[0]:
            return False

        expected_subject = _normalize_subject(thread.subject)
        for message_id in data[0].split():
            fetch_status, message_data = mailbox.fetch(message_id, "(BODY.PEEK[HEADER.FIELDS (SUBJECT DATE FROM)])")
            if fetch_status != "OK":
                continue

            raw_header = next(
                (part[1] for part in message_data if isinstance(part, tuple) and len(part) > 1),
                b"",
            )
            header_text = raw_header.decode("utf-8", errors="replace")
            subject_line = ""
            date_line = ""
            for line in header_text.splitlines():
                if line.lower().startswith("subject:"):
                    subject_line = line.split(":", 1)[1].strip()
                if line.lower().startswith("date:"):
                    date_line = line.split(":", 1)[1].strip()

            if _normalize_subject(_decode_mime_header(subject_line)) != expected_subject:
                continue

            if date_line:
                try:
                    reply_date = parsedate_to_datetime(date_line)
                    if reply_date and _as_naive_utc(reply_date) <= _as_naive_utc(thread.sent_at):
                        continue
                except (TypeError, ValueError):
                    pass
            return True

    return False


async def has_reply(thread: EmailThread) -> bool:
    return await asyncio.to_thread(_has_reply_sync, thread)
