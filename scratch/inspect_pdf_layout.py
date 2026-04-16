import fitz
import json

pdf_path = r"c:\z\2026 Consensus Big Board _ NFL Mock Draft Database.pdf"
doc = fitz.open(pdf_path)

page_idx = 19
page = doc[page_idx]
data = page.get_text("dict")

# Remove image bytes from dict
for block in data.get("blocks", []):
    if "image" in block:
        block["image"] = "<image bytes excluded>"

with open(r"c:\Users\User\Projects\nfl-mock-draft\scratch\page_20_dict.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Dumped Page {page_idx + 1} dictionary to scratch/page_20_dict.json")
