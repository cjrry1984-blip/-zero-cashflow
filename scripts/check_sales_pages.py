#!/usr/bin/env python3
"""Static storefront regression checks. Uses Python stdlib only."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parent.parent
ACTIVATION_SCRIPT = "assets/activate-checkout.js"
REQUIRED = {
    "quickcards.html": "quickcards",
    "website-auditor.html": "website_playbook",
    "chaos-button.html": "chaos_premium",
}
OCCASIONS = (
    "birthday", "thank-you", "congratulations", "love",
    "get-well", "sorry", "new-baby", "thinking-of-you",
)


class StartTags(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


def read_tags(page):
    parser = StartTags()
    parser.feed((ROOT / page).read_text(encoding="utf-8"))
    parser.close()
    return parser.tags


def load_checkout_config():
    return json.loads((ROOT / "data/checkout-links.json").read_text(encoding="utf-8"))


def payhip_product_path(value):
    if isinstance(value, str):
        parsed = urlsplit(value)
        if (parsed.scheme == "https" and parsed.netloc == "payhip.com"
                and re.fullmatch(r"/b/[A-Za-z0-9_-]+/?", parsed.path)):
            return parsed.path.rstrip("/")
    return None


def check_checkout_page(page, key, config):
    entry = config.get(key)
    if not isinstance(entry, dict) or entry.get("status") not in ("pending", "verified"):
        raise SystemExit(f"{page}: invalid checkout state for {key}")
    configured_path = payhip_product_path(entry.get("url"))
    if entry["status"] == "verified" and not configured_path:
        raise SystemExit(f"{page}: invalid verified Payhip URL for {key}")
    if entry["status"] == "pending" and entry.get("url") not in (None, ""):
        raise SystemExit(f"{page}: unverified checkout URL must remain empty for {key}")

    tags = read_tags(page)
    buttons = [(tag, attrs) for tag, attrs in tags if "data-product-checkout" in attrs]
    if len(buttons) != 1:
        raise SystemExit(f"{page}: expected one guarded checkout for {key}")
    tag, button = buttons[0]
    if tag != "a" or button["data-product-checkout"] != key or "hidden" not in button:
        raise SystemExit(f"{page}: checkout for {key} must be a hidden link")
    if button.get("href") not in (None, "", "#"):
        button_path = payhip_product_path(button["href"])
        if not button_path or (configured_path and button_path != configured_path):
            raise SystemExit(f"{page}: checkout link must match the configured Payhip product")

    for tag, attrs in tags:
        if tag == "a" and attrs is not button:
            link = urlsplit(attrs.get("href") or "")
            if (link.hostname in ("payhip.com", "www.payhip.com")
                    and (link.path.startswith("/b/") or link.path.rstrip("/") == "/buy")):
                raise SystemExit(f"{page}: unguarded Payhip purchase link")

    notices = [attrs for _, attrs in tags if attrs.get("data-pending-checkout") == key]
    if len(notices) != 1 or "hidden" not in notices[0]:
        raise SystemExit(f"{page}: missing hidden fallback notice for {key}")
    if not any(tag == "script" and attrs.get("src") == ACTIVATION_SCRIPT for tag, attrs in tags):
        raise SystemExit(f"{page}: missing checkout activation script")


def local_links(page, target):
    for tag, attrs in read_tags(page):
        if tag == "a":
            link = urlsplit(attrs.get("href") or "")
            if not link.scheme and not link.netloc and link.path == target:
                yield link


def main():
    landings = [f"quickcards-{name}.html" for name in OCCASIONS]
    checklist = "photography-website-checklist.html"
    files = [
        "index.html", "sitemap.xml", "privacy.html", "contact.html",
        ACTIVATION_SCRIPT, "data/checkout-links.json", checklist, *REQUIRED, *landings,
    ]
    for page in files:
        if not (ROOT / page).is_file():
            raise SystemExit(f"Missing storefront file: {page}")

    config = load_checkout_config()
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    for page, key in REQUIRED.items():
        check_checkout_page(page, key, config)
        if not any(local_links("index.html", page)) or page not in sitemap:
            raise SystemExit(f"Missing homepage or sitemap link: {page}")
    for page in landings:
        if not any(local_links("quickcards.html", page)) or page not in sitemap:
            raise SystemExit(f"Search landing missing from hub/sitemap: {page}")

    if not any(local_links("index.html", checklist)):
        raise SystemExit("Homepage no longer links the photography checklist")
    campaign = ["photographer_booking_flow"]
    if not any(parse_qs(link.query).get("utm_campaign") == campaign
               for link in local_links(checklist, "website-auditor.html")):
        raise SystemExit("Photography checklist no longer links to the auditor with its campaign tag")
    print("Sales pages checked: 3 guarded checkouts, 8 search landings, sitemap and photographer funnel.")


if __name__ == "__main__":
    main()
