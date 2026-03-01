import zipfile
import xml.etree.ElementTree as ET
import os

def read_docx(path):
    try:
        text_content = []
        with zipfile.ZipFile(path) as docx:
            xml_content = docx.read('word/document.xml')
            tree = ET.XML(xml_content)
            for node in tree.iter():
                if node.tag.endswith('}t'):
                    if node.text:
                        text_content.append(node.text)
        return "\n".join(text_content)
    except Exception as e:
        return f"Error reading {path}: {e}"

docs = [
    "JewelPromo AI App flow document .docx",
    "JewelPromo AI Backend document .docx",
    "JewelPromo AI Design document .docx",
    "JewelPromo AI Product requirement document.docx"
]

with open("docs_extracted.txt", "w", encoding="utf-8") as f:
    for doc in docs:
        f.write(f"--- CONTENT OF {doc} ---\n")
        f.write(read_docx(doc))
        f.write("\n\n")
