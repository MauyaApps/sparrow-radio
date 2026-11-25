ALTER TABLE streams ADD COLUMN status TEXT NOT NULL DEFAULT 'LIVE' CHECK (status IN ('LIVE','HIDDEN','CLOSED'));
ALTER TABLE streams ADD COLUMN moderation_note TEXT NOT NULL DEFAULT '';

CREATE TABLE ratings (
  stream_id TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value BETWEEN 1 AND 5),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (stream_id, user_id)
);

CREATE TABLE stream_presence (
  stream_id TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (stream_id, user_id)
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  stream_id TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE stream_reports (
  id TEXT PRIMARY KEY,
  stream_id TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 3 AND 500),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at TEXT,
  UNIQUE(stream_id, user_id)
);

CREATE INDEX idx_ratings_stream ON ratings(stream_id);
CREATE INDEX idx_presence_stream ON stream_presence(stream_id);
CREATE INDEX idx_chat_stream_created ON chat_messages(stream_id, created_at);
CREATE INDEX idx_reports_unresolved ON stream_reports(resolved_at);
