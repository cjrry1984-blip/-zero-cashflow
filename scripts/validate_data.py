import json
from pathlib import Path
p=Path(__file__).resolve().parents[1]/"data"/"tools.json"
data=json.loads(p.read_text(encoding="utf-8"))
assert isinstance(data,list) and data, "tools.json must be a non-empty list"
required={"name","category","description","pricing","url"}
seen=set()
for i,item in enumerate(data,1):
    missing=required-item.keys()
    assert not missing, f"Tool {i} missing: {', '.join(sorted(missing))}"
    assert item["name"] not in seen, f"Duplicate tool: {item['name']}"
    seen.add(item["name"])
    assert item["pricing"] in {"Free","Freemium","Paid"}, f"Invalid pricing for {item['name']}"
    assert item["url"].startswith("https://"), f"URL must use HTTPS: {item['name']}"
print(f"OK: validated {len(data)} tools")