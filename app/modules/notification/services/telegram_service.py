import os
import httpx
import logging

logger = logging.getLogger(__name__)

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.admin.models import SystemConfig

class TelegramService:
    @staticmethod
    async def get_bot_config(db: AsyncSession):
        res = await db.execute(select(SystemConfig).where(SystemConfig.id == "telegram_config"))
        config = res.scalar_one_or_none()
        if config and config.value:
            return config.value
        return {}

    @staticmethod
    async def send_message(db: AsyncSession, chat_id: str, text: str):
        # Delegate to CentralAuth if SSO is active
        from app.modules.sso_module.service import SSOService
        try:
            sso_config = await SSOService.get_config(db)
            if sso_config.is_enabled and sso_config.server_url:
                import httpx
                from app.core.config import settings
                queue_token = getattr(settings, "QUEUE_API_SECRET", "super-secret-token-123")
                logger.info(f"[TelegramService] Delegating send_message to CentralAuth for chat {chat_id}")
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{sso_config.server_url.rstrip('/')}/api/queue/telegram/send-message",
                        json={"chat_id": chat_id, "text": text},
                        headers={"X-Queue-Token": queue_token},
                        timeout=15.0
                    )
                    if response.status_code == 200:
                        return True
                    logger.error(f"[TelegramService] CentralAuth returned status {response.status_code}: {response.text}")
                    return False
        except Exception as sso_err:
            logger.warning(f"[TelegramService] SSO delegation failed, falling back to local: {sso_err}")

        from app.modules.notification.services.bot_service import bot
        if not bot:
            logger.warning("Telegram Bot is not running. Cannot send message.")
            return False
            
        try:
            await bot.send_message(chat_id=chat_id, text=text, parse_mode="HTML")
            return True
        except Exception as e:
            logger.error(f"Failed to send telegram message to {chat_id}: {e}")
            return False
