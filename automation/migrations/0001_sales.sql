CREATE TABLE IF NOT EXISTS events (
 event_key TEXT PRIMARY KEY,
 transaction_id TEXT NOT NULL,
 type TEXT NOT NULL CHECK(type IN ('paid','refunded')),
 occurred INTEGER NOT NULL,
 received INTEGER NOT NULL,
 currency TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK(amount >= 0),
 email TEXT,
 opted_out INTEGER NOT NULL,
 followup_done INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS events_occurred ON events(occurred);
CREATE INDEX IF NOT EXISTS events_transaction ON events(transaction_id,type);
CREATE INDEX IF NOT EXISTS events_followup ON events(type,followup_done,occurred);
