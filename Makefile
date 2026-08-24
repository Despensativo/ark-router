include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-ark-router
PKG_VERSION:=0.9.29
PKG_RELEASE:=1
PKG_MAINTAINER:=ARK Router contributors
PKG_LICENSE:=MIT

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-ark-router
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=ARK Router operational dashboard
  PKGARCH:=all
  DEPENDS:=+luci-base +rpcd +nlbwmon +tc-full +kmod-sched-act-police
endef

define Package/luci-app-ark-router/description
  Responsive and modular LuCI dashboard for OpenWrt, with Multi-WAN,
  SQM, Wi-Fi, device and traffic integrations when available. The ARK
  Router UI ships its own English fallback and selected runtime language;
  luci-i18n-* packages are optional and are not required by this package.
endef

define Package/luci-app-ark-router/conffiles
/etc/config/equipe_dashboard
/etc/config/equipe_devices
/etc/config/qos_equipe
endef

define Build/Compile
endef

define Package/luci-app-ark-router/install
	$(CP) ./root/* $(1)/
endef

$(eval $(call BuildPackage,luci-app-ark-router))
