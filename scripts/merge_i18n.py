import os
import sys
import json

def escape_po(text):
    return text.replace('"', '\\"').replace('\n', '\\n')

def update_po_file(file_path, new_entries):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return
        
    with open(file_path, "a", encoding="utf-8") as f:
        for k, v in new_entries.items():
            f.write(f'msgid "{escape_po(k)}"\n')
            f.write(f'msgstr "{escape_po(v)}"\n\n')
            
    print(f"Success: Injected {len(new_entries)} keys into {file_path}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python merge_i18n.py translated_missing.json")
        sys.exit(1)
        
    json_path = sys.argv[1]
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    strings = data.get("strings", {})
    if not strings:
        print("No strings found in JSON.")
        return
        
    en_entries = {}
    es_entries = {}
    
    for pt_key, trans in strings.items():
        if trans.get("en"):
            en_entries[pt_key] = trans["en"]
        if trans.get("es"):
            es_entries[pt_key] = trans["es"]
            
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    en_file = os.path.join(repo_dir, "po", "en", "ark.po")
    es_file = os.path.join(repo_dir, "po", "es", "ark.po")
    
    if en_entries:
        update_po_file(en_file, en_entries)
    if es_entries:
        update_po_file(es_file, es_entries)

if __name__ == "__main__":
    main()
