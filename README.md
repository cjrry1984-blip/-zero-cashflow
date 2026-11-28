# IZZOPAC SOLUTIONS — ZERO CASHFLOW platform

An independent AI/business tools directory with a free Website Auditor and a new consumer card product, QuickCards. The static website requires no paid API credentials for its core pages; the auditor relies on Google PageSpeed, which may rate-limit requests.

## Preview locally
Run a local static server from the project root (Python 3 required):
```bash
python -m http.server 8000
```
Open `http://localhost:8000`.

## Add a tool
Edit `data/tools.json`. Each entry needs `name`, `category`, `description`, `pricing`, and an HTTPS `url`. Optional `use_cases` can improve search matching.

Allowed pricing labels: `Free`, `Freemium`, `Paid`. Re-check provider pricing before publishing; it changes.

## Validate and create a draft
```bash
python scripts/validate_data.py
python scripts/generate_weekly.py
```
Generated drafts are not automatically published. Review every claim, link, and price.

## Free static hosting
1. Push the project to the repository's `main` branch.
2. In GitHub, open Settings → Pages.
3. Choose deploy from a branch, select `main` and `/ (root)`, then Save.
4. Wait for the Pages deployment and use the URL shown by GitHub.

## GitHub Actions
`.github/workflows/ci.yml` validates the tool data on pushes, pull requests, and manual runs. It uses no secrets and makes no external AI calls.

## Monetization readiness
The data can be extended with legitimate affiliate URLs later. Do not claim a partnership until accepted by the relevant program. Add clear disclosures before using affiliate links. Revenue is not guaranteed.

## Privacy and security
No payment credentials or purchaser details should enter this public repository. See privacy.html for current measurement disclosures and external provider notices. Review applicable e-commerce and privacy obligations before accepting buyers.
## Automation recipes
Recipes live in `data/recipes.json`. Each recipe includes a task, difficulty, setup time, tools, steps, a free-first route and a safety note. The manual versions are designed to be usable without API keys. The website supports search, category/difficulty filters, browser-local saved recipes and copying a checklist. Saved recipe IDs stay in the visitor's browser and are not sent to this site.

## Quality and safety
Run `python scripts/validate_data.py` to validate both the tool directory and recipe data. Review provider pricing, terms, links, privacy and all instructions before publishing changes. Do not claim that an integration is live unless it has actually been connected and tested.


## First digital product
`product.html` is the sales page for the Solo Service Business Follow-Up Kit. The paid download bundle is prepared separately and must be uploaded to a payment platform with protected delivery. The website intentionally does not accept orders until a real checkout URL is configured and tested.

## Izzopac Payhip sales automation

The static storefront already links to https://payhip.com/b/Q6StN. A deployed Worker/D1 backend provides sale/refund registration, protected follow-up drafts and private daily reports in Cloudflare D1. Public GitHub report publication has been removed. See [activation steps and verification limits](automation/README.md). The live database health check and scheduled report handler have been verified; real Payhip sale delivery and the first automatic timer execution remain unverified. No buyer data or secrets belong in this repository.

## Storefront checkout status

The [QuickCards](quickcards.html), [Website Auditor](website-auditor.html) and [Chaos Button](chaos-button.html) pages have active Payhip purchase routes for the products listed below. QuickCards also has eight free message pages. Paid ZIP files and private upload assets are stored outside this repository.

| Product | Storefront price before applicable taxes | Download |
| --- | --- | --- |
| QuickCards | €1.99 | Offline card designer, 24 printable cards (12 A4 pages) and 40 example messages |
| Website Fix Playbook | €9 | Nine-page DIY website workbook |
| Chaos Button Premium | €3.49 | Offline party game with 252 questions across six modes |

[Checkout configuration](data/checkout-links.json) records successful 100% coupon orders on 13 November 2026 for all three products, including delivery email and download integrity checks. The configuration records paid-payment testing as outstanding.

On these product pages, [the checkout script](assets/activate-checkout.js) reveals each initially hidden button only after it loads a verified entry with a valid HTTPS Payhip product URL. Pending products use an empty URL. A missing, invalid or unavailable configuration keeps the button hidden and shows an availability notice.

For a new or changed route, confirm the protected ZIP, seller disclosures and VAT settings before release. Record coupon delivery and paid-payment verification separately. See Payhip's guides on [digital products](https://help.payhip.com/article/59-adding-a-digital-product) and [digital EU VAT](https://help.payhip.com/article/127-digital-eu-vat), and the Belgian guidance on [distance-selling information](https://economie.fgov.be/nl/themas/verkoop/vormen-van-verkoop/verkoop-op-afstand/verkoop-op-afstand-informatie).

Run the same local checks as [the storefront CI workflow](.github/workflows/ci.yml).

```bash
python scripts/validate_data.py
python scripts/check_sales_pages.py
python scripts/check_chaos_button.py
node scripts/test_checkout_route.mjs
python scripts/generate_weekly.py
```
