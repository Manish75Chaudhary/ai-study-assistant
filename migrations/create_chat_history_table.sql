CREATE TABLE IF NOT EXISTS chat_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS ix_chat_history_document_id ON chat_history(document_id);
CREATE INDEX IF NOT EXISTS ix_chat_history_created_at ON chat_history(created_at);