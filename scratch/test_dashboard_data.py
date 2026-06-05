import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.stats.routes.api import get_dashboard_data

# Simple mock request object
class MockRequest:
    def __init__(self):
        self.scope = {}
        self.cookies = {}
        self.headers = {}

async def main():
    async with SessionLocal() as db:
        # Fetch a mock user (user_id = 1)
        from sqlalchemy import select
        res_user = await db.execute(select(User).where(User.id == 1))
        user = res_user.scalar_one()
        print("Mocking dashboard data call for user:", user.username)
        
        # Mock AuthService.get_current_user to return this user
        from app.modules.auth.services.auth_service import AuthService
        original_get_user = AuthService.get_current_user
        
        async def mock_get_user(req, database):
            return user
            
        AuthService.get_current_user = mock_get_user
        
        req = MockRequest()
        try:
            res = await get_dashboard_data(req, db)
            print("Result of get_dashboard_data:")
            import json
            res_clean = {k: v for k, v in res.items() if k != "notifications"}
            print(json.dumps(res_clean, ensure_ascii=True, indent=2))
        finally:
            AuthService.get_current_user = original_get_user

if __name__ == '__main__':
    asyncio.run(main())
