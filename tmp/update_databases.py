import asyncio
import asyncpg

async def update_databases():
    # users_db
    try:
        conn = await asyncpg.connect(user="user", password="password", database="users_db", host="localhost", port=5432)
        print("Connected to users_db")
        await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user' NOT NULL;")
        await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;")
        print("Updated users_db schema")
        await conn.close()
    except Exception as e:
        print("Error updating users_db:", e)

    # posts_db
    try:
        conn = await asyncpg.connect(user="user", password="password", database="posts_db", host="localhost", port=5433)
        print("Connected to posts_db")
        await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user' NOT NULL;")
        await conn.execute("ALTER TABLE posts ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'unknown' NOT NULL;")
        await conn.execute("ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false NOT NULL;")
        await conn.execute("ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false NOT NULL;")
        await conn.execute("ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false NOT NULL;")
        print("Updated posts_db schema")
        await conn.close()
    except Exception as e:
        print("Error updating posts_db:", e)

asyncio.run(update_databases())
