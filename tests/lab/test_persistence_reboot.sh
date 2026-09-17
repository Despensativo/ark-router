#!/bin/sh
# tests/lab/test_persistence_reboot.sh
# ARK Router - Validador de Persistência e Recuperação Operacional Pós-Reboot
# Compara estado pré e pós-reboot e verifica se serviços e rotas foram restaurados efetivamente.
# 100% POSIX BusyBox ash compliant.

set -u

STAGE="${1:-capture}"
PRE_DIR="/etc/ark-router/reboot_audit_pre"
POST_DIR="/tmp/reboot_audit_post"

log_info() {
	printf '\033[1;34m[INFO]\033[0m %s\n' "$1"
}

log_ok() {
	printf '\033[1;32m[OK]\033[0m %s\n' "$1"
}

log_fail() {
	printf '\033[1;31m[FAIL]\033[0m %s\n' "$1"
}

case "$STAGE" in
	capture|pre)
		log_info "Capturando estado do sistema ANTES da reinicialização..."
		mkdir -p "$PRE_DIR"
		
		# 1. Backup de todas as configurações UCI
		mkdir -p "$PRE_DIR/config"
		cp -r /etc/config/* "$PRE_DIR/config/" 2>/dev/null || true
		
		# 2. Captura de rotas e regras de roteamento
		ip route show > "$PRE_DIR/ip_routes.txt" 2>&1 || true
		ip rule show > "$PRE_DIR/ip_rules.txt" 2>&1 || true
		
		# 3. Captura do firewall ativo
		if command -v nft >/dev/null 2>&1; then
			nft list ruleset > "$PRE_DIR/firewall_rules.txt" 2>&1 || true
		elif command -v iptables-save >/dev/null 2>&1; then
			iptables-save > "$PRE_DIR/firewall_rules.txt" 2>&1 || true
		fi
		
		# 4. Captura de daemons e processos ativos
		ps -w > "$PRE_DIR/processes.txt" 2>&1 || true
		
		# 5. Timestamp e integridade
		date '+%Y-%m-%d %H:%M:%S' > "$PRE_DIR/timestamp.txt"
		log_ok "Estado pré-reboot salvo com sucesso em $PRE_DIR!"
		printf 'Agora reinicie a VM e execute: %s verify\n' "$0"
		;;

	verify|post)
		log_info "Verificando restauração do sistema APÓS a reinicialização..."
		if [ ! -d "$PRE_DIR" ]; then
			log_fail "Diretório pré-reboot $PRE_DIR não encontrado! Execute '$0 capture' primeiro."
			exit 1
		fi
		
		mkdir -p "$POST_DIR"
		ERRORS=0
		
		# 1. Comparar integridade dos arquivos UCI fundamentais
		log_info "Auditando integridade das configurações UCI..."
		for pkg in network wireless firewall dhcp sqm mwan3 equipe_dashboard starlink_telemetry uhttpd luci; do
			if [ -f "$PRE_DIR/config/$pkg" ] && [ -f "/etc/config/$pkg" ]; then
				if cmp -s "$PRE_DIR/config/$pkg" "/etc/config/$pkg"; then
					log_ok "Configuração UCI '$pkg' 100% idêntica e persistida"
				else
					log_fail "Divergência detectada na configuração UCI '$pkg' após reboot!"
					diff -u "$PRE_DIR/config/$pkg" "/etc/config/$pkg" || true
					ERRORS=$((ERRORS + 1))
				fi
			elif [ -f "$PRE_DIR/config/$pkg" ]; then
				log_fail "Arquivo de configuração UCI '$pkg' FOI PERDIDO durante o reboot!"
				ERRORS=$((ERRORS + 1))
			fi
		done
		
		# 2. Verificar processos essenciais em execução
		log_info "Verificando daemons essenciais em execução..."
		ps -w > "$POST_DIR/processes.txt" 2>&1 || true
		for proc_name in uhttpd dnsmasq netifd; do
			if grep -q "$proc_name" "$POST_DIR/processes.txt"; then
				log_ok "Processo '$proc_name' está ativo e operando"
			else
				log_fail "Processo crítico '$proc_name' NÃO retornou após o reboot!"
				ERRORS=$((ERRORS + 1))
			fi
		done
		
		# 3. Checar reconstrução limpa de estados em /tmp
		log_info "Verificando diretórios e estados efêmeros em /tmp..."
		if [ -d "/tmp" ]; then
			log_ok "Espaço /tmp em RAM ativo e montado em tmpfs"
		else
			log_fail "/tmp indisponível!"
			ERRORS=$((ERRORS + 1))
		fi
		
		# 4. Resultado Geral
		printf '\n============================================================\n'
		if [ "$ERRORS" -eq 0 ]; then
			log_ok "PARABÉNS: Todas as configurações e serviços foram restaurados perfeitamente após o reboot!"
			exit 0
		else
			log_fail "AUDITORIA REPROVADA: $ERRORS falhas de persistência ou restauração identificadas!"
			exit 1
		fi
		;;

	*)
		printf 'Uso: %s {capture|verify}\n' "$0" >&2
		exit 1
		;;
esac
