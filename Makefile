include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-ark-router
PKG_VERSION:=0.9.63
PKG_RELEASE:=1
PKG_MAINTAINER:=ARK Router contributors
PKG_LICENSE:=MIT

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-ark-router
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=ARK Router Lite operational dashboard
  PKGARCH:=all
  DEPENDS:=+luci-base +rpcd +nlbwmon +luci-app-nlbwmon +tc-full +kmod-sched-act-police +irqbalance +luci-app-package-manager +luci-app-attendedsysupgrade +attendedsysupgrade-common +owut +luci-app-sqm +kmod-ifb +kmod-sched-cake +luci-app-mwan3 +luci-app-upnp +miniupnpd-nftables +luci-app-uhttpd +kmod-tun +iwinfo +luci-i18n-mwan3-pt-br +luci-i18n-nlbwmon-pt-br +luci-i18n-sqm-pt-br +luci-i18n-upnp-pt-br +luci-i18n-uhttpd-pt-br
endef

define Package/luci-app-ark-router/description
  Lightweight ARK Router package for routers with less than 256 MB RAM.
  It includes the dashboard, per-device accounting and complete guest
  upload/download limiting, package management, OpenWrt update helpers
  and sub-1 MB operational modules such as SQM/CAKE, Multi-WAN, UPnP,
  uHTTPd management, Wi-Fi info, tunnel support and supported PT-BR
  LuCI translations. Heavier modules such as ZeroTier and speed testing
  remain installable from the panel.
endef

define Package/luci-app-ark-router-full
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=ARK Router Full operational dashboard
  PKGARCH:=all
  DEPENDS:=+luci-base +rpcd +nlbwmon +luci-app-nlbwmon +tc-full +kmod-sched-act-police +irqbalance +luci-app-sqm +kmod-ifb +kmod-sched-cake +luci-app-mwan3 +luci-app-upnp +miniupnpd-nftables +luci-app-uhttpd +zerotier +speedtest-go +kmod-tun +iwinfo +luci-app-package-manager +luci-app-attendedsysupgrade +attendedsysupgrade-common +owut +luci-i18n-mwan3-pt-br +luci-i18n-nlbwmon-pt-br +luci-i18n-sqm-pt-br +luci-i18n-upnp-pt-br +luci-i18n-uhttpd-pt-br
endef

define Package/luci-app-ark-router-full/description
  Full ARK Router package for routers with 512 MB RAM or more. It pulls
  the dashboard plus the common operational modules used by ARK Router:
  traffic accounting, guest limiting, SQM/CAKE, Multi-WAN, UPnP,
  uHTTPd management, ZeroTier, speed testing and VPN tunnel support.
endef

define Package/luci-app-ark-router/conffiles
/etc/config/equipe_dashboard
/etc/config/equipe_devices
/etc/config/qos_equipe
endef

define Package/luci-app-ark-router-full/conffiles
/etc/config/equipe_dashboard
/etc/config/equipe_devices
/etc/config/qos_equipe
endef

define Build/Compile
endef

define Package/luci-app-ark-router/install
	$(CP) ./root/* $(1)/
	# Lite downloads the optional telemetry client on first use into /tmp.
	# Keep the persistent binary out of the small-flash package.
	rm -f $(1)/usr/bin/starlink-dish
	$(INSTALL_DIR) $(1)/usr/libexec
	$(INSTALL_BIN) ./root/usr/libexec/ark-starlink-telemetry $(1)/usr/libexec/ark-starlink-telemetry
	$(INSTALL_DIR) $(1)/www/cgi-bin
	$(INSTALL_BIN) ./root/www/cgi-bin/ark-starlink-telemetry $(1)/www/cgi-bin/ark-starlink-telemetry
endef

define Package/luci-app-ark-router-full/install
	$(CP) ./root/* $(1)/
	# Full carries the architecture-specific Starlink client persistently.
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./root/usr/bin/starlink-dish $(1)/usr/bin/starlink-dish
	$(INSTALL_DIR) $(1)/usr/libexec
	$(INSTALL_BIN) ./root/usr/libexec/ark-starlink-telemetry $(1)/usr/libexec/ark-starlink-telemetry
	$(INSTALL_DIR) $(1)/www/cgi-bin
	$(INSTALL_BIN) ./root/www/cgi-bin/ark-starlink-telemetry $(1)/www/cgi-bin/ark-starlink-telemetry
endef

$(eval $(call BuildPackage,luci-app-ark-router))
$(eval $(call BuildPackage,luci-app-ark-router-full))
