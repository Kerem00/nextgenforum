import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

USERS_DB_URL = "postgresql+asyncpg://user:password@localhost:5432/users_db"
POSTS_DB_URL = "postgresql+asyncpg://user:password@localhost:5433/posts_db"

async def add_column(db_url):
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;"))
            print(f"Successfully added created_at to {db_url}")
        except Exception as e:
            print(f"Error on {db_url}: {e}")
    await engine.dispose()

async def main():
    print("Migrating users_db...")
    await add_column(USERS_DB_URL)
    print("Migrating posts_db...")
    await add_column(POSTS_DB_URL)
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
