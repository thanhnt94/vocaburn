from app.modules.deck.models import Category, FlashcardDeck, Flashcard
from app.modules.auth.models import User, UserGlobalSettings
from app.modules.gamification.models import UserGamification, Badge
from app.modules.notification.models import Notification, PushSubscription
from app.modules.stats.models import UserDailyStats
from app.modules.admin.models import SystemConfig, AdminLog
from app.modules.sso_module.models import SSOConfig
from app.modules.auth.services.auth_service import AuthService
from app.core.db import engine, Base, SessionLocal
from sqlalchemy import select
import asyncio

async def init_db():
    # Ensure tables are created
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Custom SQLite migration for FSRS v6 columns in UserQuestionMastery
        from sqlalchemy import text
        def migrate_fsrs_columns(connection):
            result = connection.execute(text("PRAGMA table_info(user_card_mastery);"))
            columns = {row[1] for row in result.fetchall()}
            
            new_columns = [
                ("stability", "FLOAT NULL"),
                ("difficulty", "FLOAT NULL"),
                ("state", "INTEGER DEFAULT 0"),
                ("step", "INTEGER DEFAULT 0"),
                ("due", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
                ("last_review", "DATETIME NULL"),
                ("is_starred", "BOOLEAN DEFAULT 0")
            ]
            
            for col_name, col_type in new_columns:
                if col_name not in columns:
                    print(f"[MIGRATE] Adding column {col_name} ({col_type}) to user_card_mastery...")
                    connection.execute(text(f"ALTER TABLE user_card_mastery ADD COLUMN {col_name} {col_type}"))
                    
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_user_card_mastery_due ON user_card_mastery(due)"))
            
        def migrate_deck_goals_columns(connection):
            result = connection.execute(text("PRAGMA table_info(user_deck_goals);"))
            columns = {row[1] for row in result.fetchall()}
            
            new_columns = [
                ("daily_time_target", "INTEGER DEFAULT 10"),
                ("daily_card_target", "INTEGER DEFAULT 20"),
                ("last_completed_at", "DATE NULL")
            ]
            
            for col_name, col_type in new_columns:
                if col_name not in columns:
                    print(f"[MIGRATE] Adding column {col_name} ({col_type}) to user_deck_goals...")
                    connection.execute(text(f"ALTER TABLE user_deck_goals ADD COLUMN {col_name} {col_type}"))

        def migrate_daily_stats_columns(connection):
            result = connection.execute(text("PRAGMA table_info(user_daily_stats);"))
            columns = {row[1] for row in result.fetchall()}
            if "is_active" not in columns:
                print("[MIGRATE] Adding column is_active to user_daily_stats...")
                connection.execute(text("ALTER TABLE user_daily_stats ADD COLUMN is_active BOOLEAN DEFAULT 1"))

        def migrate_daily_progress_columns(connection):
            result = connection.execute(text("PRAGMA table_info(user_daily_progress);"))
            columns = {row[1] for row in result.fetchall()}
            if "date_val" not in columns:
                print("[MIGRATE] Adding column date_val to user_daily_progress...")
                connection.execute(text("ALTER TABLE user_daily_progress ADD COLUMN date_val DATE NULL"))

        def create_composite_indexes(connection):
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_user_daily_stats_user_date ON user_daily_stats(user_id, date);"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_user_card_mastery_user_due ON user_card_mastery(user_id, due);"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_user_card_mastery_user_ignored ON user_card_mastery(user_id, is_ignored);"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_xp_transactions_user_created ON xp_transactions(user_id, created_at);"))

        await conn.run_sync(migrate_fsrs_columns)
        await conn.run_sync(migrate_deck_goals_columns)
        await conn.run_sync(migrate_daily_stats_columns)
        await conn.run_sync(migrate_daily_progress_columns)
        await conn.run_sync(create_composite_indexes)
        
    async with SessionLocal() as db:
        # Migrate JSON badges into user_badges table
        from app.modules.gamification.models import UserGamification, UserBadge
        import json
        gam_res = await db.execute(select(UserGamification))
        for user_gam in gam_res.scalars().all():
            if user_gam.badges:
                b_list = user_gam.badges if isinstance(user_gam.badges, list) else json.loads(user_gam.badges)
                for b_id in b_list:
                    ub_check = await db.execute(
                        select(UserBadge).where(UserBadge.user_id == user_gam.user_id, UserBadge.badge_id == str(b_id))
                    )
                    if not ub_check.scalar_one_or_none():
                        db.add(UserBadge(user_id=user_gam.user_id, badge_id=str(b_id)))
        await db.commit()
        # Check if category exists
        result = await db.execute(select(Category))
        if not result.scalar():
            cat = Category(name="General", description="Default category")
            db.add(cat)
            await db.commit()
            print("Default category created.")

        # Check if admin exists
        result = await db.execute(select(User).where(User.username == "admin"))
        admin = result.scalar_one_or_none()
        if not admin:
            admin = User(
                username="admin",
                email="admin@mindstack.click",
                full_name="QuizMind Admin",
                hashed_password=AuthService.get_password_hash("admin"),
                role="admin"
            )
            db.add(admin)
            await db.commit()
            print("Default admin user created (admin / admin).")

        # Seed SSO Config for testing
        result = await db.execute(select(SSOConfig))
        if not result.scalar():
            sso_cfg = SSOConfig(
                is_enabled=True,
                server_url="http://localhost:5000",
                client_id="quizmind-v1",
                client_secret="quizmind_secret_123"
            )
            db.add(sso_cfg)
            await db.commit()
            print("Default SSO configuration seeded.")

        # Seed Default Achievements/Badges
        result = await db.execute(select(Badge))
        if not result.scalar():
            default_badges = [
                Badge(
                    id="first_steps",
                    name="First Steps",
                    description="Solve your first question in any quiz",
                    icon="Zap",
                    criteria_type="xp",
                    criteria_value=1
                ),
                Badge(
                    id="streak_starter",
                    name="Streak Starter",
                    description="Reach a 3-day learning streak",
                    icon="Flame",
                    criteria_type="streak",
                    criteria_value=3
                ),
                Badge(
                    id="streak_legend",
                    name="Streak Legend",
                    description="Reach a 7-day learning streak",
                    icon="Award",
                    criteria_type="streak",
                    criteria_value=7
                ),
                Badge(
                    id="perfect_score",
                    name="Perfect Score",
                    description="Score 100% accuracy on a quiz of at least 5 questions",
                    icon="CheckCircle2",
                    criteria_type="accuracy",
                    criteria_value=100
                ),
                Badge(
                    id="speed_demon",
                    name="Speed Demon",
                    description="Answer 5 questions under 5 seconds each",
                    icon="Activity",
                    criteria_type="speed",
                    criteria_value=5
                ),
                Badge(
                    id="goal_crusher",
                    name="Goal Crusher",
                    description="Reach your daily goal 3 times",
                    icon="Target",
                    criteria_type="goals",
                    criteria_value=3
                ),
                Badge(
                    id="card_master",
                    name="Card Master",
                    description="Elevate 10 cards to 'Mastered' level",
                    icon="Trophy",
                    criteria_type="mastery",
                    criteria_value=10
                )
            ]
            db.add_all(default_badges)
            await db.commit()
            print("Default achievements seeded.")


if __name__ == "__main__":
    asyncio.run(init_db())


