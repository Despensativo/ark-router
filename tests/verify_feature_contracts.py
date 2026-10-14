#!/usr/bin/env python3
"""
ARK Router: Feature Contract and Living Audit Verifier
Validates tests/feature_contracts.yaml, detects divergences, orphans,
missing ACLs, and verifies documentation synchronization in docs/FEATURE_AUDIT_AND_REBOOT.md.
Strictly POSIX and embedded compliant. Max file size < 4000 lines.
"""

import os
import sys
import json
try:
    import yaml
except ImportError:
    yaml = None

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CONTRACTS_FILE = os.path.join(REPO_DIR, "tests", "feature_contracts.yaml")
AUDIT_DOC = os.path.join(REPO_DIR, "docs", "FEATURE_AUDIT_AND_REBOOT.md")
ACL_FILE = os.path.join(REPO_DIR, "root", "usr", "share", "rpcd", "acl.d", "luci-app-equipe-dashboard.json")

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

REQUIRED_KEYS = [
    "id", "name", "purpose", "state", "files", "actions",
    "rpc_endpoints", "acls", "dependencies", "uci_configs",
    "services", "persistent_data", "temp_data", "boot_behavior",
    "can_modify", "cannot_modify", "relations", "hw_limitations",
    "openwrt_limitations", "profiles", "version", "tests", "real_hw_required"
]

VALID_STATES = [
    "planejado", "implementado", "experimental", "funcional",
    "parcial", "corrigido", "obsoleto", "removido", "simulado",
    "dependente de hardware real"
]

def load_acl_packages():
    if not os.path.isfile(ACL_FILE):
        return set()
    with open(ACL_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    pkgs = set()
    app_data = data.get("luci-app-equipe-dashboard", {})
    for section in ["read", "write"]:
        uci_list = app_data.get(section, {}).get("uci", [])
        for p in uci_list:
            pkgs.add(p)
    return pkgs

def parse_contracts_yaml_fallback(text):
    """Zero-dependency YAML subset parser for tests/feature_contracts.yaml when PyYAML is absent."""
    metadata = {}
    features = []
    mode = None
    cur_feat = None
    cur_key = None
    cur_uci = None

    def parse_scalar(val):
        val = val.strip()
        if val == "[]":
            return []
        if val in ("true", "True"):
            return True
        if val in ("false", "False"):
            return False
        if (val.startswith("'") and val.endswith("'")) or (val.startswith('"') and val.endswith('"')):
            return val[1:-1].replace("''", "'")
        if val.isdigit():
            return int(val)
        return val

    for raw_line in text.splitlines():
        line = raw_line.rstrip("\r")
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line == "metadata:":
            mode = "metadata"
            continue
        if line == "features:":
            mode = "features"
            continue

        if mode == "metadata":
            if line.startswith("  ") and ":" in line:
                k, v = line.strip().split(":", 1)
                metadata[k.strip()] = parse_scalar(v)
            continue

        if mode == "features":
            if line.startswith("- id:"):
                if cur_feat is not None:
                    features.append(cur_feat)
                cur_feat = {"id": parse_scalar(line.split(":", 1)[1])}
                cur_key = "id"
                cur_uci = None
            elif line.startswith("  ") and not line.startswith("    ") and not line.startswith("  - "):
                if ":" in line:
                    k, v = line.strip().split(":", 1)
                    k = k.strip()
                    v_str = v.strip()
                    cur_key = k
                    cur_uci = None
                    if v_str == "":
                        cur_feat[k] = []
                    else:
                        cur_feat[k] = parse_scalar(v_str)
            elif line.startswith("  - "):
                item_str = line[4:].strip()
                if cur_key == "uci_configs" and item_str.startswith("package:"):
                    pkg_val = parse_scalar(item_str.split(":", 1)[1])
                    cur_uci = {"package": pkg_val, "sections": []}
                    if not isinstance(cur_feat.get(cur_key), list):
                        cur_feat[cur_key] = []
                    cur_feat[cur_key].append(cur_uci)
                else:
                    if not isinstance(cur_feat.get(cur_key), list):
                        cur_feat[cur_key] = []
                    cur_feat[cur_key].append(parse_scalar(item_str))
            elif line.startswith("    "):
                sub = line.strip()
                if cur_key == "uci_configs" and cur_uci is not None:
                    if sub == "sections:":
                        pass
                    elif sub.startswith("- "):
                        cur_uci["sections"].append(parse_scalar(sub[2:]))
                elif cur_key and isinstance(cur_feat.get(cur_key), str):
                    cur_feat[cur_key] = cur_feat[cur_key] + " " + sub

    if cur_feat is not None:
        features.append(cur_feat)

    return {"metadata": metadata, "features": features}


def load_contracts_data(path):
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()
    if yaml is not None:
        return yaml.safe_load(raw)
    return parse_contracts_yaml_fallback(raw)


def validate_contract_objects(contracts, acl_packages, doc_content=""):
    errors = []
    warnings = []
    seen_ids = set()

    meta = contracts.get("metadata", {})
    features = contracts.get("features", [])

    canon_repo = str(meta.get("canonical_repo", ""))
    if ":/" in canon_repo or canon_repo.startswith("/Users/"):
        errors.append(f"[metadata] canonical_repo contém caminho absoluto de máquina: '{canon_repo}'")
    declared_total = meta.get("total_features")
    if declared_total is not None and int(declared_total) != len(features):
        errors.append(f"[metadata] total_features ({declared_total}) diverge de len(features) ({len(features)}).")

    for idx, feat in enumerate(features, 1):
        f_id = feat.get("id")
        if not f_id:
            errors.append(f"[Item {idx}] Funcionalidade sem 'id'.")
            continue
        if f_id in seen_ids:
            errors.append(f"[{f_id}] ID duplicado no catálogo.")
        seen_ids.add(f_id)

    for feat in features:
        f_id = feat.get("id")
        if not f_id:
            continue

        # 1. Checar todas as 23 chaves obrigatórias
        for key in REQUIRED_KEYS:
            if key not in feat:
                errors.append(f"[{f_id}] Chave obrigatória ausente: '{key}'.")

        # 2. Checar estado permitido
        state = feat.get("state")
        if state not in VALID_STATES:
            errors.append(f"[{f_id}] Estado inválido '{state}'. Deve ser um dos: {VALID_STATES}")

        # 2b. Semântica de tipos e listas não vazias (Lote 001)
        files_list = feat.get("files")
        if not isinstance(files_list, list) or len(files_list) == 0:
            errors.append(f"[{f_id}] Propriedade 'files' deve ser uma lista não vazia.")
        profiles_list = feat.get("profiles")
        if not isinstance(profiles_list, list) or not profiles_list or not set(profiles_list).issubset({"lite", "full"}):
            errors.append(f"[{f_id}] Propriedade 'profiles' inválida: {profiles_list}")
        if not isinstance(feat.get("real_hw_required"), bool):
            errors.append(f"[{f_id}] Propriedade 'real_hw_required' deve ser booleana.")

        # 2c. Integridade relacional (relations devem apontar para IDs existentes)
        for rel_id in feat.get("relations", []):
            if rel_id not in seen_ids:
                errors.append(f"[{f_id}] Relação órfã aponta para ID inexistente: '{rel_id}'.")

        # 3. Checar existência dos arquivos no repositório
        for rel_file in feat.get("files", []) if isinstance(files_list, list) else []:
            full_path = os.path.join(REPO_DIR, rel_file)
            if not os.path.exists(full_path):
                alt_path = os.path.join(REPO_DIR, "root", rel_file)
                if not os.path.exists(alt_path):
                    errors.append(f"[{f_id}] Arquivo não encontrado no repositório: {rel_file}")

        # 4. Checar pacotes UCI declarados contra ACL do rpcd
        for uci_item in feat.get("uci_configs", []):
            pkg = uci_item.get("package") if isinstance(uci_item, dict) else uci_item
            if pkg and pkg not in acl_packages:
                if pkg not in ["system", "uhttpd", "nlbwmon", "upnpd", "adblock", "zerotier", "usteer"]:
                    warnings.append(f"[{f_id}] Pacote UCI '{pkg}' não listado na ACL luci-app-equipe-dashboard.")

        # 5. Checar presença no documento Markdown
        if doc_content and f_id not in doc_content:
            errors.append(f"[{f_id}] Funcionalidade ausente no documento {AUDIT_DOC}.")

    return seen_ids, errors, warnings


def run_negative_self_tests(acl_packages):
    """Testes negativos de esquema do Lote 001 para garantir detecção de contratos inválidos."""
    bad_contract = {
        "metadata": {"version": "1.5.17", "total_features": 2, "canonical_repo": "C:/Users/Test"},
        "features": [{
            "id": "ARK-BAD-001",
            "name": "Contrato Inválido",
            "purpose": "Teste negativo",
            "state": "estado_inexistente",
            "files": ["arquivo/inexistente.sh"],
            "actions": [],
            "rpc_endpoints": [],
            "acls": [],
            "dependencies": [],
            "uci_configs": [],
            "services": [],
            "persistent_data": [],
            "temp_data": [],
            "boot_behavior": "N/A",
            "can_modify": [],
            "cannot_modify": [],
            "relations": ["ARK-GHOST-999"],
            "hw_limitations": "N/A",
            "openwrt_limitations": "N/A",
            "profiles": ["invalid_profile"],
            "version": "1.5.17",
            "tests": [],
            "real_hw_required": "nao_booleano"
        }]
    }
    _, neg_errors, _ = validate_contract_objects(bad_contract, acl_packages, "")
    expected_triggers = [
        "canonical_repo",
        "total_features",
        "Estado inválido",
        "profiles",
        "real_hw_required",
        "Relação órfã",
        "Arquivo não encontrado"
    ]
    for trig in expected_triggers:
        if not any(trig in e for e in neg_errors):
            return False, f"Teste negativo falhou em detectar '{trig}'"
    return True, "OK"


def verify_contracts():
    print("============================================================")
    print("      ARK ROUTER: AUDITORIA DE CONTRATOS E DIVERGÊNCIAS      ")
    print("============================================================")

    if not os.path.isfile(CONTRACTS_FILE):
        print(f"[ERRO FATAL] Arquivo de contratos não encontrado: {CONTRACTS_FILE}", file=sys.stderr)
        return False

    try:
        contracts = load_contracts_data(CONTRACTS_FILE)
    except Exception as e:
        print(f"[ERRO FATAL] Erro ao carregar YAML: {e}", file=sys.stderr)
        return False

    features = contracts.get("features", [])
    parser_mode = "PyYAML" if yaml is not None else "Fallback Nativo Zero-Dep"
    print(f"Total de funcionalidades registradas: {len(features)} (Parser: {parser_mode})")

    acl_packages = load_acl_packages()
    doc_content = ""
    if os.path.isfile(AUDIT_DOC):
        with open(AUDIT_DOC, "r", encoding="utf-8") as df:
            doc_content = df.read()

    seen_ids, errors, warnings = validate_contract_objects(contracts, acl_packages, doc_content)
    neg_ok, neg_msg = run_negative_self_tests(acl_packages)
    if not neg_ok:
        errors.append(f"[SELF-TEST LOTE 001] {neg_msg}")

    print(f"\n[1/4] Validação de Estrutura e Semântica: {len(seen_ids)} IDs verificados.")
    if errors:
        print(f"\n[FALHA] Encontrados {len(errors)} erros nos contratos:")
        for err in errors[:20]:
            print(f"  [FAIL] {err}")
        if len(errors) > 20:
            print(f"  ... e mais {len(errors) - 20} erros.")
        return False
    else:
        print(f"  [OK] Todos os {len(seen_ids)} contratos possuem as 23 propriedades, tipos válidos e relações íntegras!")

    print("\n[2/4] Testes Negativos de Esquema (Lote 001):")
    print("  [OK] 7/7 gatilhos de rejeição (estado, tipos, relação órfã, caminho de máquina e arquivo ausente) validados!")

    print("\n[3/4] Auditoria de Divergências e Orfandade:")
    if warnings:
        print(f"  [INFO] {len(warnings)} avisos informativos:")
        for w in warnings[:10]:
            print(f"    - {w}")
    else:
        print("  [OK] Zero divergências entre código, ACLs e catálogo!")

    print("\n[4/4] Sincronismo com a Documentação Viva:")
    if doc_content:
        print(f"  [OK] Todos os {len(seen_ids)} IDs estão formalmente documentados em docs/FEATURE_AUDIT_AND_REBOOT.md!")
    else:
        print("  [INFO] Documentação docs/FEATURE_AUDIT_AND_REBOOT.md será sincronizada na etapa seguinte.")

    print("============================================================")
    print("      CONTRATOS AUDITADOS E VALIDADOS COM SUCESSO!           ")
    print("============================================================")
    return True

if __name__ == "__main__":
    success = verify_contracts()
    sys.exit(0 if success else 1)
