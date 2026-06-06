from datetime import datetime, timezone
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ThreadStatus(StrEnum):
    TRACKING = "tracking"
    DRAFT_READY = "draft_ready"
    REPLIED = "replied"
    DISMISSED = "dismissed"


class IntentTag(StrEnum):
    JOB_APPLICATION = "job_application"
    SALES = "sales"
    NETWORKING = "networking"
    INTERNSHIP = "internship"
    OTHER = "other"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class EmailThread(Base):
    __tablename__ = "email_threads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    recipient_email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    recipient_name: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(998), nullable=False)
    original_body: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[ThreadStatus] = mapped_column(
        Enum(ThreadStatus, native_enum=False, length=32, values_callable=lambda enum: [item.value for item in enum]),
        nullable=False,
        default=ThreadStatus.TRACKING,
        index=True,
    )
    intent_tag: Mapped[IntentTag] = mapped_column(
        Enum(IntentTag, native_enum=False, length=32, values_callable=lambda enum: [item.value for item in enum]),
        nullable=False,
        default=IntentTag.OTHER,
    )
    urgency_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    drafts = relationship("AIDraft", back_populates="thread", cascade="all, delete-orphan")
