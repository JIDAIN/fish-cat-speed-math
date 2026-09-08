from pathlib import Path

path = Path("src/app/page.tsx")
text = path.read_text()
count = text.count("onClick={submit}")
assert count >= 1, "expected at least one direct submit click handler"
path.write_text(text.replace("onClick={submit}", "onClick={() => submit()}"))
