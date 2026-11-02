# Izzopac Payhip automation — setup and verified status

## Live status on 2026-11-02

The receiver is deployed at https://izzopac-payhip.cjrry1984.workers.dev. Cloudflare Workers/D1 Free are configured, with the D1 database restricted to EU jurisdiction. Four credentials are stored as encrypted Cloudflare secrets. Request logging is disabled. Payhip confirmed saving the receiver URL, with `paid` and `refunded` enabled. The secret-bearing URL is intentionally not documented here.

The public product page was independently checked from the signed-in browser: Solo Service Business Follow-Up Kit, US$17.99, ZIP listed as 10 KB. Checkout and download delivery remain untested. No purchase or synthetic sale was made.

`/health` was verified live with HTTP 200 and `status: ready`, using a real D1 read. The Cloudflare scheduled handler was manually triggered in its runtime, and a private report was read back from the actual D1 `daily_reports` table. The first automatic timer run is scheduled for 2026-11-03 at 07:17 UTC (08:17 Brussels winter). A future timer execution has not yet been observed. The initial public route served stale Hello World code until the correct deployed version was explicitly activated; the final health check returned the receiver JSON.

Five local tests pass against real in-memory SQLite through a D1-compatible adapter: authentication/input validation, deduplication/product filtering/follow-ups/refunds, private aggregate reporting, storage errors and scheduled persistence. These are synthetic local tests, not sales.

## Private daily report and follow-ups

**The owner requested private reporting. The public GitHub report workflow has been removed.** Cloudflare cron generates a report daily at 07:17 UTC and upserts it into `daily_reports`, even when there are no received events. It requires no GitHub token, computer left running or email provider. Email delivery is not configured.

Open the [private Cloudflare database](https://dash.cloudflare.com/570e20070f142f317ef65a38bedf4f9f/workers/d1/databases/d0deaec1-d95f-4158-a8c1-7ffd4fd60844/metrics), choose Explore Data and select `daily_reports`. You must be signed into your Cloudflare account. `report_json` contains the period, totals by currency and event type, due follow-up count and last received event time. To see due support drafts, query the private `followups_due` view in Console: `SELECT * FROM followups_due ORDER BY purchased_utc LIMIT 100;`. Review and send messages yourself. Mark one complete in Console with `UPDATE events SET followup_done=1 WHERE event_key='paid:TRANSACTION_ID';`, replacing the ID with the selected row. No buyer messages are sent automatically.

There is no setup left for the receiver or private timer. Real Payhip sale/refund delivery and protected product download still require an actual controlled transaction or a future genuine sale to verify. If `/health` stops returning ready or Payhip shows sales missing from D1, reconcile promptly; do not infer zero sales from an empty report.

The steps below are retained for recovery or a new account. **Keep reports in the private D1 database.**

## Recovery / new installation

Use Cloudflare **Workers Free** and D1 Free. No custom domain is needed. Stay on Free: quota exhaustion can interrupt receipt; do not upgrade billing automatically. GitHub Actions only runs code tests. Cloudflare runs the private report timer. No GitHub Action acts as an always-on webhook server.

From `automation/`, using Node 24:

1. Sign into your own Cloudflare account: `npx wrangler@4.156.2 login`. Create D1: `npx wrangler@4.156.2 d1 create izzopac-sales --jurisdiction eu`. Copy `wrangler.example.toml` to `wrangler.toml` and replace the database ID with the returned ID. This local config is ignored by Git.
2. Apply the schema: `npx wrangler@4.156.2 d1 migrations apply izzopac-sales --remote`. Set four secrets using the hidden input prompts below. Use separate random values of at least 32 bytes for the three tokens; a password manager can generate them. Never paste them in a commit, issue, chat, shell argument or screenshot.

   ```text
   npx wrangler@4.156.2 secret put PAYHIP_API_KEY
   npx wrangler@4.156.2 secret put WEBHOOK_TOKEN
   npx wrangler@4.156.2 secret put REPORT_TOKEN
   npx wrangler@4.156.2 secret put ADMIN_TOKEN
   npx wrangler@4.156.2 deploy
   ```

   PAYHIP_API_KEY is from Payhip Settings → Developer. The other tokens are independently generated secrets. If Wrangler requests an initial deploy before setting secrets, deploy first; the receiver fails closed until configured. Do not enable Worker request logs: the webhook URL contains a secret token.
3. Check `https://<worker>.<account>.workers.dev/health`: expect HTTP 200 and `status: ready`. In Payhip Settings → Developer add `https://<worker>.<account>.workers.dev/webhook?token=<WEBHOOK_TOKEN>` and enable **paid** and **refunded**. Keep existing webhook endpoints. Treat this entire URL as secret. The Worker checks both the URL token and Payhip's documented `sha256(API key)` signature. Payhip's signature is a static credential, not a body HMAC, so knowledge of it allows forgery. HTTPS, the second token, no payload logging, and rotation matter.
4. The private scheduled handler is deployed with the Worker. Confirm the cron `17 7 * * *` in Cloudflare Settings → Trigger events. Open Explore Data → `daily_reports` after the first run. Do not add report credentials to GitHub or publish financial summaries there.

No Cloudflare credentials are needed in GitHub. Deployment remains a manual command so this repository cannot spend money or change the receiver using a GitHub token.

## Follow-up operation

After three days, non-refunded paid transactions with an email address and explicit `unconsented_from_emails: false` appear in `GET /followups`. Authenticate with `Authorization: Bearer <ADMIN_TOKEN>`, using a local HTTP client that keeps the token out of its history. The response contains private addresses and a service-support draft; never paste it into public Actions or GitHub issues. Review and send the draft yourself. There is no customer email sender or automatic marketing enrolment. `false` in this Payhip field is only a filter, not proof of consent for every marketing use.

Mark a reviewed item complete with `POST /followups/done`, the same admin header and JSON `{"event_key":"paid:TRANSACTION_ID"}`. The queue returns the oldest 100 items; mark them complete to see the next batch. Any refund suppresses follow-up, including partial refunds. The queue is computed from stored events, so it needs no separate cron or task creation job. Daily reports show the number due.

## Acceptance test after setup

- Confirm `/health` succeeds and a webhook with the wrong token/signature is rejected (401).
- Use a **separate test Worker/database and separate test credentials** for synthetic events. Do not inject synthetic sales into production. Replay a signed fixture twice; expect `recorded`, then `duplicate`, and one database row.
- Verify the deployed Worker and D1 binding with a controlled Payhip test transaction only when you choose to make one. Check its Payhip transaction ID, one D1 `paid` row, next-day report, protected delivery and refund event if applicable. Do not treat a synthetic fixture as a sale.
- Until that is done, the status is **deployed, health checked and private report tested; real Payhip transaction flow not end-to-end verified**. No sales, revenue or working delivery are claimed.

## Accounting and recovery limits

Events only cover deliveries received **after activation**. No historical import or polling is included. A zero report means no matching received events for the previous UTC day, not proof of zero Payhip sales. Late webhooks appear when querying their original event day in D1, but an already generated daily summary is not rewritten. Compare the Payhip dashboard periodically, especially after failures.

Amounts are integer minor units, gross transaction totals for baskets containing Q6StN. Other basket products, tax and fees are not allocated; these are not product-only revenue, profit or accounting records. Never combine currencies. Refunds use `amount_refunded` and `date_refunded`. Dedupe is `paid:id` and `refunded:id:date_refunded:amount_refunded`. Identical partial refunds within one timestamp or cumulative refund semantics need manual reconciliation; Payhip does not expose a distinct refund event ID in its documented example.

Only acknowledge a valid event after its database write. Storage failures return 503; Payhip documents retries hourly for up to three hours. Free quota exhaustion or an outage longer than this requires reconciliation/import from Payhip manually. There is no unlimited uptime guarantee or external heartbeat monitor. `/health` checks storage connectivity only, not the Payhip configuration. Keep secrets in Cloudflare/GitHub secret storage and rotate both Payhip and receiver tokens after exposure.

## Privacy and maintenance

D1 holds transaction ID, event time, currency, amount, buyer email, opt-out and follow-up state. No raw payloads, names, IPs, signatures or license keys are saved. Admin endpoints return `Cache-Control: no-store`; reports contain no customer addresses or transaction IDs. Restrict Cloudflare account access and enable MFA. Choose an appropriate storage jurisdiction and update the business privacy notice before collecting live data.

No automatic financial-record deletion is enabled. After finishing support, remove email addresses according to your retention policy using Cloudflare D1 console, for example `UPDATE events SET email=NULL WHERE received < unixepoch('now','-90 days');`. This preserves dedupe and financial observations but permanently removes older follow-up contacts. Review retention and backups in the account; never export buyer data into this public repository. Do not delete event keys while webhook replays may still arrive.

Sources checked: [Payhip webhooks](https://help.payhip.com/article/115-webhooks), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).
