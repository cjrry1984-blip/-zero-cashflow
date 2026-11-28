#!/usr/bin/env python3
"""Static QA for the free Chaos Button; no dependencies."""
from pathlib import Path
from check_sales_pages import check_checkout_page, load_checkout_config
root=Path(__file__).resolve().parent.parent
game=(root/"chaos-button.html").read_text(encoding="utf8")
home=(root/"index.html").read_text(encoding="utf8")
sitemap=(root/"sitemap.xml").read_text(encoding="utf8")
assert 'href="chaos-button.html?' in home, "Homepage needs a free game link"
assert "chaos-button.html" in sitemap, "Sitemap missing game"
check_checkout_page("chaos-button.html", "chaos_premium", load_checkout_config())
assert "€3.49 before applicable taxes" in game, "Premium price must remain transparent"
ids=["question","modeSelect","next","vote","skip","share","shareGame","players","applyPlayers","scoreboard","restart","seconds","useTimer","clock","clockBar","turn","counter","toast","copyQuestion"]
for id in ids:
    assert f'id="{id}"' in game, f"Missing game element {id}"
assert game.count("option value=")>=3, "Timer options missing"
for mode in ["Friends","Couples","Family","Party","Deep Talk","Chaos"]:
    assert '"'+mode+'":[' in game, f"Missing {mode} deck"
assert "navigator.share" in game and "navigator.clipboard" in game, "Sharing support missing"
assert "new URLSearchParams" not in game or "utm_campaign" in game
assert "premium offline edition includes 252" in home.lower()
assert "function startChallenge()" in game, "Challenge URL handler missing"
assert "if(!startChallenge())reset();" in game, "Challenge is not loaded on opening"
assert "challenge:modes.indexOf(mode)" in game, "Current question is not encoded"
assert "utm_source:'shared_challenge'" in game, "Shared link is not campaign-tagged"
assert "navigator.share" in game, "Native share missing"
print("Chaos Button static checks passed: homepage, sitemap, 6 modes, controls and honest checkout.")
