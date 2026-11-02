CREATE VIEW IF NOT EXISTS followups_due AS
SELECT p.event_key,p.email,datetime(p.occurred,'unixepoch') AS purchased_utc,
 'Thank you for choosing the Solo Service Business Follow-Up Kit. Have you been able to open the files? Reply if you need help getting started.' AS draft
FROM events p WHERE p.type='paid' AND p.followup_done=0 AND p.opted_out=0 AND p.email IS NOT NULL
AND p.occurred<=unixepoch('now','-3 days')
AND NOT EXISTS(SELECT 1 FROM events r WHERE r.transaction_id=p.transaction_id AND r.type='refunded');
