import asyncio
import logging
from datetime import datetime, timedelta, timezone

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.draft import AIDraft, DraftStatus
from app.models.thread import EmailThread, ThreadStatus
from app.services.ai_service import generate_follow_up
from app.services.email_service import has_reply


logger = logging.getLogger(__name__)
FOLLOW_UP_QUEUE = "autoreach:follow_up_scan"


def fallback_draft(thread: EmailThread, tone: str) -> dict:
    return {
        "subject": f"Following up: {thread.subject}",
        "body": (
            f"Hi {thread.recipient_name}, I hope you are doing well. "
            "I wanted to follow up on my previous note and check whether you had a chance to review it. "
            "I know things get busy, and I would appreciate any update when convenient."
        ),
        "tokens_used": 0,
        "tone": tone,
    }


async def enqueue_follow_up_scan() -> None:
    settings = get_settings()
    try:
        redis = Redis.from_url(settings.redis_url, decode_responses=True)
        await redis.lpush(FOLLOW_UP_QUEUE, datetime.now(timezone.utc).isoformat())
        await redis.aclose()
    except Exception as e:
        logger.warning("Failed to queue scan in Redis: %s. Background scans will run directly.", e)


async def consume_follow_up_queue_once() -> int:
    settings = get_settings()
    try:
        redis = Redis.from_url(settings.redis_url, decode_responses=True)
        item = await redis.rpop(FOLLOW_UP_QUEUE)
        await redis.aclose()
        if item is None:
            return 0
        return await scan_stale_threads()
    except Exception as e:
        logger.warning("Failed to read from Redis queue: %s. Falling back to direct thread scan.", e)
        return await scan_stale_threads()


async def _create_draft_for_thread(session: AsyncSession, thread: EmailThread, tone: str = "professional") -> bool:
    thread.last_checked_at = datetime.now(timezone.utc)

    try:
        replied = await has_reply(thread)
    except Exception as e:
        logger.error("IMAP reply check failed for thread %s: %s. Skipping reply check for this run.", thread.id, e)
        replied = False

    if replied:
        thread.status = ThreadStatus.REPLIED
        await session.commit()
        logger.info("Thread %s marked replied.", thread.id)
        return False

    try:
        generated = await asyncio.wait_for(
            generate_follow_up(
                original_body=thread.original_body,
                recipient_name=thread.recipient_name,
                tone=tone,
                intent_tag=thread.intent_tag.value,
            ),
            timeout=12.0,
        )
    except Exception:
        logger.exception("AI generation failed for thread %s. Saving fallback draft.", thread.id)
        generated = fallback_draft(thread, tone)

    draft = AIDraft(
        thread_id=thread.id,
        draft_subject=generated["subject"],
        draft_body=generated["body"],
        tone=tone,
        tokens_used=int(generated.get("tokens_used", 0)),
        status=DraftStatus.PENDING,
    )
    session.add(draft)
    thread.status = ThreadStatus.DRAFT_READY
    await session.commit()
    logger.info("Draft %s created for thread %s.", draft.id, thread.id)
    return True


async def scan_stale_threads(stale_days: int | None = None, session: AsyncSession | None = None) -> int:
    settings = get_settings()
    days = stale_days if stale_days is not None else settings.stale_after_days
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    if session is not None:
        return await _scan_threads_with_session(session, cutoff)
    else:
        async with AsyncSessionLocal() as session_ctx:
            return await _scan_threads_with_session(session_ctx, cutoff)


async def _scan_threads_with_session(session: AsyncSession, cutoff: datetime) -> int:
    result = await session.execute(
        select(EmailThread)
        .where(EmailThread.status == ThreadStatus.TRACKING)
        .where(EmailThread.sent_at <= cutoff)
        .order_by(EmailThread.sent_at.asc())
    )
    threads = list(result.scalars().all())

    created_count = 0
    for thread in threads:
        if await _create_draft_for_thread(session, thread):
            created_count += 1
    return created_count


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    created_count = await scan_stale_threads()
    logger.info("Follow-up scan complete. Created %s drafts.", created_count)


if __name__ == "__main__":
    asyncio.run(main())
