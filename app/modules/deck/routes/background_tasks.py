async def check_badges_async(user_id: int, time_spent: int, is_correct: bool, goal_streak: int = 0):
    from app.core.db import SessionLocal
    from app.modules.deck.models import UserAnswer, DeckAttempt, UserDailyProgress, UserDeckGoal, UserCardMastery
    from app.modules.gamification.models import UserGamification, Badge, UserBadge
    from app.modules.gamification.interface import GamificationInterface
    from app.modules.notification.interface import NotificationInterface
    from sqlalchemy import select, func, case, and_
    
    async with SessionLocal() as db:
        user_gamify_res = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
        user_gamify = user_gamify_res.scalar_one_or_none()
        if not user_gamify:
            user_gamify = UserGamification(user_id=user_id, xp=0, level=1, badges=[])
            db.add(user_gamify)
            await db.flush()

        ub_res = await db.execute(select(UserBadge.badge_id).where(UserBadge.user_id == user_id))
        already_earned = set(r[0] for r in ub_res.all()).union(set(user_gamify.badges or []))
        badges_res = await db.execute(select(Badge))
        all_badges = badges_res.scalars().all()

        for badge in all_badges:
            if badge.id in already_earned:
                continue
            
            should_unlock = False
            if badge.id == "first_steps":
                ans_count_res = await db.execute(
                    select(func.count(UserAnswer.id)).join(DeckAttempt).where(DeckAttempt.user_id == user_id)
                )
                if (ans_count_res.scalar() or 0) >= 1:
                    should_unlock = True
                    
            elif badge.id == "streak_starter":
                if user_gamify.streak_count >= 3 or goal_streak >= 3:
                    should_unlock = True
                    
            elif badge.id == "streak_legend":
                if user_gamify.streak_count >= 7 or goal_streak >= 7:
                    should_unlock = True
                    
            elif badge.id == "perfect_score":
                perf_attempt_res = await db.execute(
                    select(DeckAttempt.id)
                    .join(UserAnswer)
                    .where(DeckAttempt.user_id == user_id)
                    .group_by(DeckAttempt.id)
                    .having(
                        and_(
                            func.count(UserAnswer.id) >= 5,
                            func.sum(case((UserAnswer.is_correct == True, 1), else_=0)) == func.count(UserAnswer.id)
                        )
                    )
                )
                if perf_attempt_res.first():
                    should_unlock = True
                    
            elif badge.id == "speed_demon":
                if time_spent > 0 and time_spent <= 5 and is_correct:
                    fast_correct_res = await db.execute(
                        select(func.count(UserAnswer.id))
                        .join(DeckAttempt)
                        .where(
                            DeckAttempt.user_id == user_id,
                            UserAnswer.is_correct == True,
                            UserAnswer.active_time <= 5.0,
                            UserAnswer.active_time > 0.0
                        )
                    )
                    if (fast_correct_res.scalar() or 0) >= 5:
                        should_unlock = True
                        
            elif badge.id == "goal_crusher":
                goal_completed_res = await db.execute(
                    select(func.count(UserDailyProgress.id)).where(
                        UserDailyProgress.goal_id.in_(
                            select(UserDeckGoal.id).where(UserDeckGoal.user_id == user_id)
                        ),
                        UserDailyProgress.is_target_met == True
                    )
                )
                if (goal_completed_res.scalar() or 0) >= 3:
                    should_unlock = True
                    
            elif badge.id == "card_master":
                mastered_cards_res = await db.execute(
                    select(func.count(UserCardMastery.id)).where(
                        UserCardMastery.user_id == user_id,
                        UserCardMastery.box_level == 5
                    )
                )
                if (mastered_cards_res.scalar() or 0) >= 10:
                    should_unlock = True
            
            if should_unlock:
                db.add(UserBadge(user_id=user_id, badge_id=badge.id))
                new_badges = list(user_gamify.badges or [])
                if badge.id not in new_badges:
                    new_badges.append(badge.id)
                user_gamify.badges = new_badges
                
                xp_reward = 150
                if badge.id == "first_steps": xp_reward = 100
                elif badge.id == "streak_starter": xp_reward = 250
                elif badge.id == "streak_legend": xp_reward = 500
                elif badge.id == "perfect_score": xp_reward = 300
                elif badge.id == "speed_demon": xp_reward = 200
                elif badge.id == "goal_crusher": xp_reward = 400
                elif badge.id == "card_master": xp_reward = 500
                
                await GamificationInterface.add_xp(db, user_id, xp_reward, source="badge_unlock")
                
                await NotificationInterface.send(
                    db, user_id,
                    f"🎉 ACHIEVEMENT UNLOCKED: {badge.name}!",
                    f"You unlocked the badge '{badge.name}' and earned +{xp_reward} XP! {badge.description}",
                    "achievement"
                )
        await db.commit()
