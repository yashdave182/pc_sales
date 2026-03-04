
import os
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from supabase_db import get_supabase

logger = logging.getLogger(__name__)

def distribute_calls_job():
    """Daily 10 AM IST job: idempotent call distribution."""
    try:
        logger.info("⏰ Auto-distribution triggered by scheduler (10 AM IST)")
        from routers.automation import distribute_calls
        db = get_supabase()
        result = distribute_calls(db, admin_email="system_scheduler")
        logger.info(f"Auto-distribution result: {result}")
    except Exception as e:
        logger.error(f"Auto-distribution failed: {e}")

def midnight_refresh_job():
    """Midnight IST job: clear pending assignments so new day starts fresh."""
    try:
        logger.info("🌙 Midnight refresh — clearing yesterday's pending assignments")
        from datetime import date, timedelta
        db = get_supabase()
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        # Delete yesterday's pending (uncalled) assignments
        db.table("calling_assignments") \
            .eq("assigned_date", yesterday) \
            .eq("status", "Pending") \
            .delete()
        logger.info(f"Cleared pending assignments from {yesterday}")
    except Exception as e:
        logger.error(f"Midnight refresh failed: {e}")

def start_scheduler():
    """
    Start APScheduler with single-worker guard.
    Only runs if SCHEDULER_ENABLED=1 env var is set (set on one worker only).
    """
    scheduler = BackgroundScheduler()

    if os.environ.get("SCHEDULER_ENABLED", "").strip() == "1":
        # 10:00 AM IST (UTC+5:30 = 4:30 AM UTC)
        scheduler.add_job(
            distribute_calls_job,
            trigger=CronTrigger(hour=4, minute=30),
            id="daily_calling_distribution",
            name="Auto-Distribute at 10 AM IST",
            replace_existing=True
        )
        # 12:00 AM IST (midnight = 6:30 PM UTC previous day)
        scheduler.add_job(
            midnight_refresh_job,
            trigger=CronTrigger(hour=18, minute=30),
            id="midnight_refresh",
            name="Midnight Refresh — Clear Pending",
            replace_existing=True
        )
        scheduler.start()
        logger.info("✅ Scheduler ENABLED — midnight refresh + 10 AM distribution")
    else:
        logger.info("⏸️ Scheduler DISABLED — set SCHEDULER_ENABLED=1 to enable")

    return scheduler
