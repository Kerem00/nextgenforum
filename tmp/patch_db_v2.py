import asyncio
import asyncpg

async def update_databases():
    # posts_db
    try:
        conn = await asyncpg.connect(user="user", password="password", database="posts_db", host="localhost", port=5433)
        print("Connected to posts_db")
        
        await conn.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status') THEN
                CREATE TYPE content_status AS ENUM ('active', 'banned', 'removed');
            END IF;
        END
        $$;
        """)

        await conn.execute("ALTER TABLE posts ADD COLUMN IF NOT EXISTS status content_status DEFAULT 'active' NOT NULL;")
        await conn.execute("ALTER TABLE comments ADD COLUMN IF NOT EXISTS status content_status DEFAULT 'active' NOT NULL;")

        await conn.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id SERIAL PRIMARY KEY,
            entity_type VARCHAR NOT NULL,
            entity_id INTEGER NOT NULL,
            reason VARCHAR NOT NULL,
            context VARCHAR,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
            status VARCHAR DEFAULT 'pending' NOT NULL
        );
        """)

        await conn.execute("""
        CREATE TABLE IF NOT EXISTS admin_logs (
            id SERIAL PRIMARY KEY,
            action_type VARCHAR NOT NULL,
            entity_type VARCHAR,
            entity_id INTEGER,
            moderator_id INTEGER,
            category VARCHAR NOT NULL,
            details VARCHAR,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
        """)
        
        print("Updated posts_db log and status schema")
        await conn.close()
    except Exception as e:
        print("Error updating posts_db:", e)

asyncio.run(update_databases())
