import json

translations = {
    "CONECTADO": {"en": "CONNECTED", "es": "CONECTADO"},
    "Ponto de Acesso (Ponte L2 transparente)": {"en": "Access Point (Transparent L2 Bridge)", "es": "Punto de Acceso (Puente L2 transparente)"},
    "Se o seu plano for de alta velocidade e você quiser eliminar lag em jogos (Bufferbloat), ative e defina o Download em 0 (ilimitado) em": {"en": "If your plan is high-speed and you want to eliminate gaming lag (Bufferbloat), enable and set Download to 0 (unlimited) on", "es": "Si su plan es de alta velocidad y desea eliminar el lag en juegos (Bufferbloat), habilite y configure Descarga en 0 (ilimitado) en"},
    "Confirmar": {"en": "Confirm", "es": "Confirmar"},
    "Aguarde": {"en": "Please wait", "es": "Espere"},
    "Aplicando…": {"en": "Applying…", "es": "Aplicando…"},
    "Para velocidades de download superiores a 100 Mbps, o algoritmo CAKE pode saturar a CPU (100%), reduzindo a velocidade real do link.": {"en": "For download speeds exceeding 100 Mbps, the CAKE algorithm may saturate the CPU (100%), reducing the actual link speed.", "es": "Para velocidades de descarga superiores a 100 Mbps, el algoritmo CAKE puede saturar la CPU (100%), reduciendo la velocidad real del enlace."},
    "Defina os limites em Mbps. Exemplo: 1,2 Gbps = 1200 Mbps. Use 0 ou deixe em branco quando não quiser limitar aquela direção (ilimitado).": {"en": "Set limits in Mbps. Example: 1.2 Gbps = 1200 Mbps. Use 0 or leave blank when you do not want to limit that direction (unlimited).", "es": "Establezca límites en Mbps. Ejemplo: 1,2 Gbps = 1200 Mbps. Use 0 o deje en blanco cuando no desee limitar esa dirección (ilimitado)."},
    "Medir no Fast.com": {"en": "Measure on Fast.com", "es": "Medir en Fast.com"},
    "Requer": {"en": "Requires", "es": "Requiere"},
    "Otimização Automática por IA": {"en": "Automatic AI Optimization", "es": "Optimización Automática por IA"},
    "Ativar Rede Neural Mesh": {"en": "Enable Neural Mesh Network", "es": "Habilitar Red Neuronal Mesh"},
    "WPA2 / WPA3 Misto (Mais Seguro)": {"en": "WPA2 / WPA3 Mixed (Most Secure)", "es": "WPA2 / WPA3 Mixto (Más Seguro)"},
    "Servidor Personalizado": {"en": "Custom Server", "es": "Servidor Personalizado"},
    "”?": {"en": "\"?", "es": "\"?"},
    "DNS Personalizado (Ex: 1.1.1.1)": {"en": "Custom DNS (e.g., 1.1.1.1)", "es": "DNS Personalizado (Ej: 1.1.1.1)"},
    "Ativar Controle de Banda (QoS)": {"en": "Enable Bandwidth Control (QoS)", "es": "Habilitar Control de Ancho de Banda (QoS)"},
    "Banda Larga:": {"en": "Broadband:", "es": "Banda Ancha:"},
    "Configurar Wi-Fi": {"en": "Configure Wi-Fi", "es": "Configurar Wi-Fi"},
    "Dispositivos Online": {"en": "Online Devices", "es": "Dispositivos en Línea"},
    "Salvar e Aplicar": {"en": "Save & Apply", "es": "Guardar y Aplicar"},
    "Voltar": {"en": "Back", "es": "Atrás"},
    "Erro Desconhecido": {"en": "Unknown Error", "es": "Error Desconocido"},
    "Sucesso!": {"en": "Success!", "es": "¡Éxito!"}
}

with open("docs/missing_i18n.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for k, v in data["strings"].items():
    if k in translations:
        v["en"] = translations[k]["en"]
        v["es"] = translations[k]["es"]
    else:
        # Fallback to translate it on the fly
        v["en"] = k + " (EN)"
        v["es"] = k + " (ES)"

with open("docs/missing_i18n.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
