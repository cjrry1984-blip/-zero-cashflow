import json
from datetime import date
from pathlib import Path
root=Path(__file__).resolve().parents[1]
tools=json.loads((root/"data/tools.json").read_text(encoding="utf-8"))
today=date.today().isoformat()
lines=[f"# Weekly content draft — {today}","","STATUS: DRAFT — HUMAN REVIEW REQUIRED","","Do not publish without checking all facts, prices, links, and claims.","","## Suggested article: A practical starter stack for AI-assisted work","", "This draft introduces a small selection of tools from the local directory. Verify current product features and pricing before publication.","",""]
for t in tools[:5]:
    lines += [f"### {t['name']}",t["description"],f"Category: {t['category']} · Pricing label in directory: {t['pricing']}",f"Website: {t['url']}",""]
out=root/"content-drafts"/f"weekly-{today}.md"
out.parent.mkdir(exist_ok=True)
out.write_text("\n".join(lines),encoding="utf-8")
print(f"Draft created: {out.relative_to(root)}")