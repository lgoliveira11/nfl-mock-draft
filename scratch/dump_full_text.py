import fitz

pdf_path = r"c:\z\2026 Consensus Big Board _ NFL Mock Draft Database.pdf"
doc = fitz.open(pdf_path)

with open(r"c:\Users\User\Projects\nfl-mock-draft\scratch\full_text_dump.txt", "w", encoding="utf-8") as f:
    for i, page in enumerate(doc):
        f.write(f"--- PAGE {i+1} ---\n")
        blocks = page.get_text("blocks")
        for b in blocks:
            f.write(f"Block: {b[4]}\n")

print("Full text dump created in scratch/full_text_dump.txt")
