-- Dialogue content is rebuilt from data/dialogues.json by seed.py; choice_log survives reseeding.
CREATE TABLE IF NOT EXISTS categories (
  id    TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS topics (
  id            TEXT PRIMARY KEY,
  category_id   TEXT NOT NULL REFERENCES categories(id),
  title         TEXT NOT NULL,
  start_node_id TEXT NOT NULL,
  sort          INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS nodes (
  id       TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topics(id),
  text     TEXT NOT NULL,
  emotion  TEXT NOT NULL DEFAULT 'neutral'
);

CREATE TABLE IF NOT EXISTS choices (
  id           TEXT PRIMARY KEY,
  node_id      TEXT NOT NULL REFERENCES nodes(id),
  label        TEXT NOT NULL,
  next_node_id TEXT REFERENCES nodes(id),
  sort         INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS choice_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id  TEXT NOT NULL,
  topic_id   TEXT NOT NULL,
  choice_id  TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_choice_log_player ON choice_log(player_id, topic_id);
