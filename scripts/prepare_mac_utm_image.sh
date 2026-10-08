#!/usr/bin/env bash
set -e

echo "============================================="
echo " Preparando Imagem OpenWrt para UTM (macOS) "
echo "============================================="

WORK_DIR="$HOME/Downloads/OpenWrt-ARK-UTM"
IMG_URL="https://downloads.openwrt.org/releases/24.10.0/targets/x86/64/openwrt-24.10.0-x86-64-ext4-combined-efi.img.gz"
IMG_GZ="$WORK_DIR/openwrt-24.10.0-x86-64-ext4-combined-efi.img.gz"
IMG_RAW="$WORK_DIR/openwrt-24.10.0-x86-64-ext4-combined-efi.img"
IMG_RESIZED="$WORK_DIR/ark-dev-disk.img"

mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

if [ ! -f "$IMG_GZ" ]; then
    echo "[1/4] Baixando OpenWrt 24.10.0 EFI..."
    curl -# -O "$IMG_URL"
else
    echo "[1/4] Imagem já baixada."
fi

if [ ! -f "$IMG_RAW" ]; then
    echo "[2/4] Extraindo imagem..."
    gunzip -k "$IMG_GZ"
fi

echo "[3/4] Redimensionando imagem para 1GB (padrão ARK Dev)..."
cp "$IMG_RAW" "$IMG_RESIZED"
# Comando para expandir arquivo raw (DD)
dd if=/dev/zero bs=1m count=800 >> "$IMG_RESIZED"

echo "[4/4] Pronto!"
echo "============================================="
echo "O disco da VM foi gerado em: "
echo "$IMG_RESIZED"
echo ""
echo "PRÓXIMO PASSO NO APLICATIVO UTM:"
echo "1. Clique no '+' e escolha 'Virtualizar'."
echo "2. Escolha 'Outro' e marque 'Pular inicialização ISO'."
echo "3. CPU/RAM: 2 Núcleos, 512 MB."
echo "4. Em 'Armazenamento', delete o disco vazio, clique em 'Importar' e selecione o ark-dev-disk.img."
echo "5. Na tela da VM criada, vá nas configurações -> Rede -> Adicione 2 placas (1 Shared, 1 Bridged/Host-Only)."
echo "============================================="
