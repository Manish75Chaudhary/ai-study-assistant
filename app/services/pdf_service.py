from dataclasses import dataclass
from pathlib import Path

import fitz


@dataclass(frozen=True)
class PDFPage:
    page_number: int
    text: str


def extract_pages_from_pdf(file_source):
    if isinstance(file_source, (bytes, bytearray, memoryview)):
        document = fitz.open(stream=bytes(file_source), filetype="pdf")
    else:
        document = fitz.open(str(file_source))

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


def extract_text_from_pdf(file_source):
    pages = extract_pages_from_pdf(file_source)
    return "\n".join(page.text for page in pages)