import os
import uuid
import logging
import httpx
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.config import settings
from app.modules.auth.services.auth_service import AuthService
from app.modules.auth.services.sso_service import SSOService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/media", tags=["Media Management"])

ALLOWED_IMAGE_EXTS = {"png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"}
ALLOWED_AUDIO_EXTS = {"mp3", "wav", "m4a", "ogg", "aac", "webm", "flac"}
ALLOWED_EXTS = ALLOWED_IMAGE_EXTS | ALLOWED_AUDIO_EXTS


@router.post("/upload")
async def upload_media_file(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Direct media upload from Vocaburn web interface.
    Authenticated via Vocaburn session, forwards file to CentralAuth Vault,
    and returns public CentralAuth URL.
    """
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để tải lên tệp.")

    filename_raw = file.filename or "uploaded_file"
    ext = filename_raw.split(".")[-1].lower() if "." in filename_raw else "jpg"
    if ext not in ALLOWED_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng tệp .{ext} không được hỗ trợ. Chỉ hỗ trợ ảnh hoặc audio."
        )

    # Read content into memory (max 25MB)
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Tệp quá lớn. Giới hạn tối đa là 25MB.")

    sso_config = await SSOService.get_config(db)
    queue_token = getattr(settings, "QUEUE_API_SECRET", "super-secret-token-123")
    central_server_url = (sso_config.server_url if sso_config and sso_config.server_url else "https://auth.inmind.site").rstrip("/")

    # 1. Forward directly to CentralAuth Media Vault
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            upload_url = f"{central_server_url}/api/queue/media/upload"
            files = {
                "file": (file.filename, content, file.content_type or "application/octet-stream")
            }
            data = {
                "source_info": f"Vocaburn: {user.username} (ID #{user.id})"
            }
            headers = {
                "X-Queue-Token": queue_token
            }
            response = await client.post(upload_url, files=files, data=data, headers=headers)
            
            if response.status_code == 200:
                res_data = response.json()
                full_url = res_data.get("full_url")
                if not full_url:
                    rel_url = res_data.get("url", "")
                    full_url = f"{central_server_url}{rel_url}" if rel_url.startswith("/") else rel_url

                return {
                    "status": "success",
                    "url": full_url,
                    "relative_url": res_data.get("url"),
                    "filename": res_data.get("filename"),
                    "mime_type": res_data.get("mime_type"),
                    "size_bytes": res_data.get("size_bytes"),
                    "media_type": res_data.get("media_type", "image" if ext in ALLOWED_IMAGE_EXTS else "audio")
                }
            else:
                logger.warning(f"CentralAuth upload returned status {response.status_code}: {response.text}")
    except Exception as e:
        logger.error(f"Error forwarding media to CentralAuth: {e}", exc_info=True)

    # 2. Fallback: Save locally on Vocaburn if CentralAuth is unreachable
    try:
        unique_name = f"{uuid.uuid4().hex}.{ext}"
        local_dir = os.path.join(settings.BASE_DIR, "static", "uploads", "media")
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(local_dir, unique_name)
        with open(local_path, "wb") as f:
            f.write(content)

        return {
            "status": "success",
            "url": f"/static/uploads/media/{unique_name}",
            "relative_url": f"/static/uploads/media/{unique_name}",
            "filename": unique_name,
            "mime_type": file.content_type,
            "size_bytes": len(content),
            "media_type": "image" if ext in ALLOWED_IMAGE_EXTS else "audio",
            "is_fallback": True
        }
    except Exception as err:
        logger.error(f"Failed local media fallback: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail="Không thể lưu tệp lên máy chủ.")
