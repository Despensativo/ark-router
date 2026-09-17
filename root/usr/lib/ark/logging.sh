#!/bin/sh
# /usr/lib/ark/logging.sh - ARK Router Safe Logging & Credential Masking
# Automatically sanitizes passwords, tokens, full MACs and sensitive info.

[ -z "${_ARK_LOGGING_SH_LOADED:-}" ] || return 0
_ARK_LOGGING_SH_LOADED=1

ark_mask_sensitive() {
	sed -E \
		-e 's/(password|key|token|auth|secret|preshared_key|pass|wifi_key)[=:][[:space:]]*[^ ,;"]+/\1=[REDACTED]/gI' \
		-e 's/([0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}):[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}/\1:**:**:**/g' \
		-e 's/(loid_pass|gpon_sn)[=:][[:space:]]*[^ ,;"]+/\1=[REDACTED]/gI'
}

ark_log() {
	_msg="$(printf '%s' "$*" | ark_mask_sensitive)"
	logger -t "ark-router[$$]" -p user.info "$_msg" 2>/dev/null || true
}

ark_warn() {
	_msg="$(printf '%s' "$*" | ark_mask_sensitive)"
	logger -t "ark-router[$$]" -p user.warning "$_msg" 2>/dev/null || true
	printf '[AVISO] %s\n' "$_msg" >&2
}

ark_err() {
	_msg="$(printf '%s' "$*" | ark_mask_sensitive)"
	logger -t "ark-router[$$]" -p user.err "$_msg" 2>/dev/null || true
	printf '[ERRO] %s\n' "$_msg" >&2
}

ark_audit() {
	_level="${1:-INFO}"
	shift
	_msg="$(printf '%s' "$*" | ark_mask_sensitive)"
	logger -t "ark-audit[$$]" -p user.notice "[$_level] $_msg" 2>/dev/null || true
}
