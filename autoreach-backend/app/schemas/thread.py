from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.thread import IntentTag, ThreadStatus


class EmailThreadCreate(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=255)
    recipient_email: EmailStr
    recipient_name: str = Field(..., min_length=1, max_length=255)
    subject: str = Field(..., min_length=1, max_length=998)
    original_body: str = Field(..., min_length=1)
    sent_at: datetime
    intent_tag: IntentTag = IntentTag.OTHER
    urgency_score: int = Field(default=0, ge=0, le=100)


class EmailThreadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    recipient_email: EmailStr
    recipient_name: str
    subject: str
    original_body: str
    sent_at: datetime
    last_checked_at: datetime | None
    status: ThreadStatus
    intent_tag: IntentTag
    urgency_score: int
    created_at: datetime


class EmailThreadList(BaseModel):
    threads: list[EmailThreadRead]
    total: int


class GmailSyncRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=255)
    gmail_password: str | None = Field(default=None)
