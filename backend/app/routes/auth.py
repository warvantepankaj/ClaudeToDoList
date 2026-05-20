from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import create_access_token
from app.db.mongo import get_db
from app.schemas.user import TokenResponse, UserLogin, UserRegister
from app.services.user_service import authenticate_user, register_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserRegister,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> TokenResponse:
    user, user_id = await register_user(db, payload)
    token = create_access_token(subject=user_id)
    return TokenResponse(access_token=token, user=user)


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> TokenResponse:
    user, user_id = await authenticate_user(db, payload)
    token = create_access_token(subject=user_id)
    return TokenResponse(access_token=token, user=user)
