#!/usr/bin/env python3
"""Static storefront regression checks. Uses Python stdlib only."""
from pathlib import Path
from urllib.parse import urlparse
import json

root=Path(__file__).resolve().parent.parent
required={
 "quickcards.html":"quickcards",
 "website-auditor.html":"website_playbook",
}
occasions=("birthday","thank-you","congratulations","love",
           "get-well","sorry","new-baby","thinking-of-you")
files=[root/"index.html",root/"sitemap.xml",root/"privacy.html",root/"contact.html"]
files += [root/f for f in required]
files += [root/f"quickcards-{name}.html" for name in occasions]
files += [root/"assets/activate-checkout.js", root/"data/checkout-links.json"]
for f in files:
    if not f.is_file(): raise SystemExit(f"Missing storefront file: {f.relative_to(root)}")
index=(root/"index.html").read_text(encoding="utf-8")
sitemap=(root/"sitemap.xml").read_text(encoding="utf-8")
for page,key in required.items():
    contents=(root/page).read_text(encoding="utf-8")
    if f'data-product-checkout="{key}"' not in contents:
        raise SystemExit(f"Missing checkout guard for {key}")
    if f'data-pending-checkout="{key}"' not in contents:
        raise SystemExit(f"Missing fallback for {key}")
    if 'activate-checkout.js' not in contents:
        raise SystemExit(f"Missing activation script: {page}")
    if page not in index or page not in sitemap:
        raise SystemExit(f"Missing homepage or sitemap link: {page}")
for name in occasions:
    page=f"quickcards-{name}.html"
    if page not in sitemap or page not in (root/"quickcards.html").read_text(encoding="utf-8"):
        raise SystemExit(f"Search landing missing from hub/sitemap: {page}")
config=json.loads((root/"data/checkout-links.json").read_text(encoding="utf-8"))
for key in required.values():
    entry=config.get(key)
    if not isinstance(entry,dict) or entry.get("status") not in {"pending","verified"}:
        raise SystemExit(f"Invalid checkout state for {key}")
    url=entry.get("url")
    if entry["status"]=="verified":
        parsed=urlparse(str(url))
        if parsed.scheme!="https" or parsed.netloc!="payhip.com" or not parsed.path.startswith("/b/"):
            raise SystemExit(f"Invalid verified Payhip URL for {key}")
    elif url not in (None,""):
        raise SystemExit(f"Unverified checkout link must remain empty for {key}")
print("Sales pages checked: 2 product funnels, 8 search landings, sitemap, guarded checkout.")
