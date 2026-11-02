# Izzopac Payhip automation — setup and verified status

## Status on 2026-11-02

Repository baseline: `c48412a` on `main`. It had a static site and data-validation CI; no sale receiver, database, follow-up queue or daily sales report. The product page already links to https://payhip.com/b/Q6StN and displays $17.99. The live Payhip page could not be independently rechecked: both browsing and direct HTTP access were blocked. The checkout, ZIP contents, delivery and any real sales remain unverified.

Implemented: Cloudflare Worker receiver, D1 schema, database-backed idempotency, product filter, refund recording, protected follow-up drafts, separate aggregate reporting token, daily GitHub Actions summary and automated tests. No customer messages are sent by this code. No paid services, analytics SDKs or email providers are required.

Local verification: Node 24 tests run the actual receiver against real in-memory SQLite through a D1-compatible test adapter. They cover authentication, invalid/oversized input, retry deduplication, product filtering, opt-out, follow-up completion, refund-before-payment, currency separation, privacy and storage failures. Existing directory validation and weekly draft generation also pass. This is not a Cloudflare deployment or a Payhip sale test.

## One-time activation

Use Cloudflare **Workers Free** and D1 Free. No custom domain is needed. Stay on Free: quota exhaustion can interrupt receipt; do not upgrade billing automatically. GitHub Actions in this public repository is suitable for the small daily report. Scheduled Actions can be delayed and may be disabled after repository inactivity; check runs regularly. No GitHub Action can act as an always-on webhook server.

From `automation/`, using Node 24:

1. Sign into your own Cloudflare account: `npx wrangler@4 login`. Create D1: `npx wrangler@4 d1 create izzopac-sales`. Copy `wrangler.example.toml` to `wrangler.toml` and replace the database ID with the returned ID. This local config is ignored by Git.
2. Apply the schema: `npx wrangler@4 d1 migrations apply izzopac-sales --remote`. Set four secrets using the hidden input prompts below. Use separate random values of at least 32 bytes for the three tokens; a password manager can generate them. Never paste them in a commit, issue, chat, shell argument or screenshot.

   ```text
   npx wrangler@4 secret put PAYHIP_API_KEY
   npx wrangler@4 secret put WEBHOOK_TOKEN
   npx wrangler@4 secret put REPORT_TOKEN
   npx wrangler@4 secret put ADMIN_TOKEN
   npx wrangler@4 deploy
   ```

   PAYHIP_API_KEY is from Payhip Settings → Developer. The other tokens are independently generated secrets. If Wrangler requests an initial deploy before setting secrets, deploy first; the receiver fails closed until configured. Do not enable Worker request logs: the webhook URL contains a secret token.
3. Check `https://<worker>.<account>.workers.dev/health`: expect HTTP 200 and `status: ready`. In Payhip Settings → Developer add `https://<worker>.<account>.workers.dev/webhook?token=<WEBHOOK_TOKEN>` and enable **paid** and **refunded**. Keep existing webhook endpoints. Treat this entire URL as secret. The Worker checks both the URL token and Payhip's documented `sha256(API key)` signature. Payhip's signature is a static credential, not a body HMAC, so knowledge of it allows forgery. HTTPS, the second token, no payload logging, and rotation matter.
4. In GitHub Settings → Secrets and variables → Actions, add secret `PAYHIP_REPORT_TOKEN` with the same value as Cloudflare `REPORT_TOKEN`; add variable `PAYHIP_WORKER_URL` with the HTTPS workers.dev base URL. Daily reports include business totals and are **visible in this public repository's Actions summaries**. If that is acceptable, set variable `PAYHIP_REPORT_ENABLED` to `true`, then run **Daily Payhip report** manually. Otherwise leave it disabled and retrieve `/report` privately. It runs around **07:17 UTC** daily (08:17 Brussels winter / 09:17 summer); no email delivery is configured. Enable GitHub failure notifications in your own notification settings if wanted.

No Cloudflare credentials are needed in GitHub. Deployment remains a manual command so this repository cannot spend money or change the receiver using a GitHub token.

## Follow-up operation

After three days, non-refunded paid transactions with an email address and explicit `unconsented_from_emails: false` appear in `GET /followups`. Authenticate with `Authorization: Bearer <ADMIN_TOKEN>`, using a local HTTP client that keeps the token out of its history. The response contains private addresses and a service-support draft; never paste it into public Actions or GitHub issues. Review and send the draft yourself. There is no customer email sender or automatic marketing enrolment. `false` in this Payhip field is only a filter, not proof of consent for every marketing use.

Mark a reviewed item complete with `POST /followups/done`, the same admin header and JSON `{"event_key":"paid:TRANSACTION_ID"}`. The queue returns the oldest 100 items; mark them complete to see the next batch. Any refund suppresses follow-up, including partial refunds. The queue is computed from stored events, so it needs no separate cron or task creation job. Daily reports show the number due.

## Acceptance test after setup

- Confirm `/health` succeeds and a webhook with the wrong token/signature is rejected (401).
- Use a **separate test Worker/database and separate test credentials** for synthetic events. Do not inject synthetic sales into production. Replay a signed fixture twice; expect `recorded`, then `duplicate`, and one database row.
- Verify the deployed Worker and D1 binding with a controlled Payhip test transaction only when you choose to make one. Check its Payhip transaction ID, one D1 `paid` row, next-day report, protected delivery and refund event if applicable. Do not treat a synthetic fixture as a sale.
- Until that is done, the status is **built and locally tested; not live end-to-end verified**. No sales, revenue or working delivery are claimed.

## Accounting and recovery limits

Events only cover deliveries received **after activation**. No historical import or polling is included. A zero report means no matching received events for the previous UTC day, not proof of zero Payhip sales. Late webhooks appear when querying their original event day in D1, but an already generated daily summary is not rewritten. Compare the Payhip dashboard periodically, especially after failures.

Amounts are integer minor units, gross transaction totals for baskets containing Q6StN. Other basket products, tax and fees are not allocated; these are not product-only revenue, profit or accounting records. Never combine currencies. Refunds use `amount_refunded` and `date_refunded`. Dedupe is `paid:id` and `refunded:id:date_refunded:amount_refunded`. Identical partial refunds within one timestamp or cumulative refund semantics need manual reconciliation; Payhip does not expose a distinct refund event ID in its documented example.

Only acknowledge a valid event after its database write. Storage failures return 503; Payhip documents retries hourly for up to three hours. Free quota exhaustion or an outage longer than this requires reconciliation/import from Payhip manually. There is no unlimited uptime guarantee or external heartbeat monitor. `/health` checks storage connectivity only, not the Payhip configuration. Keep secrets in Cloudflare/GitHub secret storage and rotate both Payhip and receiver tokens after exposure.

## Privacy and maintenance

D1 holds transaction ID, event time, currency, amount, buyer email, opt-out and follow-up state. No raw payloads, names, IPs, signatures or license keys are saved. Admin endpoints return `Cache-Control: no-store`; reports contain no customer addresses or transaction IDs. Restrict Cloudflare account access and enable MFA. Choose an appropriate storage jurisdiction and update the business privacy notice before collecting live data.

No automatic financial-record deletion is enabled. After finishing support, remove email addresses according to your retention policy using Cloudflare D1 console, for example `UPDATE events SET email=NULL WHERE received < unixepoch('now','-90 days');`. This preserves dedupe and financial observations but permanently removes older follow-up contacts. Review retention and backups in the account; never export buyer data into this public repository. Do not delete event keys while webhook replays may still arrive.

Sources checked: [Payhip webhooks](https://help.payhip.com/article/115-webhooks), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).
