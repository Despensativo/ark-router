# ARK Router — Orçamento de Hardware, Flash e Memória

Diretrizes e limites de recursos físicos para manter a estabilidade do ARK Router em dispositivos com restrição severa de armazenamento e memória RAM.

---

## 1. Restrições de Memória RAM
- **Dispositivos Alvo**:
  - D-Link DGL-5500: **128 MB RAM**
  - Cudy WR3000 v1 / Predator W6x: **256 MB a 1 GB RAM**
- **Margem de Segurança Operacional**:
  - Dispositivos de 128 MB: Manter no mínimo **> 80 MB de RAM livre**.
  - Dispositivos de 256 MB: Manter no mínimo **> 60 MB de RAM livre**.
- **Buffers TCP Estendidos (TCP Turbo)**:
  - O perfil de 8 MB de buffers de rede só deve ser habilitado em roteadores com 256 MB ou mais.
  - Ao desligar o TCP Turbo, todos os buffers devem ser restaurados aos valores padrão do kernel.

---

## 2. Restrições de Armazenamento SPI Flash (16 MB e Perfis de Instalação)
- **Particionamento em Dispositivos de 16 MB**:
  - A flash de 16 MB é compartilhada entre Kernel, ROM compactada SquashFS (`/rom`), calibração Wi-Fi (`factory`/`art`) e partição de escrita `/overlay` (`rootfs_data`).
  - Em uma imagem limpa de OpenWrt para dispositivos como Cudy WR3000 v1 e DGL-5500, o espaço restante em `/overlay` fica tipicamente entre **4.0 MB e 5.2 MB**.
- **Margem Mínima de `/overlay`**:
  - Manter sempre **> 1.5 MB a 2 MB livres** no `/overlay`.
  - Se o `/overlay` encher (0 blocks), o OpenWrt entra em colapso: operações de I/O falham, o cache do LuCI é corrompido e o sistema perde a capacidade de salvar configurações UCI.
- **Travas Automáticas de Armazenamento (Guardrails no `install.sh` e `Makefile preinst`)**:
  - **Perfil Full (`luci-app-ark-router-full`)**:
    - **Corte Duro:** Exige **>= 35 MB livres** no `/overlay`.
    - Rationale: O perfil Full inclui binários Go/pesados como `speedtest-go` (~24 MB) e `zerotier` (~3.5 MB). Qualquer roteador com menos de 35 MB (como roteadores com 22 MB ou 16 MB de flash) terá a instalação abortada antes da extração para proteger o sistema.
  - **Perfil Lite (`luci-app-ark-router`)**:
    - **Corte Duro (Abortar):** Exige **>= 3.5 MB livres** no `/overlay` (`LITE_MIN_OVERLAY_KB=3500`).
    - **Zona de Alerta (Warning):** Entre **3.5 MB e 6.0 MB livres** (`LITE_WARN_OVERLAY_KB=6000`).
    - Rationale: Permite que aparelhos de 16 MB (Cudy WR3000 v1 / DGL-5500 com ~4.5 MB livres) instalem o Lite com segurança (~1.8 MB de pacote), preservando a margem de respiração de > 1.5 MB para o UCI. Abaixo de 3.5 MB livres, a instalação é categoricamente impedida.
- **Diretrizes para Inclusão e Remoção de Módulos (Governança de Tamanho)**:
  - **Critério de Inclusão no Core/Lite**:
    - O módulo deve ser em Shell POSIX ou JavaScript minificado (< 150 KB).
    - Binários externos compilados (Go, Rust, C++) **NUNCA** devem ser adicionados como dependência fixa do Lite no flash. Devem rodar via RAM temporária (`/tmp`) sob demanda (ex: AdGuard Home em `/tmp` e Starlink gRPC em `/tmp`).
    - Se a soma do código descompactado do Lite ultrapassar **2.0 MB**, a constante `LITE_MIN_OVERLAY_KB` deve ser imediatamente recalculada em `scripts/install.sh`, `Makefile` (`preinst`) e `docs/PACKAGE_PROFILES.md`.
  - **Critério de Inclusão no Full**:
    - Binários volumosos devem manter a soma total dentro do teto de 35 MB de `/overlay`.
  - **Ao Remover Módulos**:
    - Atualizar a matriz de dependências em `Makefile` (`DEPENDS`), limpar conffiles órfãos e recalcular as margens de segurança.
- **Regra de Logs e Histórico**:
  - **NUNCA** gravar arquivos crescentes de log, histórico em CSV ou dumps diretamente em `/etc` ou `/root`.
  - Usar `/tmp` (RAM temporária com rotação automática).

---

## 3. Pipeline de Minificação de Assets
- **Código-Fonte em Desenvolvimento**:
  - Mantido 100% legível, estruturado, formatado e comentado em `GitHub/luci-app-ark-router/root/www/...`.
- **Compilação e Deploy**:
  - Arquivos JavaScript e CSS **devem ser minificados** via `scripts/build_minified_assets.py` (usando esbuild / terser).
  - A minificação reduz o tamanho em 60-70%, permitindo que o pacote caiba confortavelmente na ROM ou no `/overlay`.
- **Orçamento do Tema e Views**:
  - O conjunto combinado de CSS + JS do tema não deve ultrapassar **60 KB compactado**.
  - Nunca embutir bibliotecas npm pesadas ou frameworks redundantes.
