"""Background scheduler that checks for and delivers due reminders."""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
import pytz
from loguru import logger

from bot import speak_to_elder
from models.db import get_due_reminders, mark_reminder_triggered

scheduler = AsyncIOScheduler()


async def check_reminders():
    now = datetime.now(pytz.timezone("Europe/Skopje"))
    due = get_due_reminders(now)

    for reminder in due:
        delivered = await speak_to_elder(reminder["elder_id"], reminder["message"])
        if delivered:
            mark_reminder_triggered(reminder["reminder_id"], now)
            logger.info(
                "Delivered reminder {} to elder {}",
                reminder["reminder_id"],
                reminder["elder_id"],
            )


scheduler.add_job(check_reminders, "cron", minute="*")