# ZERO CASHFLOW 3.0

A lightweight, English-language AI tools directory and content starter. It is designed to run without paid APIs, API keys, or a backend.

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
No analytics, cookies, forms, or API credentials are included. External provider links may collect data under their own policies. Review legal requirements before adding tracking, email collection, or monetization.
## Automation recipes
Recipes live in `data/recipes.json`. Each recipe includes a task, difficulty, setup time, tools, steps, a free-first route and a safety note. The manual versions are designed to be usable without API keys. The website supports search, category/difficulty filters, browser-local saved recipes and copying a checklist. Saved recipe IDs stay in the visitor's browser and are not sent to this site.

## Quality and safety
Run `python scripts/validate_data.py` to validate both the tool directory and recipe data. Review provider pricing, terms, links, privacy and all instructions before publishing changes. Do not claim that an integration is live unless it has actually been connected and tested.


## First digital product
`product.html` is the sales page for the Solo Service Business Follow-Up Kit. The paid download bundle is prepared separately and must be uploaded to a payment platform with protected delivery. The website intentionally does not accept orders until a real checkout URL is configured and tested.

## Izzopac Payhip sales automation

The static storefront already links to https://payhip.com/b/Q6StN. A deployed Worker/D1 backend provides sale/refund registration, protected follow-up drafts and private daily reports in Cloudflare D1. Public GitHub report publication has been removed. See [activation steps and verification limits](automation/README.md). The live database health check and scheduled report handler have been verified; real Payhip sale delivery and the first automatic timer execution remain unverified. No buyer data or secrets belong in this repository.
