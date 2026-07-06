from dataclasses import dataclass

import fitz


@dataclass(frozen=True)
class PDFPage:
    page_number: int
    text: str


def extract_pages_from_pdf(file_path):

    document = fitz.open(file_path)

    pages = []
    for page_index, page in enumerate(document, start=1):
        pages.append(
            PDFPage(
                page_number=page_index,
                text=page.get_text(),
            )
        )

    document.close()

    return pages


def extract_text_from_pdf(file_path):
    pages = extract_pages_from_pdf(file_path)
    return "\n".join(page.text for page in pages)