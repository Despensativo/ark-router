include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-ark-router
PKG_VERSION:=0.9.3
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
  DEPENDS:=+luci-base +rpcd +iwinfo
endef

define Package/luci-app-ark-router/description
  Responsive and modular LuCI dashboard for OpenWrt, with Multi-WAN,
  SQM, Wi-Fi, device and traffic integrations when available.
endef

define Package/luci-app-ark-router/conffiles
/etc/config/equipe_dashboard
/etc/config/equipe_devices
endef

define Build/Compile
endef

define Package/luci-app-ark-router/install
	$(CP) ./root/* $(1)/
endef

$(eval $(call BuildPackage,luci-app-ark-router))
