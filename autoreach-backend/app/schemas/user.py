from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserSignUp(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=4, max_length=100)
    gmail_password: str | None = Field(default=None, max_length=255)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email: EmailStr
    has_gmail_password: bool
    created_at: datetime
