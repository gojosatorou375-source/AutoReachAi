from io import BytesIO
import json
from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
import pypdf
from openai import AsyncOpenAI

from app.database import get_db_session
from app.config import get_settings
from app.models.analyzer import PDFAnalysis
from app.schemas.analyzer import PDFAnalysisList, PDFAnalysisRead, PDFChatRequest, PDFChatResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analyzer", tags=["analyzer"])


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    try:
        reader = pypdf.PdfReader(BytesIO(pdf_bytes))
        text = ""
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
        return text.strip()
    except Exception as e:
        logger.error("Failed to parse PDF: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded file is not a valid PDF or could not be read: {str(e)}"
        )


async def parse_pdf_invoice(raw_text: str) -> dict:
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key, timeout=12.0)
    
    system_prompt = """You are an expert financial assistant.
Analyze the following raw text extracted from a PDF invoice or document.
Determine if it is an invoice, bill, or receipt.
Extract the following details as a clean JSON object:
{
  "vendor": string or null (Name of the seller/vendor, e.g. Amazon Web Services, Google Cloud),
  "amount": string or null (Total amount due or paid, e.g. "$1,254.30"),
  "due_date": string or null (Due date of payment, e.g. "June 15, 2026"),
  "invoice_number": string or null (Invoice or bill number),
  "summary": string or null (A concise 1-2 sentence description of what the invoice is for and its main details)
}
If the document is not an invoice (e.g., general document), do your best to extract a vendor name, amount/cost if mentioned, any date mentioned as due_date, and summarize it.
Output strictly JSON only."""

    try:
        response = await client.chat.completions.create(
            model=settings.openai_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Document Text:\n\n{raw_text}"}
            ],
            temperature=0.2,
            max_tokens=400,
        )
        content = response.choices[0].message.content
        parsed = json.loads(content)
        return {
            "vendor": parsed.get("vendor"),
            "amount": parsed.get("amount"),
            "due_date": parsed.get("due_date"),
            "invoice_number": parsed.get("invoice_number"),
            "summary": parsed.get("summary")
        }
    except Exception as e:
        logger.warning("AI parsing failed: %s. Using fallback data.", e)
        return {
            "vendor": "AI Unavailable (Rate Limited)",
            "amount": "N/A",
            "due_date": "N/A",
            "invoice_number": "N/A",
            "summary": "The OpenAI API is currently unavailable or rate limited. Please view the raw extracted text below."
        }


async def get_analysis_or_404(analysis_id: str, session: AsyncSession) -> PDFAnalysis:
    analysis = await session.get(PDFAnalysis, analysis_id)
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF analysis record not found.",
        )
    return analysis


@router.post("/upload", response_model=PDFAnalysisRead, status_code=status.HTTP_201_CREATED)
async def upload_pdf(
    user_id: str = Query(..., min_length=1),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session),
) -> PDFAnalysis:
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported."
        )

    # Read and parse PDF
    pdf_bytes = await file.read()
    raw_text = extract_text_from_pdf(pdf_bytes)
    
    if not raw_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract any readable text from this PDF file."
        )

    # Perform AI extraction
    extracted = await parse_pdf_invoice(raw_text)

    # Save to Database
    analysis = PDFAnalysis(
        user_id=user_id,
        filename=file.filename,
        vendor=extracted["vendor"],
        amount=extracted["amount"],
        due_date=extracted["due_date"],
        invoice_number=extracted["invoice_number"],
        summary=extracted["summary"],
        raw_text=raw_text,
        chat_history=[
            {
                "role": "assistant",
                "content": f"Hi! I've analyzed your document '{file.filename}'. It looks like an invoice from {extracted['vendor'] or 'Unknown'} for {extracted['amount'] or 'N/A'}. Let me know if you have any questions about this document!"
            }
        ]
    )
    session.add(analysis)
    await session.commit()
    await session.refresh(analysis)
    return analysis


@router.get("/history", response_model=PDFAnalysisList)
async def get_history(
    user_id: str = Query(..., min_length=1),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
) -> PDFAnalysisList:
    query = select(PDFAnalysis).where(PDFAnalysis.user_id == user_id)
    count_query = select(func.count()).select_from(PDFAnalysis).where(PDFAnalysis.user_id == user_id)

    result = await session.execute(query.order_by(PDFAnalysis.created_at.desc()).limit(limit).offset(offset))
    total = await session.scalar(count_query)
    return PDFAnalysisList(analyses=list(result.scalars().all()), total=total or 0)


@router.get("/{analysis_id}", response_model=PDFAnalysisRead)
async def get_analysis(
    analysis_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> PDFAnalysis:
    return await get_analysis_or_404(analysis_id, session)


@router.post("/{analysis_id}/chat", response_model=PDFChatResponse)
async def chat_analysis(
    analysis_id: str,
    payload: PDFChatRequest,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    analysis = await get_analysis_or_404(analysis_id, session)
    
    # 1. Update history with user message
    user_msg = {"role": "user", "content": payload.message}
    history = list(analysis.chat_history)
    history.append(user_msg)

    # 2. Call OpenAI with PDF context
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key, timeout=12.0)
    
    system_prompt = f"""You are an expert assistant. You will help the user understand the context of an uploaded PDF document.
Here is the text content of the PDF:
---
{analysis.raw_text}
---
Answer the user's questions accurately based on this document. Keep your answers clear, professional, and concise."""

    messages = [{"role": "system", "content": system_prompt}]
    
    # Append recent chat history (limit to last 10 messages)
    for msg in history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
        
    try:
        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            temperature=0.3,
            max_tokens=400,
        )
        reply = response.choices[0].message.content or "No response from AI."
    except Exception as e:
        logger.error("Chat error: %s", e)
        reply = f"Could not get response from AI: {str(e)}. Please check your API quota or keys."

    # 3. Update database and save
    assistant_msg = {"role": "assistant", "content": reply}
    history.append(assistant_msg)
    
    analysis.chat_history = history
    await session.commit()
    await session.refresh(analysis)
    
    return {"reply": reply, "chat_history": history}
