import asyncio
import logging
from datetime import datetime
from sqlalchemy import select
from app.core.db import SessionLocal
from app.modules.notification.models import PushSubscription
from app.modules.notification.services.push_service import PushService
from app.modules.quiz.services.quiz_service import QuizService

logger = logging.getLogger(__name__)

async def check_and_send_daily_reminders():
    logger.info("[SCHEDULER] Checking for due reviews to send push reminders...")
    async with SessionLocal() as db:
        # Get all push subscriptions
        res = await db.execute(select(PushSubscription))
        subscriptions = res.scalars().all()
        
        # Group subscriptions by user_id
        user_subs = {}
        for sub in subscriptions:
            user_subs.setdefault(sub.user_id, []).append(sub)
            
        for user_id, subs in user_subs.items():
            try:
                # Query if they have due cards today
                review_data = await QuizService.get_today_review(db, user_id)
                due_count = review_data.get("due_cards_count", 0)
                streak_at_risk = review_data.get("streak_at_risk", False)
                
                if due_count > 0 and streak_at_risk:
                    # Send push to all active subscriptions of this user
                    for sub in subs:
                        title = "🔥 Streak at Risk! (Vocaburn)"
                        body = f"You have {due_count} card{'s' if due_count > 1 else ''} due for review today. Keep your streak alive!"
                        await PushService.send_push(db, sub, title, body, "/dashboard")
            except Exception as e:
                logger.error(f"[SCHEDULER] Error processing reminder for user {user_id}: {e}")

async def scheduler_loop():
    logger.info("[SCHEDULER] Reminder scheduler loop started.")
    # Run a quick check 10 seconds after startup for easy testing/verification
    await asyncio.sleep(10)
    await check_and_send_daily_reminders()
    
    last_run_day = None
    while True:
        try:
            now = datetime.now()
            current_day = now.date()
            # Send daily reminder at 19:00 (7 PM)
            if now.hour == 19 and current_day != last_run_day:
                await check_and_send_daily_reminders()
                last_run_day = current_day
                
            # Sleep for 15 minutes before checking again
            await asyncio.sleep(900)
        except asyncio.CancelledError:
            logger.info("[SCHEDULER] Scheduler loop task cancelled.")
            break
        except Exception as e:
            logger.error(f"[SCHEDULER] Error in scheduler loop: {e}")
            await asyncio.sleep(60)

def start_scheduler():
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.get_event_loop()
    task = loop.create_task(scheduler_loop())
    return task
