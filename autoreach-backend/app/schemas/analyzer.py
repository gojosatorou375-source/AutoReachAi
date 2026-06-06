from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PDFAnalysisRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    filename: str
    vendor: str | None = None
    amount: str | None = None
    due_date: str | None = None
    invoice_number: str | None = None
    summary: str | None = None
    raw_text: str
    chat_history: list
    created_at: datetime


class PDFAnalysisList(BaseModel):
    analyses: list[PDFAnalysisRead]
    total: int


class PDFChatRequest(BaseModel):
    message: str = Field(..., min_length=1)


class PDFChatResponse(BaseModel):
    reply: str
    chat_history: list
