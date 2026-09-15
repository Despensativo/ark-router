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

## 2. Restrições de Armazenamento SPI Flash (16 MB)
- **Particionamento**:
  - A flash de 16 MB é compartilhada entre Kernel, ROM compactada SquashFS (`/rom`) e partição de escrita `/overlay` (`rootfs_data`).
- **Margem Mínima de `/overlay`**:
  - Manter sempre **> 2 MB livres** no `/overlay`.
  - Se o `/overlay` encher, o OpenWrt entra em modo de falha e perde a capacidade de salvar configurações UCI.
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
