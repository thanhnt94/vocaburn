from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.core.db import get_db
from app.modules.notification.services.push_service import PushService

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

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    try:
        pub_key = PushService.get_public_key()
        return {"public_key": pub_key}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load VAPID key: {str(e)}")

@router.post("/push/subscribe")
async def subscribe_push(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.notification.models import PushSubscription
    user_id = int(request.cookies.get("user_id", 1))
    
    endpoint = data.get("endpoint")
    keys = data.get("keys", {})
    p256dh = keys.get("p256dh")
    auth = keys.get("auth")
    
    if not endpoint or not p256dh or not auth:
        raise HTTPException(status_code=400, detail="Invalid subscription data")
        
    # Check if subscription already exists
    res = await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == endpoint)
    )
    sub = res.scalar_one_or_none()
    
    if sub:
        sub.user_id = user_id
        sub.p256dh = p256dh
        sub.auth = auth
    else:
        sub = PushSubscription(
            user_id=user_id,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth
        )
        db.add(sub)
        
    await db.commit()
    return {"status": "success", "message": "Subscribed to push notifications"}

@router.post("/push/unsubscribe")
async def unsubscribe_push(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    from app.modules.notification.models import PushSubscription
    user_id = int(request.cookies.get("user_id", 1))
    endpoint = data.get("endpoint")
    
    if endpoint:
        stmt = delete(PushSubscription).where(
            PushSubscription.user_id == user_id,
            PushSubscription.endpoint == endpoint
        )
    else:
        stmt = delete(PushSubscription).where(PushSubscription.user_id == user_id)
        
    await db.execute(stmt)
    await db.commit()
    return {"status": "success", "message": "Unsubscribed from push notifications"}

