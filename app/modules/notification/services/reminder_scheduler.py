import asyncio
import logging
from datetime import datetime
from sqlalchemy import select
from app.core.db import SessionLocal
from app.modules.notification.models import PushSubscription
from app.modules.notification.services.push_service import PushService
from app.modules.deck.services.deck_service import DeckService

logger = logging.getLogger(__name__)

async def _get_active_configs(db) -> list:
    from app.modules.sso_module.service import SSOService
    from app.modules.auth.models import User
    
    try:
        sso_config = await SSOService.get_config(db)
        if sso_config.is_enabled and sso_config.server_url:
            import httpx
            from app.core.config import settings
            queue_token = getattr(settings, "QUEUE_API_SECRET", "super-secret-token-123")
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{sso_config.server_url.rstrip('/')}/api/queue/telegram/configs",
                    headers={"X-Queue-Token": queue_token},
                    timeout=15.0
                )
                if response.status_code == 200:
                    remote_configs = response.json()
                    resolved = []
                    for rc in remote_configs:
                        sso_id = str(rc.get("user_id"))
                        user_res = await db.execute(select(User).where(User.sso_id == sso_id))
                        user = user_res.scalar_one_or_none()
                        if user:
                            rc["local_user_id"] = user.id
                            resolved.append(rc)
                    return resolved
                logger.error(f"[Scheduler] CentralAuth config fetch returned {response.status_code}: {response.text}")
    except Exception as sso_err:
        logger.warning(f"[Scheduler] Failed to fetch configs from CentralAuth, falling back to local: {sso_err}")

    # Fallback to local
    from app.modules.notification.models import UserTelegramConfig
    res = await db.execute(select(UserTelegramConfig))
    local_configs = res.scalars().all()
    return [
        {
            "local_user_id": c.user_id,
            "telegram_chat_id": c.telegram_chat_id,
            "reminder_time": c.reminder_time,
            "is_active": c.is_active,
            "streak_guard_enabled": c.streak_guard_enabled,
            "weekly_summary_enabled": c.weekly_summary_enabled,
            "inactivity_alert_enabled": c.inactivity_alert_enabled
        }
        for c in local_configs
    ]

async def check_and_send_reminders_for_minute(current_time_str: str):
    logger.info(f"[SCHEDULER] Checking reminders for time {current_time_str}...")
    from app.modules.notification.services.telegram_service import TelegramService
    
    async with SessionLocal() as db:
        configs = await _get_active_configs(db)
        
        # Filter configs matching reminder time and active status
        active_reminders = [
            c for c in configs 
            if c.get("reminder_time") == current_time_str and c.get("is_active") is True
        ]
        
        for config in active_reminders:
            try:
                user_id = config["local_user_id"]
                
                # Query if they have due cards today
                review_data = await DeckService.get_today_review(db, user_id)
                due_count = review_data.get("due_cards_count", 0)
                
                if due_count > 0:
                    title = "🎯 Đến giờ học từ vựng rồi! (Vocaburn)"
                    body = f"Bạn còn {due_count} thẻ đang chờ ôn tập hôm nay. Hãy hoàn thành ngay để duy trì chuỗi học nhé!"
                    
                    # 1. Send Telegram if linked
                    if config.get("telegram_chat_id"):
                        await TelegramService.send_message(
                            db,
                            config["telegram_chat_id"],
                            f"<b>{title}</b>\n{body}\n\n<a href='https://vocaburn.click/dashboard'>👉 Bắt đầu học ngay</a>",
                            message_type="study_reminder"
                        )
                        
                    # 2. Send Web Push
                    push_res = await db.execute(select(PushSubscription).where(PushSubscription.user_id == user_id))
                    subs = push_res.scalars().all()
                    for sub in subs:
                        await PushService.send_push(db, sub, title, body, "/dashboard")
                        
            except Exception as e:
                logger.error(f"[SCHEDULER] Error processing reminder for user {config.get('local_user_id')}: {e}")

async def check_advanced_reminders_for_minute(current_time_str: str, now: datetime):
    from app.modules.notification.services.telegram_service import TelegramService
    
    async with SessionLocal() as db:
        # Get active configs
        configs = await _get_active_configs(db)
        
        # 1. Streak Guard: runs at 22:00
        if current_time_str == "22:00":
            active_configs = [c for c in configs if c.get("streak_guard_enabled") is True and c.get("is_active") is True]
            for config in active_configs:
                if not config.get("telegram_chat_id"): continue
                try:
                    review_data = await DeckService.get_today_review(db, config["local_user_id"])
                    if review_data.get("streak_at_risk", False) or review_data.get("due_cards_count", 0) > 0:
                        title = "🚨 BÁO ĐỘNG ĐỎ: NGUY CƠ MẤT STREAK! 🚨"
                        body = "Chỉ còn 2 tiếng nữa là hết ngày! Bạn chưa hoàn thành mục tiêu học. Vào cứu lấy chuỗi học ngay nào!"
                        await TelegramService.send_message(db, config["telegram_chat_id"], f"<b>{title}</b>\n{body}\n\n<a href='https://vocaburn.click/dashboard'>👉 Cứu Streak Ngay</a>", message_type="streak_guard")
                except Exception as e:
                    logger.error(f"[SCHEDULER] Error processing streak guard for user {config.get('local_user_id')}: {e}")

        # 2. Weekly Summary: runs at 09:00 on Sunday (weekday == 6)
        if current_time_str == "09:00" and now.weekday() == 6:
            active_configs = [c for c in configs if c.get("weekly_summary_enabled") is True and c.get("is_active") is True]
            for config in active_configs:
                if not config.get("telegram_chat_id"): continue
                try:
                    title = "📊 BÁO CÁO TIẾN ĐỘ TUẦN (VOCABURN)"
                    body = "Chúc mừng bạn đã hoàn thành một tuần học tập chăm chỉ! Hãy tiếp tục duy trì ngọn lửa đam mê trong tuần mới nhé!"
                    await TelegramService.send_message(db, config["telegram_chat_id"], f"<b>{title}</b>\n{body}\n\n<a href='https://vocaburn.click/dashboard'>👉 Xem thống kê chi tiết</a>", message_type="weekly_summary")
                except Exception as e:
                    logger.error(f"[SCHEDULER] Error processing weekly summary for user {config.get('local_user_id')}: {e}")
                    
        # 3. Inactivity Alert: runs at 10:00
        if current_time_str == "10:00":
            # Reserved for future inactivity alert checks
            pass

async def scheduler_loop():
    logger.info("[SCHEDULER] Reminder scheduler loop started. Checking every minute.")
    while True:
        try:
            now = datetime.now()
            current_time_str = now.strftime("%H:%M")
            await check_and_send_reminders_for_minute(current_time_str)
            await check_advanced_reminders_for_minute(current_time_str, now)
            
            # Sleep until the start of the next minute
            seconds_to_next_minute = 60 - now.second
            await asyncio.sleep(seconds_to_next_minute)
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
