import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
tools = json.loads((root / "data" / "tools.json").read_text(encoding="utf-8"))
recipes = json.loads((root / "data" / "recipes.json").read_text(encoding="utf-8"))

assert isinstance(tools, list) and tools, "tools.json must be a non-empty list"
required = {"name", "category", "description", "pricing", "url"}
seen = set()
for i, item in enumerate(tools, 1):
    missing = required - item.keys()
    assert not missing, f"Tool {i} missing: {', '.join(sorted(missing))}"
    assert item["name"] not in seen, f"Duplicate tool: {item['name']}"
    seen.add(item["name"])
    assert item["pricing"] in {"Free", "Freemium", "Paid"}, f"Invalid pricing for {item['name']}"
    assert item["url"].startswith("https://"), f"URL must use HTTPS: {item['name']}"

assert isinstance(recipes, list) and recipes, "recipes.json must be a non-empty list"
recipe_ids = set()
recipe_required = {"id", "title", "category", "level", "time", "summary", "tools", "tags", "steps", "free_route", "safety"}
for i, recipe in enumerate(recipes, 1):
    missing = recipe_required - recipe.keys()
    assert not missing, f"Recipe {i} missing: {', '.join(sorted(missing))}"
    assert recipe["id"] not in recipe_ids, f"Duplicate recipe id: {recipe['id']}"
    recipe_ids.add(recipe["id"])
    assert recipe["level"] in {"Beginner", "Intermediate"}, f"Invalid level: {recipe['id']}"
    assert recipe["steps"] and all(isinstance(step, str) and step.strip() for step in recipe["steps"]), f"Empty steps: {recipe['id']}"
    assert recipe["tools"], f"Recipe has no tools: {recipe['id']}"

print(f"OK: validated {len(tools)} tools and {len(recipes)} recipes")
