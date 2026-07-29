-- Users table backing /api/v1/auth login/logout.
-- Passwords are stored as bcrypt hashes (see auth.controller.js); tokens are
-- opaque session tokens with a 1-hour TTL enforced via "tokenExpiresAt".

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    "userName" VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    token TEXT,
    "tokenExpiresAt" TIMESTAMPTZ
);
