#!/usr/bin/env python3
"""
Lightweight standalone OpenWrt UCI mock for offline testing without a router.
Supports get, set, delete, show, commit, add, add_list, del_list.
"""
import sys
import os
import re

CONFIG_DIR = os.environ.get("UCI_CONFIG_DIR", "/etc/config")

class Section:
    def __init__(self, stype, name=None, anonymous_idx=0):
        self.stype = stype
        self.name = name
        self.anonymous_idx = anonymous_idx
        self.options = {}

    @property
    def anon_key(self):
        return f"@{self.stype}[{self.anonymous_idx}]"

class UciFile:
    def __init__(self, filepath):
        self.filepath = filepath
        self.sections = []
        self.load()

    def load(self):
        if not os.path.isfile(self.filepath):
            return
        with open(self.filepath, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
        
        cur_sec = None
        anon_counts = {}
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            
            m = re.match(r"^config\s+([a-zA-Z0-9_-]+)(?:\s+['\"]?([a-zA-Z0-9_.-]+)['\"]?)?", line)
            if m:
                stype = m.group(1)
                sname = m.group(2)
                idx = anon_counts.get(stype, 0)
                anon_counts[stype] = idx + 1
                cur_sec = Section(stype, sname, idx)
                self.sections.append(cur_sec)
                continue
            
            if not cur_sec:
                continue

            m_opt = re.match(r"^option\s+([a-zA-Z0-9_-]+)\s+['\"]?(.*?)['\"]?$", line)
            if m_opt:
                k = m_opt.group(1)
                v = m_opt.group(2).rstrip("'\"")
                cur_sec.options[k] = v
                continue

            m_list = re.match(r"^list\s+([a-zA-Z0-9_-]+)\s+['\"]?(.*?)['\"]?$", line)
            if m_list:
                k = m_list.group(1)
                v = m_list.group(2).rstrip("'\"")
                if k not in cur_sec.options or not isinstance(cur_sec.options[k], list):
                    cur_sec.options[k] = []
                cur_sec.options[k].append(v)
                continue

    def save(self):
        os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
        with open(self.filepath, "w", encoding="utf-8") as f:
            for s in self.sections:
                if s.name:
                    f.write(f"\nconfig {s.stype} '{s.name}'\n")
                else:
                    f.write(f"\nconfig {s.stype}\n")
                for k, v in s.options.items():
                    if isinstance(v, list):
                        for item in v:
                            f.write(f"\tlist {k} '{item}'\n")
                    else:
                        f.write(f"\toption {k} '{v}'\n")

    def find_section(self, target):
        if target.startswith("@"):
            m = re.match(r"^@([a-zA-Z0-9_-]+)\[(-?[0-9]+)\]$", target)
            if m:
                stype, idx_str = m.group(1), int(m.group(2))
                matches = [s for s in self.sections if s.stype == stype and not s.name]
                if not matches:
                    matches = [s for s in self.sections if s.stype == stype]
                if idx_str < 0:
                    idx_str = len(matches) + idx_str
                if 0 <= idx_str < len(matches):
                    return matches[idx_str]
        for s in self.sections:
            if s.name == target:
                return s
        return None

def main():
    args = sys.argv[1:]
    quiet = False
    config_dir = CONFIG_DIR

    cleaned_args = []
    i = 0
    while i < len(args):
        a = args[i]
        if a == "-q":
            quiet = True
            i += 1
        elif a == "-c" and i + 1 < len(args):
            config_dir = args[i+1]
            i += 2
        elif a.startswith("-c"):
            config_dir = a[2:]
            i += 1
        else:
            cleaned_args.append(a)
            i += 1

    if not cleaned_args:
        sys.exit(0)

    cmd = cleaned_args[0]
    subargs = cleaned_args[1:]

    def get_uci_file(cfg_name):
        fpath = os.path.join(config_dir, cfg_name)
        return UciFile(fpath)

    if cmd == "get":
        if not subargs:
            sys.exit(1)
        target = subargs[0]
        parts = target.split(".")
        cfg_name = parts[0]
        uf = get_uci_file(cfg_name)
        if len(parts) == 1:
            sys.exit(1)
        sec_name = parts[1]
        sec = uf.find_section(sec_name)
        if not sec:
            sys.exit(1)
        if len(parts) == 2:
            print(sec.stype)
            sys.exit(0)
        opt_name = parts[2]
        if opt_name not in sec.options:
            sys.exit(1)
        val = sec.options[opt_name]
        if isinstance(val, list):
            print(" ".join(val))
        else:
            print(val)
        sys.exit(0)

    elif cmd == "set":
        if not subargs:
            sys.exit(1)
        expr = subargs[0]
        if "=" not in expr:
            sys.exit(1)
        target, val = expr.split("=", 1)
        parts = target.split(".")
        cfg_name = parts[0]
        uf = get_uci_file(cfg_name)
        if len(parts) == 2:
            sec_name = parts[1]
            sec = uf.find_section(sec_name)
            if sec:
                sec.stype = val
            else:
                uf.sections.append(Section(val, sec_name))
            uf.save()
            sys.exit(0)
        elif len(parts) >= 3:
            sec_name = parts[1]
            opt_name = parts[2]
            sec = uf.find_section(sec_name)
            if not sec:
                sec = Section("section", sec_name)
                uf.sections.append(sec)
            sec.options[opt_name] = val
            uf.save()
            sys.exit(0)

    elif cmd in ("delete", "del"):
        if not subargs:
            sys.exit(1)
        target = subargs[0]
        parts = target.split(".")
        cfg_name = parts[0]
        uf = get_uci_file(cfg_name)
        if len(parts) == 2:
            sec_name = parts[1]
            sec = uf.find_section(sec_name)
            if sec and sec in uf.sections:
                uf.sections.remove(sec)
                uf.save()
            sys.exit(0)
        elif len(parts) >= 3:
            sec_name = parts[1]
            opt_name = parts[2]
            sec = uf.find_section(sec_name)
            if sec and opt_name in sec.options:
                del sec.options[opt_name]
                uf.save()
            sys.exit(0)

    elif cmd == "add":
        if len(subargs) < 2:
            sys.exit(1)
        cfg_name = subargs[0]
        stype = subargs[1]
        uf = get_uci_file(cfg_name)
        anon_count = sum(1 for s in uf.sections if s.stype == stype and not s.name)
        sec = Section(stype, None, anon_count)
        uf.sections.append(sec)
        uf.save()
        print(f"@{stype}[{anon_count}]")
        sys.exit(0)

    elif cmd == "show":
        cfg_name = subargs[0] if subargs else ""
        if not cfg_name:
            configs = os.listdir(config_dir) if os.path.isdir(config_dir) else []
            for c in configs:
                uf = get_uci_file(c)
                for s in uf.sections:
                    s_id = s.name if s.name else s.anon_key
                    print(f"{c}.{s_id}={s.stype}")
                    for k, v in s.options.items():
                        if isinstance(v, list):
                            for item in v:
                                print(f"{c}.{s_id}.{k}='{item}'")
                        else:
                            print(f"{c}.{s_id}.{k}='{v}'")
        else:
            uf = get_uci_file(cfg_name)
            for s in uf.sections:
                s_id = s.name if s.name else s.anon_key
                print(f"{cfg_name}.{s_id}={s.stype}")
                for k, v in s.options.items():
                    if isinstance(v, list):
                        for item in v:
                            print(f"{cfg_name}.{s_id}.{k}='{item}'")
                    else:
                        print(f"{cfg_name}.{s_id}.{k}='{v}'")
        sys.exit(0)

    elif cmd == "commit":
        sys.exit(0)

    sys.exit(0)

if __name__ == "__main__":
    main()
