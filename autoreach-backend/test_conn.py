import asyncio
from app.database import engine
from sqlalchemy import text

async def test_db():
    try:
        async with engine.connect() as conn:
            threads_count = (await conn.execute(text("SELECT COUNT(*) FROM email_threads"))).scalar()
            drafts_count = (await conn.execute(text("SELECT COUNT(*) FROM ai_drafts"))).scalar()
            print(f"Number of email threads: {threads_count}")
            print(f"Number of AI drafts: {drafts_count}")
    except Exception as e:
        print("Failed to count records:", e)

if __name__ == "__main__":
    asyncio.run(test_db())
