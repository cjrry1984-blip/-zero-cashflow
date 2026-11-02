CREATE TABLE IF NOT EXISTS daily_reports (
 period_start TEXT PRIMARY KEY,
 generated_at INTEGER NOT NULL,
 report_json TEXT NOT NULL
);
