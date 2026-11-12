#!/usr/bin/env python3
"""Static QA for the free Chaos Button; no dependencies."""
from pathlib import Path
import re, json
from html.parser import HTMLParser
root=Path(__file__).resolve().parent.parent
game=(root/"chaos-button.html").read_text(encoding="utf8")
home=(root/"index.html").read_text(encoding="utf8")
sitemap=(root/"sitemap.xml").read_text(encoding="utf8")
assert 'href="chaos-button.html?' in home, "Homepage needs a free game link"
assert "chaos-button.html" in sitemap, "Sitemap missing game"
assert "https://payhip.com/b/" not in game, "Do not publish an unverified paid checkout"
assert "Planned price €3.49" in game, "Premium availability must remain transparent"
ids=["question","modeSelect","next","vote","skip","share","players","applyPlayers","scoreboard","restart","seconds","useTimer","clock","clockBar","turn","counter","toast","copyQuestion"]
for id in ids:
    assert f'id="{id}"' in game, f"Missing game element {id}"
assert game.count("option value=")>=3, "Timer options missing"
for mode in ["Friends","Couples","Family","Party","Deep Talk","Chaos"]:
    assert '"'+mode+'":[' in game, f"Missing {mode} deck"
assert "navigator.share" in game and "navigator.clipboard" in game, "Sharing support missing"
assert "new URLSearchParams" not in game or "utm_campaign" in game
assert "premium offline edition has 252" in home.lower()
print("Chaos Button static checks passed: homepage, sitemap, 6 modes, controls and honest checkout.")
