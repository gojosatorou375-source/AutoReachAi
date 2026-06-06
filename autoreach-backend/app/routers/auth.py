import hashlib
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.models.user import User
from app.schemas.user import UserSignUp, UserLogin, UserRead


router = APIRouter(prefix="/api/auth", tags=["auth"])


def hash_password(password: str) -> str:
    salt = "autoreach_salt_12983"
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(
    payload: UserSignUp,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    email_clean = payload.email.strip().lower()
    user = await session.get(User, email_clean)
    if user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    db_user = User(
        email=email_clean,
        password_hash=hash_password(payload.password),
        gmail_password=payload.gmail_password.strip() if payload.gmail_password else None,
    )
    session.add(db_user)
    await session.commit()
    return {"status": "success", "message": "User account created successfully."}


@router.post("/login", response_model=UserRead, status_code=status.HTTP_200_OK)
async def login(
    payload: UserLogin,
    session: AsyncSession = Depends(get_db_session),
) -> UserRead:
    email_clean = payload.email.strip().lower()
    user = await session.get(User, email_clean)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
        )

    return UserRead(
        email=user.email,
        has_gmail_password=bool(user.gmail_password),
        created_at=user.created_at,
    )


@router.post("/update-gmail", status_code=status.HTTP_200_OK)
async def update_gmail_password(
    email: str,
    gmail_password: str,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    email_clean = email.strip().lower()
    user = await session.get(User, email_clean)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )

    user.gmail_password = gmail_password.strip()
    await session.commit()
    return {"status": "success", "message": "Google App Password updated successfully."}
