import fitz

pdf_path = r"c:\z\2026 Consensus Big Board _ NFL Mock Draft Database.pdf"
doc = fitz.open(pdf_path)

with open("scratch/pdf_text.txt", "w", encoding="utf-8") as f:
    for i in range(min(10, len(doc))):
        f.write(f"--- Page {i+1} ---\n")
        f.write(doc[i].get_text())
        f.write("\n\n")

print("Extracted text from first 10 pages to scratch/pdf_text.txt")
