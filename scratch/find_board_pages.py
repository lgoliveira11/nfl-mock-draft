import fitz

pdf_path = r"c:\z\2026 Consensus Big Board _ NFL Mock Draft Database.pdf"
doc = fitz.open(pdf_path)

keywords = ["QB", "RB", "WR", "TE", "OT", "IOL", "DL", "EDGE", "LB", "CB", "S"]
results = []

for i, page in enumerate(doc):
    text = page.get_text()
    matches = [k for k in keywords if f" {k} " in text or f"\n{k}\n" in text or f" {k}\n" in text]
    if len(matches) > 3: # If more than 3 positions are found on one page, it's likely a list
        results.append((i+1, matches))

for page_num, matches in results:
    print(f"Page {page_num}: Found {len(matches)} position keywords")
