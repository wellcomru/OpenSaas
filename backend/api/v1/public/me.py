"""Public /me — для внешних интеграций через API ключ."""
from __future__ import annotations

from fastapi import APIRouter

from modules.api_keys.middleware import ApiKeyUser
from modules.users.schemas import UserMe

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/me")
async def me(user: ApiKeyUser):
    return UserMe.model_validate(user).model_dump(mode="json")
