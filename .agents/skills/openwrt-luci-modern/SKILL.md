---
name: openwrt-luci-modern
description: Specialist in modern OpenWrt LuCI development (JavaScript client-side views, JSON-RPC, ucode templates, menu/ACL declarations, CBI forms, and DOM rendering without legacy Lua).
---

# Modern OpenWrt LuCI Development Specialist (LuCI JS / ucode / RPC)

## Objetivo e Filosofia Arquitetural
Esta skill orienta o desenvolvimento, refatoração e auditoria de aplicações e interfaces web para o **LuCI moderno** (OpenWrt 21.02, 23.05, 24.x, 25.x e master).

### Transição de Arquitetura: Do Lua CBI para LuCI Client-Side JavaScript & ucode
Nas versões modernas do OpenWrt (21.02 em diante, consolidado no 23.05 e 24.x/25.x), o padrão oficial migrou do backend em Lua (`luci.model.cbi`) para **views Client-Side JavaScript** (`L.view.extend`) e templates **ucode** (`*.ut`):
1. O roteador serve arquivos estáticos (HTML esqueleto, JS minificado, CSS) e endpoints JSON-RPC via `rpcd` / `ubus`.
2. A renderização do DOM e a maior parte da lógica de formulário acontecem no navegador do cliente.
3. Isso reduz substancialmente a pressão de memória RAM na CPU do roteador (ao evitar carregar o interpretador Lua a cada renderização de página), embora as chamadas RPC via `rpcd` e `uhttpd` ainda consumam buffers e recursos de sessão.
4. Embora pacotes legados de feeds externos ainda possam usar Lua CBI, novos módulos do ARK Router devem ser desenvolvidos estritamente como **views client-side JavaScript** com menus em JSON (`/usr/share/luci/menu.d/*.json`).

---

## 1. Estrutura Canônica de um Pacote LuCI Moderno

```text
luci-app-exemplo/
├── Makefile                                # Inclusão do feed luci.mk
├── root/
│   ├── etc/
│   │   ├── config/
│   │   │   └── exemplo                     # Arquivo UCI inicial padrão
│   │   └── uci-defaults/
│   │       └── 99-luci-app-exemplo         # Configurações pós-instalação
│   └── usr/
│       └── share/
│           ├── luci/
│           │   └── menu.d/
│           │       └── luci-app-exemplo.json  # Rota e entrada no menu LuCI
│           ├── rpcd/
│           │   └── acl.d/
│           │       └── luci-app-exemplo.json  # Permissões estritas de RPC/UCI
│           └── ucode/luci/template/themes/    # Templates .ut opcionais
└── root/www/luci-static/resources/view/
    └── exemplo/
        └── overview.js                      # View moderna em JavaScript puro
```

---

## 2. Declaração de Menus (`/usr/share/luci/menu.d/*.json`)

O arquivo JSON define onde a tela se localiza na hierarquia de navegação do LuCI.

```json
{
  "admin/services/exemplo": {
    "title": "Serviço Exemplo",
    "order": 50,
    "action": {
      "type": "view",
      "path": "exemplo/overview"
    },
    "depends": {
      "acl": [ "luci-app-exemplo" ]
    }
  }
}
```

- **`title`**: Nome visível no menu lateral/superior.
- **`order`**: Posição ordinal no menu (menor = mais acima).
- **`action.type`**: SEMPRE `"view"`.
- **`action.path`**: Caminho relativo sem `.js` a partir de `/www/luci-static/resources/view/`.
- **`depends.acl`**: ID da ACL declarada em `rpcd/acl.d/`. Sem isso, o usuário não terá permissão de abrir a tela.

---

## 3. Controle de Acesso e ACLs (`/usr/share/rpcd/acl.d/*.json`)

O LuCI usa o daemon `rpcd` com listas de controle de acesso (ACL) estritas. Sem declarar as permissões, as chamadas `rpc.declare`, `fs.exec`, `fs.read` e `uci.load` retornarão erro `403 Forbidden` ou falharão silenciosamente.

```json
{
  "luci-app-exemplo": {
    "description": "Permissoes para o modulo luci-app-exemplo",
    "read": {
      "uci": [ "exemplo", "network", "dhcp" ],
      "ubus": {
        "luci-rpc": [ "getDHCPLeases", "getHostHints" ],
        "network.interface": [ "dump" ],
        "file": [ "read", "list", "stat" ]
      }
    },
    "write": {
      "uci": [ "exemplo" ],
      "file": [ "exec" ]
    }
  }
}
```

> [!IMPORTANT]
> Ao usar `fs.exec('/usr/sbin/meu-script')`, o bloco `write.file: ["exec"]` é estritamente obrigatório na ACL.

---

## 4. O Ciclo de Vida de uma View (`L.view.extend`)

Uma view do LuCI é instanciada estendendo `L.view` ou `L.view.extend`:

```javascript
'use strict';
'require view';
'require ui';
'require fs';
'require uci';
'require rpc';

return view.extend({
    // 1. Carregamento assíncrono de dados prévios (opcional)
    load: function() {
        return Promise.all([
            uci.load('exemplo'),
            fs.exec('/usr/sbin/exemplo-status', ['json'])
        ]);
    },

    // 2. Renderização do DOM no navegador
    render: function(data) {
        const uciConfig = data[0];
        const scriptOutput = data[1];

        let status = {};
        try { status = JSON.parse(scriptOutput.stdout || '{}'); } catch(e) {}

        const viewNode = E('div', { class: 'cbi-map' }, [
            E('h2', {}, [ _('Painel do Serviço Exemplo') ]),
            E('div', { class: 'cbi-map-descr' }, [ _('Gerenciamento e status em tempo real.') ]),
            E('div', { class: 'cbi-section' }, [
                E('p', {}, [
                    _('Status: '),
                    E('span', { class: 'badge ' + (status.running ? 'online' : 'offline') }, [
                        status.running ? _('Ativo') : _('Parado')
                    ])
                ])
            ])
        ]);

        return viewNode;
    },

    // 3. O que acontece ao clicar em 'Salvar' ou 'Salvar e Aplicar'
    handleSaveApply: function(ev, mode) {
        return this.handleSave(ev).then(function() {
            return fs.exec('/etc/init.d/exemplo', ['restart']);
        });
    }
});
```

---

## 5. O Construtor DOM Nativo: A Função `E()`

O LuCI fornece globalmente o construtor declarativo de elementos `E()` (semelhante ao `h()` do Vue/HyperScript ou `React.createElement`), eliminando o peso de frameworks externos:

### Sintaxe
`E(tagString, [attributesObject], [childrenArrayOrString])`

```javascript
// Criando um card interativo com botão
const card = E('div', { class: 'ex-card', id: 'card-1' }, [
    E('span', { class: 'ex-kicker' }, [ 'STATUS' ]),
    E('h3', {}, [ 'Dispositivo Conectado' ]),
    E('p', { class: 'ex-muted' }, [ 'IP: 192.168.1.150' ]),
    E('button', {
        class: 'btn cbi-button cbi-button-action',
        style: 'min-height: 40px;',
        click: function(ev) {
            ui.addNotification(null, E('p', {}, [ 'Ação executada com sucesso!' ]));
        }
    }, [ '⚡ Reiniciar Conexão' ])
]);
```

### Regras do `E()`:
1. **Segurança anti-XSS:** Todo texto passado dentro do array de filhos é automaticamente tratado como string segura (`textContent`). NUNCA use `innerHTML` sem sanitização estrita.
2. **Eventos nativos:** Eventos como `click`, `change`, `input` podem ser passados diretamente como propriedades da tabela de atributos.
3. **Array aninhado:** Suporta arrays de elementos e ignora elementos vazios (`null`, `undefined`, `''`).

---

## 6. Formulários e Seções CBI em JavaScript (`form.Map`)

Para telas de configuração estruturada ligadas ao `/etc/config/`:

```javascript
'use strict';
'require view';
'require form';

return view.extend({
    render: function() {
        // Vincula ao /etc/config/exemplo
        const m = new form.Map('exemplo', _('Configuração Geral'), _('Ajuste os parâmetros de rede.'));

        const s = m.section(form.TypedSection, 'geral', _('Parâmetros'));
        s.anonymous = true;
        s.addremove = false;

        // Campo Switch (Flag)
        const oEnabled = s.option(form.Flag, 'enabled', _('Ativar Serviço'));
        oEnabled.rmempty = false;

        // Campo de Texto com Validação
        const oHost = s.option(form.Value, 'server_host', _('Endereço do Servidor'));
        oHost.datatype = 'host';
        oHost.placeholder = 'exemplo.com ou 1.1.1.1';
        oHost.rmempty = false;

        // Campo Dropdown (ListValue) com Dependência
        const oMode = s.option(form.ListValue, 'mode', _('Modo de Operação'));
        oMode.value('auto', _('Automático'));
        oMode.value('manual', _('Manual'));
        oMode.default = 'auto';

        const oPort = s.option(form.Value, 'manual_port', _('Porta Manual'));
        oPort.datatype = 'port';
        oPort.depends('mode', 'manual'); // Exibido apenas se mode === 'manual'

        return m.render();
    }
});
```

---

## 7. Peculiaridades Críticas das APIs RPC do OpenWrt

### ⚠️ Concessões DHCP (`luci-rpc getDHCPLeases`)
No retorno do RPC `getDHCPLeases`, o campo do IP chama-se **`ipaddr`**, e NÃO `ip`:
```javascript
// Retorno real:
// [{ "macaddr": "00:11:22:33:44:55", "ipaddr": "192.168.1.150", "hostname": "DEVICE-EXAMPLE" }]

// ❌ ERRADO:
const ip = lease.ip; // Retorna undefined!

// ✅ CORRETO (com retrocompatibilidade segura):
const ip = lease.ipaddr || lease.ip || '';
```

### ⚠️ Interface de Rede (`network.interface dump`)
Para obter o IP e status de uma interface (ex: `wan` ou `lan`), inspecione a propriedade `ipv4-address`:
```javascript
const ifaces = dump.interface || [];
const wan = ifaces.find(i => i.interface === 'wan') || {};
const wanIp = (wan['ipv4-address'] && wan['ipv4-address'][0] && wan['ipv4-address'][0].address) || '';
```

---

## 8. Modais, Diálogos e Interatividade (`ui.*`)

### Abrindo um Modal Customizado
```javascript
ui.showModal(_('Editar Dispositivo'), [
    E('p', { class: 'ex-muted' }, [ _('Defina as prioridades deste cliente.') ]),
    E('div', { class: 'cbi-value' }, [
        E('label', { class: 'cbi-value-title' }, [ _('Nome Amigável') ]),
        E('div', { class: 'cbi-value-field' }, [
            E('input', { class: 'cbi-input-text', id: 'dev-name', value: 'PlayStation 5' })
        ])
    ]),
    E('div', { class: 'right', style: 'margin-top: 16px; display:flex; gap:8px; justify-content:flex-end;' }, [
        E('button', { class: 'btn cbi-button cbi-button-neutral', click: ui.hideModal }, [ _('Cancelar') ]),
        E('button', { class: 'btn cbi-button cbi-button-positive', click: function() {
            const val = document.getElementById('dev-name').value;
            // Executa salvamento
            ui.hideModal();
        } }, [ _('Salvar') ])
    ])
]);
```

### Travamento de Rolagem (Scroll Lock)
No LuCI, o container que rola a página é `.main-right` (e não o `body`):
```javascript
// Ao abrir modal:
const mainRight = document.querySelector('.main-right');
if (mainRight) mainRight.style.setProperty('overflow', 'hidden', 'important');

// Ao fechar modal:
if (mainRight) mainRight.style.removeProperty('overflow');
```

---

## 9. Makefile Padrão para Pacotes LuCI (`luci.mk`)

O Makefile do OpenWrt é minimalista e utiliza as macros nativas do feed LuCI:

```makefile
include $(TOPDIR)/rules.mk

LUCI_TITLE:=Interface LuCI para Serviço Exemplo
LUCI_DEPENDS:=+exemplo-core
LUCI_PKGARCH:=all
PKG_RELEASE:=1

include $(TOPDIR)/feeds/luci/luci.mk

# Definição padrão do OpenWrt Buildroot
$(eval $(call BuildPackage,luci-app-exemplo))
```

---

## 10. Checklist de Qualidade e Segurança para IAs

Antes de submeter ou finalizar qualquer código de LuCI:
- [ ] O código é 100% JavaScript moderno (`view.extend`), sem classes legadas de Lua CBI?
- [ ] A rota foi declarada em `/usr/share/luci/menu.d/*.json` com `action.type: "view"`?
- [ ] As permissões de leitura/escrita foram concedidas em `/usr/share/rpcd/acl.d/*.json`?
- [ ] Todo elemento do DOM usa a fábrica `E()` com textos seguros sem injeção XSS?
- [ ] Acesso a concessões DHCP usa `l.ipaddr || l.ip`?
- [ ] Todos os botões e áreas de toque têm pelo menos `min-height: 40px` para celulares?
- [ ] Os assets estáticos passaram por minificação (`esbuild`) e validação (`node --check`)?
