import asyncio
from sqlalchemy import text
from users_service.database import engine

async def migrate():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE"))
        print("Column is_banned added successfully.")

asyncio.run(migrate())
