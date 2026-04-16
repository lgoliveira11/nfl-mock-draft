import fitz

pdf_path = r"c:\z\2026 Consensus Big Board _ NFL Mock Draft Database.pdf"
doc = fitz.open(pdf_path)

search_term = "Styles"
found_page = -1

for i, page in enumerate(doc):
    text = page.get_text()
    if search_term.lower() in text.lower():
        found_page = i + 1
        print(f"Found '{search_term}' on page {found_page}")
        break

if found_page != -1:
    # Extract text around the found page
    start = max(0, found_page - 2)
    end = min(len(doc), found_page + 3)
    with open("scratch/pdf_search_result.txt", "w", encoding="utf-8") as f:
        for i in range(start, end):
            f.write(f"--- Page {i+1} ---\n")
            f.write(doc[i].get_text())
            f.write("\n\n")
else:
    print(f"'{search_term}' not found in PDF.")
