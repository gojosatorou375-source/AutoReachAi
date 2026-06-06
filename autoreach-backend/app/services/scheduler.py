import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import get_settings
from app.workers.follow_up_worker import consume_follow_up_queue_once, enqueue_follow_up_scan


logger = logging.getLogger(__name__)


async def scheduled_scan_job() -> None:
    await enqueue_follow_up_scan()
    created_count = await consume_follow_up_queue_once()
    logger.info("Scheduled follow-up scan finished. Created %s drafts.", created_count)


def create_scheduler() -> AsyncIOScheduler:
    settings = get_settings()
    scheduler = AsyncIOScheduler(timezone=settings.scheduler_timezone)
    scheduler.add_job(
        scheduled_scan_job,
        trigger="cron",
        hour=8,
        minute=0,
        id="daily-follow-up-scan",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    return scheduler


async def run_scheduler_forever() -> None:
    logging.basicConfig(level=logging.INFO)
    scheduler = create_scheduler()
    scheduler.start()
    logger.info("AutoReach scheduler started.")
    try:
        while True:
            await asyncio.sleep(3600)
    finally:
        scheduler.shutdown(wait=False)


if __name__ == "__main__":
    asyncio.run(run_scheduler_forever())
