#!/bin/sh
# /usr/lib/ark/led.sh - ARK Router Smart LED Hardware Abstraction Layer (HAL)
# 100% POSIX /bin/ash compliant for OpenWrt 19.07 through 25.12+
#
# Features:
# 1. Automatic Topology Detection (I2C Matrix vs Direct PHY vs GPIO)
# 2. Hardware Silicon Breathing Calibration (0% CPU, 50 50 hex curve, GE1 bit)
# 3. Global Trigger Collision Protection (echo none > trigger on matrix root node)
# 4. Universal Effect Engine (zones: top, front, ports, all; effects: solid, breathe, blink, off)
# 5. Full UCI & Preset Governance (smart, night, alert, custom/gamer)

[ -z "${_ARK_LED_SH_LOADED:-}" ] || return 0
_ARK_LED_SH_LOADED=1

[ -n "${ARK_LIB_DIR:-}" ] || ARK_LIB_DIR="/usr/lib/ark"
if [ -f "${ARK_LIB_DIR}/common.sh" ] && ! command -v json_escape >/dev/null 2>&1; then
	. "${ARK_LIB_DIR}/common.sh"
fi

# Topology Constants
TOPOLOGY_I2C_MATRIX="TOPOLOGY_I2C_MATRIX"
TOPOLOGY_DIRECT_PHY="TOPOLOGY_DIRECT_PHY"
TOPOLOGY_GPIO="TOPOLOGY_GPIO"

_get_led_sys() {
	if [ -n "${ARK_ROOT}" ] && [ -d "${ARK_ROOT}/sys/class/leds" ]; then
		printf '%s' "${ARK_ROOT}/sys/class/leds"
	else
		printf '/sys/class/leds'
	fi
}

_get_net_sys() {
	if [ -n "${ARK_ROOT}" ] && [ -d "${ARK_ROOT}/sys/class/net" ]; then
		printf '%s' "${ARK_ROOT}/sys/class/net"
	else
		printf '/sys/class/net'
	fi
}

# Normaliza cores HEX ou nomes padrão para formato RRGGBB e #RRGGBB
ark_led_normalize_hex() {
	local raw="${1:-#00FF00}"
	local clean="$(printf '%s' "$raw" | tr 'A-Z' 'a-z' | tr -d '#, ')"

	r_val=0; g_val=255; b_val=0
	hex_display="#00FF00"
	clean_hex="00ff00"

	case "$clean" in
		green|verde)
			r_val=0; g_val=255; b_val=0; hex_display="#00FF00"; clean_hex="00ff00" ;;
		red|vermelho)
			r_val=255; g_val=0; b_val=0; hex_display="#FF0000"; clean_hex="ff0000" ;;
		blue|azul)
			r_val=0; g_val=0; b_val=255; hex_display="#0000FF"; clean_hex="0000ff" ;;
		cyan|ciano)
			r_val=0; g_val=229; b_val=255; hex_display="#00E5FF"; clean_hex="00e5ff" ;;
		purple|roxo|magenta)
			r_val=139; g_val=92; b_val=246; hex_display="#8B5CF6"; clean_hex="8b5cf6" ;;
		yellow|amarelo|amber|ambar)
			r_val=245; g_val=158; b_val=11; hex_display="#F59E0B"; clean_hex="f59e0b" ;;
		white|branco)
			r_val=255; g_val=255; b_val=255; hex_display="#FFFFFF"; clean_hex="ffffff" ;;
		orange|laranja)
			r_val=255; g_val=128; b_val=0; hex_display="#FF8000"; clean_hex="ff8000" ;;
		pink|rosa)
			r_val=236; g_val=72; b_val=153; hex_display="#EC4899"; clean_hex="ec4899" ;;
		[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f])
			clean_hex="$clean"
			hex_display="#$(printf '%s' "$clean" | tr 'a-z' 'A-Z')"
			local r_hex="$(printf '%s' "$clean" | cut -c1-2)"
			local g_hex="$(printf '%s' "$clean" | cut -c3-4)"
			local b_hex="$(printf '%s' "$clean" | cut -c5-6)"
			r_val="$(printf '%d' "0x$r_hex" 2>/dev/null || echo 0)"
			g_val="$(printf '%d' "0x$g_hex" 2>/dev/null || echo 0)"
			b_val="$(printf '%d' "0x$b_hex" 2>/dev/null || echo 0)"
			;;
		*)
			clean_hex="00ff00"
			hex_display="#00FF00"
			r_val=0; g_val=255; b_val=0
			;;
	esac

	[ "$r_val" -gt 255 ] && r_val=255; [ "$r_val" -lt 0 ] && r_val=0
	[ "$g_val" -gt 255 ] && g_val=255; [ "$g_val" -lt 0 ] && g_val=0
	[ "$b_val" -gt 255 ] && b_val=255; [ "$b_val" -lt 0 ] && b_val=0
}

# 1. Detecta e classifica a topologia de hardware de LEDs
ark_led_detect_topology() {
	local led_base="$(_get_led_sys)"

	# A. Checagem de Controlador Matricial I2C/SPI Multi-Canal
	if [ -d "$led_base/aw21018_led" ] || [ -d "/sys/bus/i2c/drivers/aw21018" ]; then
		ARK_LED_TOPOLOGY="$TOPOLOGY_I2C_MATRIX"
		ARK_LED_I2C_CHIP="aw21018"
		ARK_LED_I2C_NODE="$led_base/aw21018_led"
		printf '%s\n' "$TOPOLOGY_I2C_MATRIX"
		return 0
	fi

	for p in "$led_base"/pca96* "$led_base"/pca95* "$led_base"/lp55*; do
		if [ -d "$p" ]; then
			ARK_LED_TOPOLOGY="$TOPOLOGY_I2C_MATRIX"
			ARK_LED_I2C_CHIP="$(basename "$p")"
			ARK_LED_I2C_NODE="$p"
			printf '%s\n' "$TOPOLOGY_I2C_MATRIX"
			return 0
		fi
	done

	# B. Checagem de LEDs individuais de portas RJ45 no sysfs
	local port_led_count=0
	for l in "$led_base"/*lan* "$led_base"/*port* "$led_base"/*ethernet*; do
		[ -d "$l" ] || continue
		local b="$(basename "$l")"
		case "$b" in
			*wlan*|*wlan2*|*wlan5*|*wlan6*|*planet*|*internet*) continue ;;
			*) port_led_count=$((port_led_count + 1)) ;;
		esac
	done

	# C. Classificação
	if [ "$port_led_count" -gt 0 ]; then
		# Roteadores tradicionais com LEDs GPIO por porta (Cudy WR3000, D-Link DGL-5500, etc.)
		ARK_LED_TOPOLOGY="$TOPOLOGY_GPIO"
		ARK_LED_I2C_CHIP="none"
		ARK_LED_I2C_NODE=""
		printf '%s\n' "$TOPOLOGY_GPIO"
		return 0
	else
		# Roteadores modernos com LEDs de portas acionados direto pelo switch PHY ou blindados (ex: Acer W6x)
		ARK_LED_TOPOLOGY="$TOPOLOGY_DIRECT_PHY"
		ARK_LED_I2C_CHIP="none"
		ARK_LED_I2C_NODE=""
		printf '%s\n' "$TOPOLOGY_DIRECT_PHY"
		return 0
	fi
}

# 2. Calibra curvas de hardware e previne colisão de triggers
ark_led_calibrate_curves() {
	local led_base="$(_get_led_sys)"
	local aw_node="$led_base/aw21018_led"

	if [ -d "$aw_node" ]; then
		# Regra de Ouro: Desativa triggers nativos no nó raiz para evitar o piscar em broadcast
		echo none > "$aw_node/trigger" 2>/dev/null || true

		# Desativa o daemon de fábrica ledd para evitar conflito de iluminação
		if [ -x /etc/init.d/ledd ]; then
			/etc/init.d/ledd stop >/dev/null 2>&1 || true
			/etc/init.d/ledd disable >/dev/null 2>&1 || true
		fi

		# Calibra curvas de respiração e blink conforme a velocidade configurada (UCI system.led_status.speed)
		local spd="$(uci -q get system.led_status.speed || echo normal)"
		case "$spd" in
			slow)
				echo "80 80" > "$aw_node/breath_time" 2>/dev/null || true
				echo "200 200" > "$aw_node/blink_time" 2>/dev/null || true
				;;
			fast)
				echo "20 20" > "$aw_node/breath_time" 2>/dev/null || true
				echo "50 50" > "$aw_node/blink_time" 2>/dev/null || true
				;;
			*)
				echo "50 50" > "$aw_node/breath_time" 2>/dev/null || true
				echo "100 100" > "$aw_node/blink_time" 2>/dev/null || true
				;;
		esac

		# Inicializa daemon inteligente de portas ark-port-ledd se disponível
		if [ -x /etc/init.d/ark-port-ledd ]; then
			/etc/init.d/ark-port-ledd enable >/dev/null 2>&1 || true
			/etc/init.d/ark-port-ledd start >/dev/null 2>&1 || true
		fi
	fi
	return 0
}

# 2.1 Configura a velocidade de animação / pulso (slow, normal, fast)
ark_led_set_speed() {
	local speed="${1:-normal}"
	case "$speed" in
		slow|lenta) speed="slow" ;;
		fast|rapida) speed="fast" ;;
		*) speed="normal" ;;
	esac

	[ -n "$(uci -q get system.led_status)" ] || uci -q set system.led_status=led
	uci -q set "system.led_status.speed=$speed"
	uci commit system 2>/dev/null || true

	ark_led_calibrate_curves

	local cur_eff="$(uci -q get system.led_status.effect || echo 'breathe')"
	if [ "$cur_eff" = "rainbow" ]; then
		ark_led_start_rainbow "$speed"
	fi

	printf '{"success":true,"speed":"%s"}\n' "$speed"
	return 0
}

# 2.2 Gerenciamento do daemon de espectro fluido Arco-Íris (Rainbow)
ark_led_start_rainbow() {
	local speed="${1:-normal}"

	[ -n "$(uci -q get system.led_status)" ] || uci -q set system.led_status=led
	uci -q set "system.led_status.effect=rainbow"
	uci -q set "system.led_status.preset=custom"
	uci -q set "system.led_status.enabled=1"
	[ -n "$speed" ] && uci -q set "system.led_status.speed=$speed"
	uci commit system 2>/dev/null || true

	if [ -x /etc/init.d/ark-rainbowd ]; then
		/etc/init.d/ark-rainbowd enable >/dev/null 2>&1 || true
		/etc/init.d/ark-rainbowd stop >/dev/null 2>&1 || true
		/etc/init.d/ark-rainbowd start >/dev/null 2>&1 || true
	fi
	if ! pgrep -f "ark-rainbowd" >/dev/null 2>&1 && [ -x /usr/sbin/ark-rainbowd ]; then
		/bin/sh /usr/sbin/ark-rainbowd >/dev/null 2>&1 &
	fi
}

ark_led_stop_rainbow() {
	if [ -x /etc/init.d/ark-rainbowd ]; then
		/etc/init.d/ark-rainbowd stop >/dev/null 2>&1 || true
	fi
	killall ark-rainbowd 2>/dev/null || true
	pkill -f "ark-rainbowd" 2>/dev/null || true
}

# 3. Aplica efeitos padronizados por zona e topologia
ark_led_set_effect() {
	local zone="${1:-all}"      # top, front, ports, all
	local color="${2:-00ff00}"  # hex ou nome da cor
	local effect="${3:-solid}"  # solid, breathe, blink, rainbow, off
	local speed="${4:-}"
	[ -n "$speed" ] || speed="$(uci -q get system.led_status.speed || echo normal)"

	if [ "$effect" = "rainbow" ]; then
		ark_led_start_rainbow "$speed"
		local topology="$(ark_led_detect_topology)"
		printf '{"success":true,"zone":"%s","color":"rainbow","effect":"rainbow","speed":"%s","topology":"%s"}\n' \
			"$zone" "$speed" "$topology"
		return 0
	else
		ark_led_stop_rainbow
	fi

	ark_led_normalize_hex "$color"
	local topology="$(ark_led_detect_topology)"
	local led_base="$(_get_led_sys)"

	case "$topology" in
		"$TOPOLOGY_I2C_MATRIX")
			local node="$led_base/aw21018_led"
			[ -d "$node" ] || return 0

			# Garante calibração senoidal e ausência de trigger global
			ark_led_calibrate_curves

			# Mapeamento de Modos de Hardware do AW21018
			# Modo 1: Solid ON
			# Modo 2: Kernel Blink (Timers rápidos)
			# Modo 3: Autonomous Hardware Breathing (Oscilador do silício via bit GE1)
			local aw_mode=1
			case "$effect" in
				breathe) aw_mode=3 ;;
				blink)   aw_mode=2 ;;
				solid)   aw_mode=1 ;;
				off)     aw_mode=1 ;;
			esac

			case "$zone" in
				front)
					if [ "$effect" = "off" ]; then
						echo "1 0 1" >> "$node/led" 2>/dev/null || true
					else
						echo "1 $clean_hex $aw_mode" >> "$node/led" 2>/dev/null || true
					fi
					;;
				top)
					if [ "$effect" = "off" ]; then
						echo "0 0 1" >> "$node/led" 2>/dev/null || true
					else
						echo "0 $clean_hex $aw_mode" >> "$node/led" 2>/dev/null || true
					fi
					;;
				ports)
					if [ "$effect" = "off" ]; then
						for t in 2 3 4 5 6 7; do
							echo "$t 0 1" >> "$node/led" 2>/dev/null || true
						done
					elif [ "$effect" = "blink" ]; then
						echo "6 ff 1" >> "$node/led" 2>/dev/null || true
						echo "7 ff 2" >> "$node/led" 2>/dev/null || true
						echo "2 ff 1" >> "$node/led" 2>/dev/null || true
						echo "3 ff 2" >> "$node/led" 2>/dev/null || true
						echo "4 ff 1" >> "$node/led" 2>/dev/null || true
						echo "5 ff 2" >> "$node/led" 2>/dev/null || true
					else
						echo "6 ff 1" >> "$node/led" 2>/dev/null || true
						echo "7 0 1" >> "$node/led" 2>/dev/null || true
						echo "2 ff 1" >> "$node/led" 2>/dev/null || true
						echo "3 0 1" >> "$node/led" 2>/dev/null || true
						echo "4 ff 1" >> "$node/led" 2>/dev/null || true
						echo "5 0 1" >> "$node/led" 2>/dev/null || true
					fi
					;;
				all)
					if [ "$effect" = "off" ]; then
						echo "1 0 1" >> "$node/led" 2>/dev/null || true
						echo "0 0 1" >> "$node/led" 2>/dev/null || true
						for t in 2 3 4 5 6 7; do
							echo "$t 0 1" >> "$node/led" 2>/dev/null || true
						done
					elif [ "$effect" = "breathe" ]; then
						# Padrão Gamer T7: Frontal sólido contínuo e Topo respirando suavemente
						echo "1 $clean_hex 1" >> "$node/led" 2>/dev/null || true
						echo "0 $clean_hex 3" >> "$node/led" 2>/dev/null || true
					elif [ "$effect" = "solid" ]; then
						echo "1 $clean_hex 1" >> "$node/led" 2>/dev/null || true
						echo "0 $clean_hex 1" >> "$node/led" 2>/dev/null || true
					elif [ "$effect" = "blink" ]; then
						echo "1 $clean_hex 2" >> "$node/led" 2>/dev/null || true
						echo "0 $clean_hex 2" >> "$node/led" 2>/dev/null || true
					fi
					;;
			esac
			;;

		"$TOPOLOGY_DIRECT_PHY"|"$TOPOLOGY_GPIO")
			local blink_delay=500
			case "$speed" in
				fast) blink_delay=200 ;;
				slow) blink_delay=1000 ;;
				*) blink_delay=500 ;;
			esac

			# Nó RGB multicolor nativo (WS2812B GRB / SPI, ex: Acer W6x rgb:status ou multi_intensity)
			local rgb_multi_cand=""
			for p in "$led_base"/*/multi_intensity; do
				if [ -e "$p" ]; then
					rgb_multi_cand="$(basename "$(dirname "$p")")"
					break
				fi
			done
			[ -n "$rgb_multi_cand" ] || [ ! -e "$led_base/rgb:status" ] || rgb_multi_cand="rgb:status"

			if [ -n "$rgb_multi_cand" ] && { [ "$zone" = "front" ] || [ "$zone" = "top" ] || [ "$zone" = "all" ]; }; then
				local mc_order="rgb"
				if [ -e "$led_base/$rgb_multi_cand/multi_index" ]; then
					case "$(cat "$led_base/$rgb_multi_cand/multi_index" 2>/dev/null)" in
						*green*red*blue*) mc_order="grb" ;;
						*blue*green*red*) mc_order="bgr" ;;
						*) mc_order="rgb" ;;
					esac
				fi
				local mc_val="$r_val $g_val $b_val"
				[ "$mc_order" != "grb" ] || mc_val="$g_val $r_val $b_val"
				[ "$mc_order" != "bgr" ] || mc_val="$b_val $g_val $r_val"

				if [ "$effect" = "off" ]; then
					echo none > "$led_base/$rgb_multi_cand/trigger" 2>/dev/null || true
					echo 0 > "$led_base/$rgb_multi_cand/brightness" 2>/dev/null || true
				elif [ "$effect" = "blink" ]; then
					echo "$mc_val" > "$led_base/$rgb_multi_cand/multi_intensity" 2>/dev/null || true
					echo timer > "$led_base/$rgb_multi_cand/trigger" 2>/dev/null || true
					echo "$blink_delay" > "$led_base/$rgb_multi_cand/delay_on" 2>/dev/null || true
					echo "$blink_delay" > "$led_base/$rgb_multi_cand/delay_off" 2>/dev/null || true
					echo 255 > "$led_base/$rgb_multi_cand/brightness" 2>/dev/null || true
				else
					echo "$mc_val" > "$led_base/$rgb_multi_cand/multi_intensity" 2>/dev/null || true
					echo default-on > "$led_base/$rgb_multi_cand/trigger" 2>/dev/null || true
					echo 255 > "$led_base/$rgb_multi_cand/brightness" 2>/dev/null || true
				fi
			fi

			# Monocromáticos e status geral
			if [ "$zone" = "front" ] || [ "$zone" = "top" ] || [ "$zone" = "all" ]; then
				for p in "$led_base"/*power* "$led_base"/*status* "$led_base"/*system*; do
					[ -e "$p" ] || continue
					case "$p" in *multi_intensity*|*aw21018*) continue ;; esac
					if [ "$effect" = "off" ]; then
						echo none > "$p/trigger" 2>/dev/null || true
						echo 0 > "$p/brightness" 2>/dev/null || true
					elif [ "$effect" = "blink" ]; then
						echo timer > "$p/trigger" 2>/dev/null || true
						echo "$blink_delay" > "$p/delay_on" 2>/dev/null || true
						echo "$blink_delay" > "$p/delay_off" 2>/dev/null || true
						echo 255 > "$p/brightness" 2>/dev/null || echo 1 > "$p/brightness" 2>/dev/null || true
					else
						echo default-on > "$p/trigger" 2>/dev/null || true
						echo 255 > "$p/brightness" 2>/dev/null || echo 1 > "$p/brightness" 2>/dev/null || true
					fi
				done
			fi

			# Portas RJ45 apenas se for TOPOLOGY_GPIO (em DIRECT_PHY o switch PHY opera autônomo)
			if [ "$topology" = "$TOPOLOGY_GPIO" ] && { [ "$zone" = "ports" ] || [ "$zone" = "all" ]; }; then
				for p in "$led_base"/*lan* "$led_base"/*wan*; do
					[ -e "$p" ] || continue
					case "$p" in *wlan*|*internet*|*planet*) continue ;; esac
					if [ "$effect" = "off" ]; then
						echo none > "$p/trigger" 2>/dev/null || true
						echo 0 > "$p/brightness" 2>/dev/null || true
					elif [ "$effect" = "blink" ]; then
						echo timer > "$p/trigger" 2>/dev/null || true
						echo "$blink_delay" > "$p/delay_on" 2>/dev/null || true
						echo "$blink_delay" > "$p/delay_off" 2>/dev/null || true
						echo 255 > "$p/brightness" 2>/dev/null || echo 1 > "$p/brightness" 2>/dev/null || true
					else
						echo default-on > "$p/trigger" 2>/dev/null || true
						echo 255 > "$p/brightness" 2>/dev/null || echo 1 > "$p/brightness" 2>/dev/null || true
					fi
				done
			fi
			;;
	esac

	printf '{"success":true,"zone":"%s","color":"%s","effect":"%s","topology":"%s"}\n' \
		"$zone" "$hex_display" "$effect" "$topology"
	return 0
}

# 4. Aplica presets completos do sistema com governança UCI
ark_led_apply_preset() {
	local preset="${1:-smart}"
	local custom_hex="${2:-}"
	local custom_effect="${3:-}"
	local custom_speed="${4:-}"

	local topol="$(ark_led_detect_topology)"
	local led_base="$(_get_led_sys)"

	case "$preset" in
		night)
			ark_led_stop_rainbow
			# 100% dos LEDs apagados (modo escuro / noturno)
			rm -f /etc/config/ark_led_alert_mode /etc/hotplug.d/iface/99-ark-led-alert /etc/hotplug.d/net/99-ark-led-alert

			# Apaga todos os LEDs via HAL
			ark_led_set_effect all "000000" off

			# Atualiza nós sysfs globais
			for led in $(ls "$led_base/" 2>/dev/null); do
				case "$led" in
					aw21018_led) continue ;; # Tratado via HAL no nó específico
					*)
						echo none > "$led_base/$led/trigger" 2>/dev/null || true
						echo 0 > "$led_base/$led/brightness" 2>/dev/null || true
						;;
				esac
			done

			# Persistência UCI
			[ -n "$(uci -q get system.led_status)" ] || uci -q set system.led_status=led
			uci -q set "system.led_status.name=Iluminação Inteligente ARK"
			uci -q set "system.led_status.topology=$topol"
			uci -q set "system.led_status.preset=night"
			uci -q set "system.led_status.enabled=0"

			for sec in $(uci -q show system 2>/dev/null | grep '=led$' | cut -d. -f2 | cut -d= -f1); do
				[ "$sec" != "led_status" ] || continue
				uci -q set "system.$sec.trigger=none"
				uci -q set "system.$sec.default=0"
			done
			uci commit system 2>/dev/null || true
			/etc/init.d/led restart >/dev/null 2>&1 || true
			;;

		alert)
			ark_led_stop_rainbow
			# Modo Alerta (WAN desconectada / falha de internet)
			mkdir -p /etc/config /etc/hotplug.d/iface /etc/hotplug.d/net
			touch /etc/config/ark_led_alert_mode

			# Pulso vermelho suave / alerta
			ark_led_set_effect top "ff0000" breathe
			ark_led_set_effect front "ff0000" solid

			# LEDs de Wi-Fi apagados no modo alerta para destacar a perda de sinal de internet
			for wf_led in $(ls "$led_base/" 2>/dev/null); do
				case "$wf_led" in
					*wifi*|*wlan*|*phy*|*2g*|*5g*|*6g*)
						echo 0 > "$led_base/$wf_led/brightness" 2>/dev/null || true
						;;
				esac
			done

			[ -n "$(uci -q get system.led_status)" ] || uci -q set system.led_status=led
			uci -q set "system.led_status.name=Iluminação Inteligente ARK"
			uci -q set "system.led_status.topology=$topol"
			uci -q set "system.led_status.preset=alert"
			uci -q set "system.led_status.enabled=1"
			uci -q set "system.led_status.hex_color=#FF0000"
			uci commit system 2>/dev/null || true

			ark_led_update_wan_status
			;;

		custom|gamer)
			rm -f /etc/config/ark_led_alert_mode /etc/hotplug.d/iface/99-ark-led-alert /etc/hotplug.d/net/99-ark-led-alert
			local chosen_hex="$custom_hex"
			local chosen_effect="$custom_effect"
			local chosen_spd="$custom_speed"
			[ -n "$chosen_hex" ] || chosen_hex="$(uci -q get system.led_status.hex_color || echo '#00FF00')"
			[ -n "$chosen_effect" ] || chosen_effect="$(uci -q get system.led_status.effect || echo 'breathe')"
			[ -n "$chosen_spd" ] || chosen_spd="$(uci -q get system.led_status.speed || echo 'normal')"
			case "$chosen_effect" in
				solid|fixo|estatico|static) chosen_effect="solid" ;;
				rainbow|arcoiris|arco-iris) chosen_effect="rainbow" ;;
				*) chosen_effect="breathe" ;;
			esac

			ark_led_normalize_hex "$chosen_hex"
			ark_led_set_speed "$chosen_spd" >/dev/null 2>&1
			if [ "$chosen_effect" = "rainbow" ]; then
				ark_led_start_rainbow "$chosen_spd"
			elif [ "$chosen_effect" = "solid" ]; then
				ark_led_stop_rainbow
				ark_led_set_effect all "$clean_hex" solid "$chosen_spd"
			else
				ark_led_stop_rainbow
				ark_led_set_effect all "$clean_hex" breathe "$chosen_spd"
			fi

			[ -n "$(uci -q get system.led_status)" ] || uci -q set system.led_status=led
			uci -q set "system.led_status.name=Iluminação Inteligente ARK"
			uci -q set "system.led_status.topology=$topol"
			uci -q set "system.led_status.preset=custom"
			uci -q set "system.led_status.enabled=1"
			uci -q set "system.led_status.hex_color=$hex_display"
			uci -q set "system.led_status.effect=$chosen_effect"
			uci -q set "system.led_status.speed=$chosen_spd"
			uci commit system 2>/dev/null || true

			ark_led_update_wan_status
			;;

		smart|default|*)
			ark_led_stop_rainbow
			rm -f /etc/config/ark_led_alert_mode /etc/hotplug.d/iface/99-ark-led-alert /etc/hotplug.d/net/99-ark-led-alert

			if [ "$preset" = "default" ]; then
				for sec in $(uci -q show system 2>/dev/null | grep '=led$' | cut -d. -f2 | cut -d= -f1); do
					[ "$sec" != "led_status" ] || continue
					uci -q delete "system.$sec"
				done
			fi

			ark_led_calibrate_curves
			ark_led_set_effect all "00ff00" breathe

			[ -n "$(uci -q get system.led_status)" ] || uci -q set system.led_status=led
			uci -q set "system.led_status.name=Iluminação Inteligente ARK"
			uci -q set "system.led_status.topology=$topol"
			uci -q set "system.led_status.preset=smart"
			uci -q set "system.led_status.enabled=1"
			uci -q set "system.led_status.hex_color=#00FF00"
			uci commit system 2>/dev/null || true

			ark_led_update_wan_status
			;;
	esac

	printf '{"success":true,"preset":"%s"}\n' "$preset"
	return 0
}

# 5. Monitoramento Dinâmico de Link WAN e Alertas
ark_led_update_wan_status() {
	local net_base="$(_get_net_sys)"
	local active_dev=""
	if command -v get_active_online_wan_dev >/dev/null 2>&1; then
		active_dev="$(get_active_online_wan_dev)"
	else
		active_dev="$(ip route show default 2>/dev/null | awk '/default/{print $5; exit}')"
		[ -n "$active_dev" ] || active_dev="eth1"
	fi

	local has_link=0
	if [ -e "$net_base/$active_dev/carrier" ]; then
		[ "$(cat "$net_base/$active_dev/carrier" 2>/dev/null)" = "1" ] && has_link=1
	else
		for d in wan eth1 pppoe-wan eth0; do
			if [ -e "$net_base/$d/carrier" ] && [ "$(cat "$net_base/$d/carrier" 2>/dev/null)" = "1" ]; then
				active_dev="$d"
				has_link=1
				break
			fi
		done
	fi

	local topol="$(ark_led_detect_topology)"
	local led_base="$(_get_led_sys)"

	# Hardware I2C Matrix (AW21018):
	if [ "$topol" = "$TOPOLOGY_I2C_MATRIX" ]; then
		if [ -f /etc/config/ark_led_alert_mode ] && [ "$has_link" = "0" ]; then
			# Alerta ativo e internet desconectada: Pulsa em vermelho
			ark_led_set_effect top "ff0000" breathe
			ark_led_set_effect front "ff0000" blink
		elif [ "$has_link" = "1" ]; then
			local cur_color="$(uci -q get system.led_status.hex_color || echo '#00FF00')"
			local cur_preset="$(uci -q get system.led_status.preset || echo 'smart')"
			if [ "$cur_preset" != "night" ]; then
				ark_led_set_effect top "$cur_color" breathe
				ark_led_set_effect front "$cur_color" solid
			fi
		fi
		return 0
	fi

	# Hardware Monocromático ou RGB SPI
	local inet_led=""
	if command -v get_internet_led_sysfs >/dev/null 2>&1; then
		inet_led="$(get_internet_led_sysfs || echo '')"
	else
		for cand in "d-link:green:planet" "blue:internet" "green:internet" "white:internet" "blue:wan" "green:wan" "rgb:status"; do
			if [ -e "$led_base/$cand" ]; then inet_led="$cand"; break; fi
		done
	fi

	local alert_led=""
	if command -v get_internet_alert_led_sysfs >/dev/null 2>&1; then
		alert_led="$(get_internet_alert_led_sysfs || echo '')"
	else
		for cand in "d-link:orange:planet" "orange:internet" "red:internet" "amber:internet"; do
			if [ -e "$led_base/$cand" ]; then alert_led="$cand"; break; fi
		done
	fi

	[ -n "$inet_led" ] || return 0

	# WS2812B / multi_intensity (ex: Acer W6x)
	if [ "$inet_led" = "rgb:status" ] || [ -e "$led_base/$inet_led/multi_intensity" ]; then
		if [ -f /etc/config/ark_led_alert_mode ] && [ "$has_link" = "0" ]; then
			local mc_order="rgb"
			if [ -e "$led_base/$inet_led/multi_index" ]; then
				case "$(cat "$led_base/$inet_led/multi_index" 2>/dev/null)" in
					*green*red*blue*) mc_order="grb" ;;
					*blue*green*red*) mc_order="bgr" ;;
					*) mc_order="rgb" ;;
				esac
			fi
			local alert_val="255 0 0"
			[ "$mc_order" != "grb" ] || alert_val="0 255 0"
			echo "$alert_val" > "$led_base/$inet_led/multi_intensity" 2>/dev/null || true
			echo timer > "$led_base/$inet_led/trigger" 2>/dev/null || true
			echo 500 > "$led_base/$inet_led/delay_on" 2>/dev/null || true
			echo 500 > "$led_base/$inet_led/delay_off" 2>/dev/null || true
			echo 255 > "$led_base/$inet_led/brightness" 2>/dev/null || true
		elif [ "$has_link" = "1" ]; then
			local cur_eff="$(uci -q get system.led_status.effect || echo '')"
			[ "$cur_eff" != "rainbow" ] || return 0
			local cur_col="$(uci -q get system.led_status.hex_color || echo '#00FF00')"
			ark_led_normalize_hex "$cur_col"
			local mc_order="rgb"
			if [ -e "$led_base/$inet_led/multi_index" ]; then
				case "$(cat "$led_base/$inet_led/multi_index" 2>/dev/null)" in
					*green*red*blue*) mc_order="grb" ;;
					*blue*green*red*) mc_order="bgr" ;;
					*) mc_order="rgb" ;;
				esac
			fi
			local mc_val="$r_val $g_val $b_val"
			[ "$mc_order" != "grb" ] || mc_val="$g_val $r_val $b_val"
			[ "$mc_order" != "bgr" ] || mc_val="$b_val $g_val $r_val"
			echo "$mc_val" > "$led_base/$inet_led/multi_intensity" 2>/dev/null || true
			echo default-on > "$led_base/$inet_led/trigger" 2>/dev/null || true
			echo 255 > "$led_base/$inet_led/brightness" 2>/dev/null || true
		else
			local cur_eff="$(uci -q get system.led_status.effect || echo '')"
			[ "$cur_eff" != "rainbow" ] || return 0
			echo none > "$led_base/$inet_led/trigger" 2>/dev/null || true
			echo 0 > "$led_base/$inet_led/brightness" 2>/dev/null || true
		fi
		return 0
	fi

	# Monocromático tradicional (Cudy WR3000, D-Link DGL-5500)
	if [ "$has_link" = "1" ]; then
		echo default-on > "$led_base/$inet_led/trigger" 2>/dev/null || true
		echo 255 > "$led_base/$inet_led/brightness" 2>/dev/null || echo 1 > "$led_base/$inet_led/brightness" 2>/dev/null || true
		if [ -n "$alert_led" ] && [ -e "$led_base/$alert_led" ]; then
			echo none > "$led_base/$alert_led/trigger" 2>/dev/null || true
			echo 0 > "$led_base/$alert_led/brightness" 2>/dev/null || true
		fi
	else
		echo none > "$led_base/$inet_led/trigger" 2>/dev/null || true
		echo 0 > "$led_base/$inet_led/brightness" 2>/dev/null || true
		if [ -n "$alert_led" ] && [ -e "$led_base/$alert_led" ]; then
			echo timer > "$led_base/$alert_led/trigger" 2>/dev/null || true
			echo 500 > "$led_base/$alert_led/delay_on" 2>/dev/null || true
			echo 500 > "$led_base/$alert_led/delay_off" 2>/dev/null || true
			echo 255 > "$led_base/$alert_led/brightness" 2>/dev/null || echo 1 > "$led_base/$alert_led/brightness" 2>/dev/null || true
		fi
	fi
}
