DROP TABLE stream_presence;

CREATE TABLE stream_presence (
  stream_id TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (stream_id, client_id)
);

CREATE INDEX idx_presence_stream ON stream_presence(stream_id);
CREATE INDEX idx_presence_seen ON stream_presence(last_seen_at);

UPDATE streams SET rating_sum = 0, rating_count = 0, listeners = 0;

CREATE TRIGGER ratings_after_insert AFTER INSERT ON ratings
BEGIN
  UPDATE streams
  SET rating_sum = (SELECT COALESCE(SUM(value), 0) FROM ratings WHERE stream_id = NEW.stream_id),
      rating_count = (SELECT COUNT(*) FROM ratings WHERE stream_id = NEW.stream_id)
  WHERE id = NEW.stream_id;
END;

CREATE TRIGGER ratings_after_update AFTER UPDATE ON ratings
BEGIN
  UPDATE streams
  SET rating_sum = (SELECT COALESCE(SUM(value), 0) FROM ratings WHERE stream_id = NEW.stream_id),
      rating_count = (SELECT COUNT(*) FROM ratings WHERE stream_id = NEW.stream_id)
  WHERE id = NEW.stream_id;
END;

CREATE TRIGGER ratings_after_delete AFTER DELETE ON ratings
BEGIN
  UPDATE streams
  SET rating_sum = (SELECT COALESCE(SUM(value), 0) FROM ratings WHERE stream_id = OLD.stream_id),
      rating_count = (SELECT COUNT(*) FROM ratings WHERE stream_id = OLD.stream_id)
  WHERE id = OLD.stream_id;
END;
