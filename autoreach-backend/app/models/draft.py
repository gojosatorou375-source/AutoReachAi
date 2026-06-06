from datetime import datetime, timezone
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DraftStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    SENT = "sent"
    DISMISSED = "dismissed"
    REGENERATED = "regenerated"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AIDraft(Base):
    __tablename__ = "ai_drafts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    thread_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("email_threads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    draft_subject: Mapped[str] = mapped_column(String(998), nullable=False)
    draft_body: Mapped[str] = mapped_column(Text, nullable=False)
    tone: Mapped[str] = mapped_column(String(100), nullable=False)
    tokens_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[DraftStatus] = mapped_column(
        Enum(DraftStatus, native_enum=False, length=32, values_callable=lambda enum: [item.value for item in enum]),
        nullable=False,
        default=DraftStatus.PENDING,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    thread = relationship("EmailThread", back_populates="drafts")
