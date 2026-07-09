import zipfile
import xml.etree.ElementTree as ET
import sys

def read_docx(path):
    sys.stdout.reconfigure(encoding='utf-8')
    try:
        with zipfile.ZipFile(path) as docx:
            xml_content = docx.read('word/document.xml')
            tree = ET.XML(xml_content)
            
            NAMESPACE = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
            
            text = []
            for node in tree.iter(NAMESPACE + 'p'):
                para_text = []
                for t_node in node.iter(NAMESPACE + 't'):
                    if t_node.text:
                        para_text.append(t_node.text)
                if para_text:
                    text.append(''.join(para_text))
            with open('prd_utf8.txt', 'w', encoding='utf-8') as f:
                f.write('\n'.join(text))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    read_docx(sys.argv[1])
