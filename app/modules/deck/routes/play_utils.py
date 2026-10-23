from sqlalchemy.ext.asyncio import AsyncSession
from .media_resolver import get_sso_server_url, resolve_card_dict, resolve_central_url

async def resolve_play_cards(cards_list, db: AsyncSession):
    sso_url = await get_sso_server_url(db)
    for c in cards_list:
        resolve_card_dict(c, sso_url)
        for key in ["image", "audio"]:
            if key in c and c[key]:
                c[key] = resolve_central_url(c[key], sso_url)
        if "others" in c and isinstance(c["others"], dict):
            for key in ["front_audio_url", "back_audio_url", "front_img", "back_img"]:
                if key in c["others"] and c["others"][key]:
                    c["others"][key] = resolve_central_url(c["others"][key], sso_url)
    return cards_list
