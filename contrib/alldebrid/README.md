# AllDebrid -> Aria2 Standalone Synchronizer (Contrib / Integração Futura)

Este diretório contém os scripts da integração opcional e experimental entre a **API do AllDebrid** e o motor de download **Aria2** para roteadores OpenWrt / ARK Router.

> **Status:** Módulo de contribuição externa / standalone (não faz parte do pacote principal `luci-app-ark-router`).

---

## 📁 Conteúdo

* `alldebrid-sync`: Script executável em `/usr/sbin/alldebrid-sync` que consulta a API do AllDebrid, destrava os links CDN (`/v4/link/unlock`) e os injeta no Aria2 via JSON-RPC.
* `alldebrid-sync.init`: Script de serviço Procd em `/etc/init.d/alldebrid-sync` para execução contínua em segundo plano com auto-restart.
* `alldebrid.config`: Template de configuração UCI para `/etc/config/alldebrid`.

---

## 🛠️ Instalação Manual no Roteador

1. Copie o arquivo de configuração para o roteador:
   ```sh
   cp alldebrid.config /etc/config/alldebrid
   uci set alldebrid.config.apikey="SUA_CHAVE_API_AQUI"
   uci set alldebrid.config.enabled="1"
   uci commit alldebrid
   ```

2. Instale o script executável:
   ```sh
   cp alldebrid-sync /usr/sbin/alldebrid-sync
   chmod +x /usr/sbin/alldebrid-sync
   ```

3. Instale e ative o serviço em segundo plano:
   ```sh
   cp alldebrid-sync.init /etc/init.d/alldebrid-sync
   chmod +x /etc/init.d/alldebrid-sync
   /etc/init.d/alldebrid-sync enable
   /etc/init.d/alldebrid-sync start
   ```

---

## 🎯 Puxando Magnets Manualmente sob Demanda

Para disparar o download imediato de um magnet específico ou URL do AllDebrid:

```sh
/usr/sbin/alldebrid-sync 760051850
# ou passando a URL completa:
/usr/sbin/alldebrid-sync "https://alldebrid.com/getMagnet/760051850"
```
