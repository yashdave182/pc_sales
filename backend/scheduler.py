
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import logging
from supabase_db import get_supabase
from routers.automation import run_daily_distribution

logger = logging.getLogger(__name__)

def distribute_calls_job():
    """
    Job to be run daily.
    Initializes a new DB client (to be thread-safe) and runs distribution logic.
    """
    try:
        logger.info("Starting daily calling list distribution job...")
        db = get_supabase()
        
        # We pass None for admin_email as this is a system job
        result = run_daily_distribution(db=db, admin_email="system_scheduler")
        
        logger.info(f"Daily distribution completed: {result}")
    except Exception as e:
        logger.error(f"Daily distribution job failed: {e}")

def start_scheduler():
    """
    Starts the background scheduler.
    """
    scheduler = BackgroundScheduler()
    
    # Schedule to run every day at 09:00 AM
    trigger = CronTrigger(hour=9, minute=0)
    
    scheduler.add_job(
        distribute_calls_job,
        trigger=trigger,
        id="daily_calling_distribution",
        name="Distribute Calling List",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler started - Daily distribution set for 09:00 AM")
    return scheduler
