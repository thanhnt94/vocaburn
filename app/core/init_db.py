from app.modules.quiz.models import Category, Quiz, Question
from app.modules.auth.models import User
from app.modules.gamification.models import UserGamification, Badge
from app.modules.notification.models import Notification
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
                ("last_review", "DATETIME NULL")
            ]
            
            for col_name, col_type in new_columns:
                if col_name not in columns:
                    print(f"[MIGRATE] Adding column {col_name} ({col_type}) to user_card_mastery...")
                    connection.execute(text(f"ALTER TABLE user_card_mastery ADD COLUMN {col_name} {col_type}"))
                    
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_user_card_mastery_due ON user_card_mastery(due)"))
            
        await conn.run_sync(migrate_fsrs_columns)
        
    async with SessionLocal() as db:
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

        # Seed Premium Vocabulary Decks
        result = await db.execute(select(Quiz).where(Quiz.title == "SAT & IELTS Essential Vocabulary"))
        if not result.scalar_one_or_none():
            print("[SEED] Seeding SAT & IELTS Essential Vocabulary deck...")
            # Category
            result_cat = await db.execute(select(Category).where(Category.name == "English"))
            cat_eng = result_cat.scalar_one_or_none()
            if not cat_eng:
                cat_eng = Category(name="English", description="English Vocabulary & Language Arts")
                db.add(cat_eng)
                await db.flush()
                
            quiz = Quiz(
                title="SAT & IELTS Essential Vocabulary",
                description="Master high-frequency advanced academic terms essential for SAT, IELTS, and TOEFL exams. Features 3D flashcards with FSRS spaced repetition.",
                category_id=cat_eng.id,
                creator_id=1,
                is_active=True
            )
            db.add(quiz)
            await db.flush()

            vocab_list = [
                ("Ephemeral", "Lasting for a very short time; transient; fleeting."),
                ("Capricious", "Given to sudden and unaccountable changes of mood or behavior; fickle."),
                ("Obfuscate", "To deliberately make something obscure, unclear, or unintelligible."),
                ("Loquacious", "Tending to talk a great deal; extremely talkative."),
                ("Pragmatic", "Dealing with things sensibly and realistically in a way that is based on practical rather than theoretical considerations."),
                ("Anachronism", "A thing belonging or appropriate to a period other than that in which it exists, especially a thing that is conspicuously old-fashioned."),
                ("Cacophony", "A harsh, discordant mixture of sounds."),
                ("Garrulous", "Excessively talkative, especially on trivial matters."),
                ("Fastidious", "Very attentive to and concerned about accuracy and detail; hard to please."),
                ("Taciturn", "Reserved or uncommunicative in speech; saying little.")
            ]
            for front, back in vocab_list:
                q = Question(
                    quiz_id=quiz.id,
                    content=front,
                    explanation=back,
                    question_type="flashcard"
                )
                db.add(q)
            await db.commit()
            print("[SEED] SAT & IELTS deck seeded successfully!")

        result_idioms = await db.execute(select(Quiz).where(Quiz.title == "Everyday Idioms & Phrasal Verbs"))
        if not result_idioms.scalar_one_or_none():
            print("[SEED] Seeding Everyday Idioms & Phrasal Verbs deck...")
            result_cat = await db.execute(select(Category).where(Category.name == "English"))
            cat_eng = result_cat.scalar_one_or_none()
            if not cat_eng:
                cat_eng = Category(name="English", description="English Vocabulary & Language Arts")
                db.add(cat_eng)
                await db.flush()

            quiz = Quiz(
                title="Everyday Idioms & Phrasal Verbs",
                description="Master essential daily English idioms and phrases that native speakers use all the time to speak naturally.",
                category_id=cat_eng.id,
                creator_id=1,
                is_active=True
            )
            db.add(quiz)
            await db.flush()

            idioms_list = [
                ("Break a leg", "A popular idiom used to wish performers good luck before a show or presentation."),
                ("Bite the bullet", "To face a difficult or unpleasant situation with courage and fortitude; get it over with."),
                ("Spill the beans", "To reveal a secret or disclose confidential information prematurely."),
                ("Under the weather", "Feeling slightly unwell, sick, or exhausted."),
                ("Burn the midnight oil", "To work or study late into the night."),
                ("Piece of cake", "Something that is very easy to do or achieve."),
                ("At the drop of a hat", "Without any hesitation or delay; instantly."),
                ("Once in a blue moon", "Very rarely; almost never."),
                ("Cost an arm and a leg", "Extremely expensive."),
                ("Cry over spilled milk", "To waste time worrying or complaining about past mistakes or events that cannot be changed.")
            ]
            for front, back in idioms_list:
                q = Question(
                    quiz_id=quiz.id,
                    content=front,
                    explanation=back,
                    question_type="flashcard"
                )
                db.add(q)
            await db.commit()
            print("[SEED] Idioms deck seeded successfully!")

        result_tech = await db.execute(select(Quiz).where(Quiz.title == "Developer & Cyberpunk Tech Slang"))
        if not result_tech.scalar_one_or_none():
            print("[SEED] Seeding Developer & Cyberpunk Tech Slang deck...")
            result_cat = await db.execute(select(Category).where(Category.name == "Technology"))
            cat_tech = result_cat.scalar_one_or_none()
            if not cat_tech:
                cat_tech = Category(name="Technology", description="Tech Slang, Design Trends, and Development Terms")
                db.add(cat_tech)
                await db.flush()

            quiz = Quiz(
                title="Developer & Cyberpunk Tech Slang",
                description="Expand your terminology with high-tech lingo, design trends, and software engineering slang.",
                category_id=cat_tech.id,
                creator_id=1,
                is_active=True
            )
            db.add(quiz)
            await db.flush()

            tech_list = [
                ("Glassmorphism", "A UI design trend featuring translucent background blur, thin borders, and subtle shadows mimicking frosted glass."),
                ("Idempotent", "An operation that produces the same result no matter how many times it is executed (e.g., a GET request)."),
                ("Heisenbug", "A software bug that seems to disappear or change its behavior when one attempts to study or debug it."),
                ("Refactoring", "The process of restructuring existing computer code without changing its external behavior to improve readability, maintainability, or performance."),
                ("Spaghetti Code", "Unstructured and difficult-to-maintain computer program source code, typically containing complex control flows."),
                ("FSRS (Free Spaced Repetition Scheduler)", "A state-of-the-art spaced repetition algorithm based on the DSR (Difficulty, Stability, Retrievability) model, used in modern flashcard apps."),
                ("Dogfooding", "The practice of an organization using its own product or service to test and validate its quality and usability before releasing it to customers."),
                ("Technical Debt", "The implied cost of additional rework caused by choosing an easy or quick solution now instead of using a better approach that would take longer."),
                ("Rubber Duck Debugging", "A method of debugging code by explaining it line-by-line to an inanimate object, like a rubber duck, to discover logical flaws.")
            ]
            for front, back in tech_list:
                q = Question(
                    quiz_id=quiz.id,
                    content=front,
                    explanation=back,
                    question_type="flashcard"
                )
                db.add(q)
            await db.commit()
            print("[SEED] Tech deck seeded successfully!")


if __name__ == "__main__":
    asyncio.run(init_db())

