from fastapi import APIRouter, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.post("/read-all")
async def mark_notifications_read(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.notification.models import Notification
    user_id = int(request.cookies.get("user_id", 1))
    await db.execute(
        Notification.__table__.update().where(Notification.user_id == user_id).values(is_read=True)
    )
    await db.commit()
    return {"status": "ok"}
