DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status') THEN
        CREATE TYPE content_status AS ENUM ('active', 'banned', 'removed');
    END IF;
END
$$;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS status content_status DEFAULT 'active' NOT NULL;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS status content_status DEFAULT 'active' NOT NULL;

CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR NOT NULL,
    entity_id INTEGER NOT NULL,
    reason VARCHAR NOT NULL,
    context VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR DEFAULT 'pending' NOT NULL
);

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
