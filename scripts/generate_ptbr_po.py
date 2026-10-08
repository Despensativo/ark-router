import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
PO_DIR = os.path.join(REPO_DIR, "po")
EN_PO_FILE = os.path.join(PO_DIR, "en", "ark.po")
PT_PO_FILE = os.path.join(PO_DIR, "pt-br", "ark.po")

if not os.path.isfile(EN_PO_FILE):
    print("EN po file not found!")
    sys.exit(1)

os.makedirs(os.path.dirname(PT_PO_FILE), exist_ok=True)

with open(EN_PO_FILE, "r", encoding="utf-8") as f_in, open(PT_PO_FILE, "w", encoding="utf-8") as f_out:
    current_id = None
    for line in f_in:
        line_s = line.strip()
        if line_s.startswith('msgid "'):
            current_id = line_s[7:-1]
            f_out.write(line)
        elif line_s.startswith('msgstr "'):
            if current_id == "": # It's the header
                f_out.write(line.replace('"Language: en\\n"', '"Language: pt_BR\\n"'))
            else:
                f_out.write(f'msgstr "{current_id}"\n')
            current_id = None
        else:
            f_out.write(line)

print("pt-br.po generated successfully!")
