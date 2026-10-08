import os
import re
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
I18N_DIR = os.path.join(REPO_DIR, "src", "core", "i18n")
PO_DIR = os.path.join(REPO_DIR, "po")

def escape_po(text):
    return text.replace('"', '\\"').replace('\n', '\\n')

def js_to_dict(file_path, dict_name):
    if not os.path.exists(file_path):
        return {}
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    match = re.search(r'window\.' + dict_name + r'\s*=\s*(\{[\s\S]*?\n\s*\});?', content)
    if not match:
        match = re.search(r'const\s+' + dict_name.split('_')[-1] + r'\s*=\s*(\{[\s\S]*?\n\};)', content)
    if not match:
        return {}
    
    json_str = match.group(1)
    # Safely extract key: value via regex (naive but works for their format)
    # The format is "Key": "Value",
    d = {}
    pattern = r'^\s*"([^"]+)"\s*:\s*"([^"]+)",?$'
    for line in json_str.split('\n'):
        m = re.match(pattern, line.strip('\r\n'))
        if m:
            d[m.group(1)] = m.group(2)
        else:
            # handle case with escaped quotes inside
            m2 = re.match(r'^\s*"(.*)"\s*:\s*"(.*)",?$', line.strip('\r\n'))
            if m2 and not m2.group(1).startswith('//'):
                d[m2.group(1)] = m2.group(2)
    return d

def write_po(entries, lang, out_path):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f'msgid ""\n')
        f.write(f'msgstr ""\n')
        f.write(f'"Project-Id-Version: ARK Router\\n"\n')
        f.write(f'"Language: {lang}\\n"\n')
        f.write(f'"MIME-Version: 1.0\\n"\n')
        f.write(f'"Content-Type: text/plain; charset=UTF-8\\n"\n')
        f.write(f'"Content-Transfer-Encoding: 8bit\\n"\n\n')
        
        for k, v in sorted(entries.items()):
            f.write(f'msgid "{escape_po(k)}"\n')
            f.write(f'msgstr "{escape_po(v)}"\n\n')

en_dict = js_to_dict(os.path.join(I18N_DIR, "en.js"), "ARK_I18N_EN")
es_dict = js_to_dict(os.path.join(I18N_DIR, "es.js"), "ARK_I18N_ES")

write_po(en_dict, "en", os.path.join(PO_DIR, "en", "ark.po"))
write_po(es_dict, "es", os.path.join(PO_DIR, "es", "ark.po"))

print(f"Migrated {len(en_dict)} EN keys and {len(es_dict)} ES keys to .po format!")
