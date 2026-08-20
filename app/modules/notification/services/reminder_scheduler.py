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
                    sso_ids = [str(rc.get("user_id")) for rc in remote_configs if rc.get("user_id")]
                    resolved = []
                    if sso_ids:
                        user_res = await db.execute(select(User).where(User.sso_id.in_(sso_ids)))
                        user_map = {u.sso_id: u.id for u in user_res.scalars().all()}
                        for rc in remote_configs:
                            sso_id = str(rc.get("user_id"))
                            if sso_id in user_map:
                                rc["local_user_id"] = user_map[sso_id]
                                resolved.append(rc)
                    return resolved
                logger.warning(f"[Scheduler] CentralAuth config fetch returned status {response.status_code}, fallback to local configs.")
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

async def _build_user_roadmap_reminder_message(db, user_id: int):
    try:
        from app.modules.deck.routes.roadmap import get_roadmap_decks
        roadmap_data = await get_roadmap_decks(user_id=user_id, db=db)
        decks = roadmap_data.get("decks", [])
    except Exception as e:
        logger.error(f"[SCHEDULER] Error fetching roadmap decks for user {user_id}: {e}")
        decks = []

    if not decks:
        # Fallback to general review if no active roadmap
        review_data = await DeckService.get_today_review(db, user_id)
        due_count = review_data.get("due_cards_count", 0)
        streak = review_data.get("streak", 0)
        if due_count <= 0:
            return None, None, None
        title = "🎯 Đến giờ học từ vựng rồi! (Vocaburn)"
        body = f"<b>🎯 Đến giờ học từ vựng rồi! (Vocaburn)</b>\n\n🔥 <b>Streak hiện tại:</b> {streak} ngày\n📚 <b>Thẻ cần ôn tập:</b> {due_count} thẻ\n\n👉 <a href='https://vocaburn.click/dashboard'>Bắt đầu học ngay</a>"
        return title, body, "https://vocaburn.click/dashboard"

    lines = ["<b>🎯 NỔI BẬT LỘ TRÌNH HỌC HÔM NAY (VOCABURN)</b>\n"]
    all_completed = True
    first_action_url = "https://vocaburn.click/dashboard"

    for deck in decks:
        title = deck.get("title", "Bộ thẻ")
        status = deck.get("status", {})
        is_all_done = status.get("all_done", False)
        user_streak = status.get("user_streak", 0)
        next_url = status.get("next_action_url", "/dashboard")
        next_label = status.get("next_action_label", "Học tiếp")

        full_next_url = f"https://vocaburn.click{next_url}" if next_url.startswith("/") else next_url
        if first_action_url == "https://vocaburn.click/dashboard" and next_url != "/dashboard":
            first_action_url = full_next_url

        pipeline = status.get("pipeline", [])
        lines.append(f"📌 <b>Bộ thẻ: {title}</b>")
        lines.append(f"🔥 <b>Streak:</b> {user_streak} ngày")

        if is_all_done:
            lines.append("✅ <b>Hôm nay:</b> Đã hoàn thành xuất sắc tất cả nhiệm vụ!")
        else:
            all_completed = False
            lines.append(f"🎯 <b>Nhiệm vụ tiếp theo:</b> {next_label}")

            for step in pipeline:
                label = step.get("label", "")
                done = step.get("done", False)
                prog = step.get("progress", {})
                stype = step.get("type", "")

                status_icon = "✅" if done else "⏳"
                if stype == "new_cards":
                    learned = prog.get("new_learned_today", 0)
                    target = step.get("daily_count", 10)
                    lines.append(f"   {status_icon} {label}: {learned}/{target} thẻ")
                elif stype in ["mcq", "typing"]:
                    answered = prog.get("answered_today", 0)
                    target = step.get("question_count", 15)
                    lines.append(f"   {status_icon} {label}: {answered}/{target} câu")
                elif stype == "fsrs_review":
                    due = prog.get("due_count", 0)
                    lines.append(f"   {status_icon} {label}: Còn {due} thẻ cần ôn")

            lines.append(f"👉 <a href='{full_next_url}'>Bấm vào đây để làm ngay</a>")
        lines.append("")

    header_title = "🎉 Đã hoàn thành lộ trình hôm nay!" if all_completed else "🎯 Nhắc nhở học lộ trình từ vựng hôm nay"
    final_body = "\n".join(lines).strip()
    return header_title, final_body, first_action_url

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
                title, body, action_url = await _build_user_roadmap_reminder_message(db, user_id)

                if body:
                    # 1. Send Telegram if linked
                    if config.get("telegram_chat_id"):
                        await TelegramService.send_message(
                            db,
                            config["telegram_chat_id"],
                            body,
                            message_type="study_reminder"
                        )

                    # 2. Send Web Push
                    push_res = await db.execute(select(PushSubscription).where(PushSubscription.user_id == user_id))
                    subs = push_res.scalars().all()
                    for sub in subs:
                        await PushService.send_push(db, sub, title or "🎯 Lộ trình Vocaburn", body.replace("<b>", "").replace("</b>", "").replace("👉 ", ""), action_url or "/dashboard")

            except Exception as e:
                logger.error(f"[SCHEDULER] Error processing reminder for user {config.get('local_user_id')}: {e}")

async def check_advanced_reminders_for_minute(current_time_str: str, now: datetime):
    from app.modules.notification.services.telegram_service import TelegramService

    async with SessionLocal() as db:
        configs = await _get_active_configs(db)

        # 1. Streak Guard: runs at 22:00
        if current_time_str == "22:00":
            active_configs = [c for c in configs if c.get("streak_guard_enabled") is True and c.get("is_active") is True]
            for config in active_configs:
                if not config.get("telegram_chat_id"): continue
                try:
                    user_id = config["local_user_id"]
                    title, body, action_url = await _build_user_roadmap_reminder_message(db, user_id)
                    
                    if body and ("Bấm vào đây để làm ngay" in body or "Cần ôn" in body or "Chưa xong" in body):
                        guard_title = "🚨 BÁO ĐỘNG ĐỎ: NGUY CƠ MẤT STREAK! 🚨"
                        guard_msg = f"<b>{guard_title}</b>\n\nChỉ còn 2 tiếng nữa là kết thúc ngày! Bạn vẫn chưa hoàn thành lộ trình:\n\n{body}"
                        await TelegramService.send_message(db, config["telegram_chat_id"], guard_msg, message_type="streak_guard")
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
