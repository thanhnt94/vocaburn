from google import genai
from app.core.config import settings
import httpx
import logging

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self, api_key: str = None, model_id: str = 'gemini-2.0-flash', use_sso: bool = False, sso_server_url: str = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_id = model_id
        self.use_sso = use_sso
        self.sso_server_url = sso_server_url
        if self.use_sso:
            self.client = "SSO_ACTIVE"
        elif self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    @classmethod
    async def from_db(cls, db):
        # Check if Central SSO is enabled and active
        from app.modules.sso_module.service import SSOService
        use_sso = False
        sso_server_url = None
        try:
            sso_config = await SSOService.get_config(db)
            if sso_config.is_enabled and sso_config.server_url:
                use_sso = True
                sso_server_url = sso_config.server_url.rstrip('/')
        except Exception as sso_err:
            logger.warning(f"[SSO CONFIG CHECK WARNING] failed to check SSO status: {sso_err}")

        from app.modules.admin.interface import AdminInterface
        config = await AdminInterface.get_ai_config(db)
        return cls(
            api_key=config.get("api_key"), 
            model_id=config.get("model_id", "gemini-2.0-flash"),
            use_sso=use_sso,
            sso_server_url=sso_server_url
        )

    async def generate_text(self, prompt: str) -> str:
        # Route via CentralAuth if SSO is active
        if self.use_sso and self.sso_server_url:
            try:
                logger.info(f"[AI CENTRAL] SSO is enabled. Routing generation request to {self.sso_server_url} using system active credentials.")
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.sso_server_url}/api/chat/generate-direct",
                        json={"prompt": prompt},
                        timeout=30.0
                    )
                    if response.status_code == 200:
                        data = response.json()
                        logger.info(f"[AI CENTRAL] Response generated successfully using CentralAuth (Provider: {data.get('provider')}, Model: {data.get('model')})")
                        return data.get("text", "")
                    else:
                        logger.error(f"[AI CENTRAL ERROR] Request to CentralAuth failed with status {response.status_code}: {response.text}")
            except Exception as e:
                logger.warning(f"[AI CENTRAL WARNING] Failed to connect to CentralAuth for direct generation, falling back to local: {e}")

        # Fallback to local genai client
        if not self.api_key:
            return "AI Service not configured locally and CentralAuth SSO is not active."
            
        try:
            # Re-initialize local client if fallback triggered
            if not isinstance(self.client, genai.Client):
                self.client = genai.Client(api_key=self.api_key)
            response = await self.client.aio.models.generate_content(
                model=self.model_id,
                contents=prompt
            )
            return response.text
        except Exception as e:
            return f"Error generating content locally: {str(e)}"
