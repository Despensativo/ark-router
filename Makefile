include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-ark-router
PKG_VERSION:=2.2.17
PKG_RELEASE:=1
PKG_MAINTAINER:=ARK Router contributors
PKG_LICENSE:=MIT

include $(INCLUDE_DIR)/package.mk

# Canonical QoS dependency lists; local packagers read these same declarations.
ARK_QOS_BASE_DEPENDS:=+tc-full +sqm-scripts +kmod-ifb +kmod-sched-core +kmod-sched-cake +kmod-sched
ARK_QOS_CTINFO_DEPENDS:=+kmod-sched-ctinfo
# Explicit reduced-feature build for targets without a trusted matching ctinfo package.
ARK_QOS_WITH_CTINFO?=1
ifneq ($(ARK_QOS_WITH_CTINFO),0)
  ifneq ($(ARK_QOS_WITH_CTINFO),1)
    $(error ARK_QOS_WITH_CTINFO must be 0 or 1)
  endif
endif
ARK_QOS_DEPENDS:=$(ARK_QOS_BASE_DEPENDS) $(if $(filter 1,$(ARK_QOS_WITH_CTINFO)),$(ARK_QOS_CTINFO_DEPENDS))

define Package/luci-app-ark-router
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=ARK Router Lite operational dashboard
  PKGARCH:=all
  DEPENDS:=+luci-base +rpcd +nlbwmon +luci-app-nlbwmon +kmod-sched-act-police +irqbalance +luci-app-package-manager +luci-app-attendedsysupgrade +attendedsysupgrade-common +owut +luci-app-sqm +luci-app-mwan3 +luci-app-upnp +miniupnpd-nftables +kmod-tun +iwinfo +curl +luci-i18n-mwan3-pt-br +luci-i18n-nlbwmon-pt-br +luci-i18n-sqm-pt-br +luci-i18n-upnp-pt-br $(ARK_QOS_DEPENDS)
endef

define Package/luci-app-ark-router/description
  Lightweight ARK Router package for routers with less than 256 MB RAM.
  It includes the dashboard, per-device accounting and complete guest
  upload/download limiting, package management, OpenWrt update helpers
  and sub-1 MB operational modules such as SQM/CAKE, Multi-WAN, UPnP,
  Wi-Fi info, tunnel support and supported PT-BR LuCI translations.
  Heavier modules such as ZeroTier and speed testing remain installable
  from the panel.
endef

define Package/luci-app-ark-router-full
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=ARK Router Full operational dashboard
  PKGARCH:=all
  DEPENDS:=+luci-base +rpcd +nlbwmon +luci-app-nlbwmon +kmod-sched-act-police +irqbalance +luci-app-sqm +luci-app-mwan3 +luci-app-upnp +miniupnpd-nftables +zerotier +kmod-tun +kmod-jool-netfilter +jool-tools-netfilter +iwinfo +luci-app-package-manager +luci-app-attendedsysupgrade +attendedsysupgrade-common +owut +curl +luci-i18n-mwan3-pt-br +luci-i18n-nlbwmon-pt-br +luci-i18n-sqm-pt-br +luci-i18n-upnp-pt-br $(ARK_QOS_DEPENDS)
endef

define Package/luci-app-ark-router-full/description
  Full ARK Router package for routers with 512 MB RAM or more. It pulls
  the dashboard plus the common operational modules used by ARK Router:
  traffic accounting, guest limiting, SQM/CAKE, Multi-WAN, UPnP,
  ZeroTier, speed testing and VPN tunnel support.
endef

define Package/luci-app-ark-router/conffiles
/etc/config/equipe_dashboard
/etc/config/equipe_devices
/etc/config/qos_equipe
/etc/config/equipe_perf
/etc/config/starlink_telemetry
endef

define Package/luci-app-ark-router-full/conffiles
/etc/config/equipe_dashboard
/etc/config/equipe_devices
/etc/config/qos_equipe
/etc/config/equipe_perf
/etc/config/starlink_telemetry
endef

define Build/Compile
endef

define ArkEnsureExecPerms
	chmod 0755 $(1)/usr/sbin/* $(1)/usr/libexec/* $(1)/www/cgi-bin/* $(1)/etc/init.d/* $(1)/etc/uci-defaults/* $(1)/usr/lib/ark/ark-control $(1)/usr/lib/ark/*.sh $(1)/usr/lib/ark/modules/*.sh $(1)/usr/lib/sqm/*.qos 2>/dev/null || true
	chmod 0755 $(1)/etc/hotplug.d/iface/* $(1)/etc/hotplug.d/net/* $(1)/etc/hotplug.d/firewall/* 2>/dev/null || true
endef

define Package/luci-app-ark-router/install
	$(CP) ./root/* $(1)/
	[ ! -d ./dist/minified ] || $(CP) ./dist/minified/* $(1)/
	rm -f $(1)/www/luci-static/resources/view/equipe-dashboard/overview_v2.*
	# Lite downloads the optional telemetry client on first use into /tmp.
	# Keep the persistent binary out of the small-flash package.
	rm -f $(1)/usr/bin/starlink-dish
	$(call ArkEnsureExecPerms,$(1))
endef

define Package/luci-app-ark-router-full/install
	$(CP) ./root/* $(1)/
	[ ! -d ./dist/minified ] || $(CP) ./dist/minified/* $(1)/
	rm -f $(1)/www/luci-static/resources/view/equipe-dashboard/overview_v2.*
	# Full carries the architecture-specific Starlink client persistently.
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./root/usr/bin/starlink-dish $(1)/usr/bin/starlink-dish
	$(call ArkEnsureExecPerms,$(1))
endef

define Package/luci-app-ark-router/preinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
avail=$$(df -k /overlay 2>/dev/null | awk 'NR==2{print $$4; exit}')
if [ -n "$$avail" ] && [ "$$avail" -gt 0 ] && [ "$$avail" -lt 3500 ]; then
	echo "ARK Router: Insufficient /overlay space ($$((avail / 1024)) MB available, >= 3.5 MB required)." >&2
	echo "Installation aborted to prevent filesystem and LuCI corruption." >&2
	exit 1
fi
exit 0
endef

define Package/luci-app-ark-router-full/preinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
avail=$$(df -k /overlay 2>/dev/null | awk 'NR==2{print $$4; exit}')
if [ -n "$$avail" ] && [ "$$avail" -gt 0 ] && [ "$$avail" -lt 35000 ]; then
	echo "ARK Router Full: Insufficient /overlay space ($$((avail / 1024)) MB available, >= 35 MB required)." >&2
	echo "ARK Router Full includes heavy binaries (like starlink-dish and zerotier)." >&2
	echo "Please install 'luci-app-ark-router' (Lite profile) instead." >&2
	exit 1
fi
exit 0
endef

define Package/luci-app-ark-router/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	chmod +x /usr/sbin/equipe-dashboard-control /usr/sbin/ark-doctor /usr/sbin/equipe-traffic-history /usr/sbin/ark-* /usr/sbin/starlink-* /usr/lib/ark/ark-control /usr/lib/ark/*.sh /usr/lib/ark/modules/*.sh /usr/lib/sqm/*.qos /etc/init.d/equipe-traffic-history /etc/init.d/ark-* /etc/init.d/starlink-* /etc/hotplug.d/iface/* /etc/hotplug.d/net/* /usr/libexec/ark-starlink-telemetry /usr/libexec/ark-theme-ro /www/cgi-bin/ark-starlink-telemetry /www/cgi-bin/ark-mesh-export 2>/dev/null || true
	rm -f /etc/rc.d/K98ark-safe-shutdown /etc/rc.d/S22ark-firewall-guard 2>/dev/null || true
	[ -x /etc/init.d/ark-safe-shutdown ] && /etc/init.d/ark-safe-shutdown enable 2>/dev/null || true
	[ -x /etc/init.d/ark-zerotier-ram ] && /etc/init.d/ark-zerotier-ram enable 2>/dev/null || true
	[ -x /etc/init.d/ark-firewall-guard ] && /etc/init.d/ark-firewall-guard enable 2>/dev/null || true
	[ -x /etc/init.d/ark-hardware-tune ] && /etc/init.d/ark-hardware-tune enable 2>/dev/null || true
	[ -x /etc/init.d/ark-port-ledd ] && /etc/init.d/ark-port-ledd enable 2>/dev/null || true
	[ -x /etc/init.d/equipe-traffic-history ] && /etc/init.d/equipe-traffic-history enable 2>/dev/null || true
	[ -f /etc/uci-defaults/99-ark-router-theme ] && /bin/sh /etc/uci-defaults/99-ark-router-theme >/dev/null 2>&1 || true
	[ -f /etc/uci-defaults/99-ark-router-leds ] && /bin/sh /etc/uci-defaults/99-ark-router-leds >/dev/null 2>&1 || true
	[ -f /etc/uci-defaults/99-ark-router-uhttpd ] && /bin/sh /etc/uci-defaults/99-ark-router-uhttpd >/dev/null 2>&1 || true
	[ -f /etc/uci-defaults/99-ark-router-dhcp-sanitize ] && /bin/sh /etc/uci-defaults/99-ark-router-dhcp-sanitize >/dev/null 2>&1 || true
	[ -x /usr/sbin/equipe-dashboard-control ] && /usr/sbin/equipe-dashboard-control feature-enforce-policies >/dev/null 2>&1 || true
	[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd reload >/dev/null 2>&1 || true
	rm -f /tmp/luci-indexcache /tmp/ark-*.cache /tmp/ark-*-cache.json /tmp/ark-*-cache.ts 2>/dev/null || true
	rm -rf /tmp/luci-modulecache/* 2>/dev/null || true
}
exit 0
endef

define Package/luci-app-ark-router-full/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	chmod +x /usr/sbin/equipe-dashboard-control /usr/sbin/ark-doctor /usr/sbin/equipe-traffic-history /usr/sbin/ark-* /usr/sbin/starlink-* /usr/lib/ark/ark-control /usr/lib/ark/*.sh /usr/lib/ark/modules/*.sh /usr/lib/sqm/*.qos /etc/init.d/equipe-traffic-history /etc/init.d/ark-* /etc/init.d/starlink-* /etc/hotplug.d/iface/* /etc/hotplug.d/net/* /usr/libexec/ark-starlink-telemetry /usr/libexec/ark-theme-ro /www/cgi-bin/ark-starlink-telemetry /www/cgi-bin/ark-mesh-export 2>/dev/null || true
	rm -f /etc/rc.d/K98ark-safe-shutdown /etc/rc.d/S22ark-firewall-guard 2>/dev/null || true
	[ -x /etc/init.d/ark-safe-shutdown ] && /etc/init.d/ark-safe-shutdown enable 2>/dev/null || true
	[ -x /etc/init.d/ark-zerotier-ram ] && /etc/init.d/ark-zerotier-ram enable 2>/dev/null || true
	[ -x /etc/init.d/ark-firewall-guard ] && /etc/init.d/ark-firewall-guard enable 2>/dev/null || true
	[ -x /etc/init.d/ark-hardware-tune ] && /etc/init.d/ark-hardware-tune enable 2>/dev/null || true
	[ -x /etc/init.d/ark-port-ledd ] && /etc/init.d/ark-port-ledd enable 2>/dev/null || true
	[ -x /etc/init.d/equipe-traffic-history ] && /etc/init.d/equipe-traffic-history enable 2>/dev/null || true
	[ -f /etc/uci-defaults/99-ark-router-theme ] && /bin/sh /etc/uci-defaults/99-ark-router-theme >/dev/null 2>&1 || true
	[ -f /etc/uci-defaults/99-ark-router-leds ] && /bin/sh /etc/uci-defaults/99-ark-router-leds >/dev/null 2>&1 || true
	[ -f /etc/uci-defaults/99-ark-router-uhttpd ] && /bin/sh /etc/uci-defaults/99-ark-router-uhttpd >/dev/null 2>&1 || true
	[ -f /etc/uci-defaults/99-ark-router-dhcp-sanitize ] && /bin/sh /etc/uci-defaults/99-ark-router-dhcp-sanitize >/dev/null 2>&1 || true
	[ -x /usr/sbin/equipe-dashboard-control ] && /usr/sbin/equipe-dashboard-control feature-enforce-policies >/dev/null 2>&1 || true
	[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd reload >/dev/null 2>&1 || true
	rm -f /tmp/luci-indexcache /tmp/ark-*.cache /tmp/ark-*-cache.json /tmp/ark-*-cache.ts 2>/dev/null || true
	rm -rf /tmp/luci-modulecache/* 2>/dev/null || true
}
exit 0
endef

define ArkCommonPrerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
case "$${1:-remove}" in upgrade) exit 0 ;; esac
for svc in ark-port-ledd ark-rainbowd equipe-traffic-history ark-autowan ark-firewall-guard ark-hardware-tune ark-zerotier-ram ark-safe-shutdown starlink-telemetry; do
	[ -x "/etc/init.d/$$svc" ] && "/etc/init.d/$$svc" stop >/dev/null 2>&1 || true
	[ -x "/etc/init.d/$$svc" ] && "/etc/init.d/$$svc" disable >/dev/null 2>&1 || true
done
if [ "$$(uci -q get luci.main.mediaurlbase 2>/dev/null)" = "/luci-static/ark" ]; then
	if [ -d /www/luci-static/bootstrap ]; then
		uci -q set luci.main.mediaurlbase='/luci-static/bootstrap'
	else
		uci -q delete luci.main.mediaurlbase
	fi
fi
uci -q delete luci.themes.ARK 2>/dev/null || true
uci -q commit luci 2>/dev/null || true
exit 0
endef

define ArkCommonPostrm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
rm -f /tmp/luci-indexcache /tmp/ark-*.cache /tmp/ark-*-cache.json /tmp/ark-*-cache.ts 2>/dev/null || true
rm -rf /tmp/luci-modulecache/* 2>/dev/null || true
[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd reload >/dev/null 2>&1 || true
exit 0
endef

Package/luci-app-ark-router/prerm = $(ArkCommonPrerm)
Package/luci-app-ark-router-full/prerm = $(ArkCommonPrerm)
Package/luci-app-ark-router/postrm = $(ArkCommonPostrm)
Package/luci-app-ark-router-full/postrm = $(ArkCommonPostrm)

$(eval $(call BuildPackage,luci-app-ark-router))
$(eval $(call BuildPackage,luci-app-ark-router-full))
