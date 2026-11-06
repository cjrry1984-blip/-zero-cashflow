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

## QuickCards + Website Fix Playbook — sales launch status

**Public pages:** [QuickCards](quickcards.html) and [Website Auditor](website-auditor.html); eight additional free message pages support the QuickCards funnel. The full ZIP downloads, covers, free preview PDFs and Payhip listing copy are separate **private upload assets**, not tracked in this public repository.

**Checkout is intentionally OFF until real verification.** The two new Payhip links are not created/verified in this repo. They must not be confused with the existing Follow-Up Kit link (https://payhip.com/b/Q6StN).

The public file [data/checkout-links.json](data/checkout-links.json) holds the checkout state for two new products:

- `quickcards`: ZIP with offline HTML card designer, 24 printable cards (12 A4 pages), 40 example messages. Proposed launch price €1.99.
- `website_playbook`: nine-page DIY website workbook. Proposed launch price €9.

After creating both products in Payhip, uploading their **correct protected ZIP files**, adding cover images and sample PDFs, confirming EU/UK VAT settings, publishing mandatory seller/contact/withdrawal disclosures, and testing 100%-coupon delivery **and** a real payment, set the correct `https://payhip.com/b/...` URL and status `verified` for each product. Otherwise leave the corresponding URL empty and status `pending`. The script [assets/activate-checkout.js](assets/activate-checkout.js) shows a buy button only for verified URLs. Unverified products remain clearly labelled as not yet on sale.

Payhip's digital download and VAT guidance: https://help.payhip.com/article/59-adding-a-digital-product and https://help.payhip.com/article/127-digital-eu-vat . Belgian trader-information obligations should be reviewed against https://economie.fgov.be/nl/themas/verkoop/vormen-van-verkoop/verkoop-op-afstand/verkoop-op-afstand-informatie .

**Quality gate:** `python scripts/check_sales_pages.py` verifies checkout gating, pages and sitemap. The GitHub CI workflow runs it on every push. Local browser acceptance of the offline card studio and simulated PageSpeed API: 13/13 passing as of Nov 6, 2026. A simulated API result does not prove Google's live API or the Payhip buyer experience works.

