from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.draft import DraftStatus


class AIDraftRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    thread_id: str
    draft_subject: str
    draft_body: str
    tone: str
    tokens_used: int
    status: DraftStatus
    created_at: datetime


class AIDraftList(BaseModel):
    drafts: list[AIDraftRead]
    total: int


class RegenerateDraftRequest(BaseModel):
    tone: str = Field(..., min_length=1, max_length=100)


class ApproveDraftRequest(BaseModel):
    gmail_password: str | None = None
