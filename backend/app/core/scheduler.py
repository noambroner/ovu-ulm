import logging
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.services.user_status_service import UserStatusService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = None


async def check_and_execute_scheduled_deactivations():
    """
    Check for overdue scheduled deactivations and execute them
    This function runs periodically (every minute)
    """
    async with AsyncSessionLocal() as db:
        try:
            logger.info("Checking for scheduled deactivations...")
            
            # Get all overdue actions
            overdue_actions = await UserStatusService.get_overdue_actions(db)
            
            if not overdue_actions:
                logger.info("No overdue deactivations found")
                return
            
            logger.info(f"Found {len(overdue_actions)} overdue deactivations")
            
            # Execute each overdue action
            for action in overdue_actions:
                try:
                    logger.info(f"Executing scheduled deactivation for user_id={action.user_id}, action_id={action.id}")
                    success = await UserStatusService.execute_scheduled_deactivation(db, action.id)
                    
                    if success:
                        logger.info(f"✅ Successfully executed deactivation for user_id={action.user_id}")
                    else:
                        logger.error(f"❌ Failed to execute deactivation for user_id={action.user_id}")
                
                except Exception as e:
                    logger.error(f"❌ Error executing deactivation for user_id={action.user_id}: {str(e)}")
                    continue
            
            logger.info("Completed scheduled deactivations check")
        
        except Exception as e:
            logger.error(f"❌ Error in check_and_execute_scheduled_deactivations: {str(e)}")


def start_scheduler():
    """
    Start the async scheduler for scheduled tasks
    """
    global scheduler
    
    if scheduler is not None:
        logger.warning("Scheduler already started")
        return scheduler
    
    logger.info("🚀 Starting user status scheduler...")
    
    scheduler = AsyncIOScheduler(
        timezone="UTC",
        job_defaults={
            'coalesce': True,  # Combine multiple pending executions into one
            'max_instances': 1,  # Only one instance of each job at a time
            'misfire_grace_time': 300  # 5 minutes grace time for misfired jobs
        }
    )
    
    # Add job to check for scheduled deactivations every minute
    scheduler.add_job(
        func=check_and_execute_scheduled_deactivations,
        trigger=IntervalTrigger(minutes=1),
        id='check_scheduled_deactivations',
        name='Check and Execute Scheduled Deactivations',
        replace_existing=True
    )
    
    # Start the scheduler
    scheduler.start()
    logger.info("✅ User status scheduler started successfully")
    logger.info("📅 Scheduled job: Check deactivations every 1 minute")
    
    return scheduler


def shutdown_scheduler():
    """
    Shutdown the scheduler gracefully
    """
    global scheduler
    
    if scheduler is None:
        logger.warning("Scheduler not running")
        return
    
    logger.info("🛑 Shutting down user status scheduler...")
    scheduler.shutdown(wait=True)
    scheduler = None
    logger.info("✅ Scheduler shut down successfully")


def get_scheduler():
    """
    Get the scheduler instance
    """
    global scheduler
    return scheduler


def get_scheduler_status():
    """
    Get scheduler status information
    """
    global scheduler
    
    if scheduler is None:
        return {
            "running": False,
            "jobs": []
        }
    
    jobs_info = []
    for job in scheduler.get_jobs():
        jobs_info.append({
            "id": job.id,
            "name": job.name,
            "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger)
        })
    
    return {
        "running": scheduler.running,
        "jobs": jobs_info
    }


# Export functions
__all__ = [
    'start_scheduler',
    'shutdown_scheduler',
    'get_scheduler',
    'get_scheduler_status',
    'check_and_execute_scheduled_deactivations'
]
