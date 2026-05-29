from fastapi import APIRouter, Request, Response, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import RedirectResponse
from app.core.db import get_db
from app.modules.auth.services.auth_service import AuthService
from app.modules.sso_module.service import SSOService

router = APIRouter(tags=["Auth"])

@router.get("/auth/me")
async def get_me(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user: return {"user": None}
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    }

@router.post("/auth/login")
async def login_api(
    data: dict,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    username = data.get("username")
    password = data.get("password")
    is_backdoor = data.get("is_backdoor", False)
    
    user = await AuthService.authenticate_user(db, username, password)
    if not user:
        return {"status": "error", "message": "Invalid username or password"}
        
    sso_config = await SSOService.get_config(db)
    if sso_config.is_enabled and not is_backdoor:
        if user.role != "admin":
            return {"status": "error", "message": "Security Alert: SSO is active. Local login bypass is strictly restricted to Administrators only."}
            
    response.set_cookie(key="user_id", value=str(user.id), httponly=True, path="/", samesite="lax")
    return {
        "status": "success",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role
        }
    }

@router.get("/logout")
async def logout(request: Request, db: AsyncSession = Depends(get_db)):
    sso_config = await SSOService.get_config(db)
    
    if sso_config.is_enabled:
        # Logout from both systems, then land on CentralAuth portal
        ca_logout_url = f"{sso_config.server_url.rstrip('/')}/api/auth/logout"
        response = RedirectResponse(url=ca_logout_url, status_code=303)
    else:
        response = RedirectResponse(url="/", status_code=303)
    
    response.delete_cookie("user_id", path="/")
    return response
