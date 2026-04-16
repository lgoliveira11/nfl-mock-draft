import fitz

pdf_path = r"c:\z\2026 Consensus Big Board _ NFL Mock Draft Database.pdf"
doc = fitz.open(pdf_path)

search_names = ["Styles", "Love", "Mendoza", "Bain", "Bailey", "Mauigoa", "Downs", "Reese"]

found = False
for i, page in enumerate(doc):
    text = page.get_text()
    for name in search_names:
        if name.lower() in text.lower():
            print(f"Found '{name}' on Page {i+1}")
            found = True
            # Print the text around it
            idx = text.lower().find(name.lower())
            start = max(0, idx - 100)
            end = min(len(text), idx + 100)
            print(f"Context: ...{text[start:end]}...")

if not found:
    print("None of the search names were found in the PDF text.")
