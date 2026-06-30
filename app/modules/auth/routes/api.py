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
            
    from app.modules.sso_module.cookie_signer import sign_cookie
    from app.core.config import settings
    signed_id = sign_cookie(str(user.id), settings.SECRET_KEY)
    response.set_cookie(key="user_id", value=signed_id, httponly=True, path="/", samesite="lax", max_age=1800)
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
    local_only = request.query_params.get("local_only") == "1"
    
    if sso_config.is_enabled and not local_only:
        # Logout from both systems, then land on CentralAuth portal
        ca_logout_url = f"{sso_config.server_url.rstrip('/')}/api/auth/logout"
        response = RedirectResponse(url=ca_logout_url, status_code=303)
    else:
        response = RedirectResponse(url="/", status_code=303)
    
    response.delete_cookie("user_id", path="/")
    return response

@router.post("/auth/change-password")
async def change_password(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    sso_config = await SSOService.get_config(db)
    if sso_config.is_enabled:
        return {"status": "error", "message": "SSO is active. Change password via SSO portal."}
        
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    
    if not current_password or not new_password:
        return {"status": "error", "message": "Missing passwords"}
        
    authenticated_user = await AuthService.authenticate_user(db, user.username, current_password)
    if not authenticated_user:
        return {"status": "error", "message": "Incorrect current password"}
        
    authenticated_user.hashed_password = AuthService.get_password_hash(new_password)
    await db.commit()
    
    return {"status": "success", "message": "Password updated successfully!"}
