-- Sparrow Radio: streams catalog (hot = live, cold = archive)
CREATE TABLE streams (
  id                 TEXT PRIMARY KEY,
  owner_id           TEXT NOT NULL,
  name               TEXT NOT NULL CHECK (length(name) BETWEEN 3 AND 60),
  kind               TEXT NOT NULL CHECK (kind IN ('HOT', 'COLD')),
  content_type       TEXT NOT NULL CHECK (content_type IN ('MUSIC', 'CONVERSATION', 'MIXED')),
  category           TEXT NOT NULL CHECK (category IN
                       ('MUSIC','TALK_SHOW','PODCAST','INTERVIEW','NEWS','COMEDY','EDUCATIONAL','DEBATE')),
  conversation_topic TEXT CHECK (conversation_topic IS NULL OR length(conversation_topic) <= 100),
  is_conversation    INTEGER NOT NULL DEFAULT 0 CHECK (is_conversation IN (0, 1)),
  description        TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 500),
  source_url         TEXT CHECK (source_url IS NULL OR length(source_url) <= 500),
  listeners          INTEGER NOT NULL DEFAULT 0,
  rating_sum         INTEGER NOT NULL DEFAULT 0,
  rating_count       INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_streams_type_category ON streams (content_type, category);
CREATE INDEX idx_streams_listeners     ON streams (listeners DESC);
CREATE INDEX idx_streams_created       ON streams (created_at DESC);
CREATE INDEX idx_streams_owner         ON streams (owner_id);
