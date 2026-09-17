const FEATURE_META={
	argon:{name:'Tema Argon',description:'Tema visual externo do LuCI.',recommended:false},
	sqm:{name:'SQM / CAKE',description:'Organiza as filas e reduz a latência quando o link está ocupado.'},
	mwan3:{name:'Multi‑WAN',description:'Adiciona failover e balanceamento entre dois ou mais links.'},
	nlbwmon:{name:'Consumo por dispositivo',description:'Adiciona tráfego individual e histórico detalhado de consumo.'},
	upnp:{name:'UPnP / NAT‑PMP',description:'Permite que aplicativos compatíveis solicitem portas automaticamente.'},
	wifi:{name:'Wi‑Fi e análise de canais',description:'Usa os recursos sem fio e regulatórios fornecidos pelo driver.'},
	history:{name:'Histórico de 24 horas',description:'Coletor leve incluído no painel.'},
	temperature:{name:'Sensor de temperatura',description:'Exibe a leitura térmica quando o hardware oferece um sensor.'},
	custom_qos:{name:'Limites personalizados',description:'Integra as regras específicas de prioridade e visitantes.'}
	,irqbalance:{name:'IRQ Balance',description:'Distribui interrupções de hardware entre os núcleos do processador para manter Wi‑Fi, rede e CPU mais responsivos.'}
	,speedify:{name:'Speedify Bonding',description:'Integra o Speedify para somar links de internet de verdade usando licença Speedify Router.',recommended:true}
	,zerotier:{name:'ZeroTier remoto leve',description:'Acesso remoto leve por rede virtual. Melhor para roteadores com pouca flash/RAM.',recommended:true}
	,wireguard:{name:'WireGuard VPN',description:'VPN de alta velocidade integrada ao kernel Linux. Conecte o roteador a servidores externos (Cliente) ou crie túneis locais (Servidor) com QR Code.',recommended:true}
	,adblock:{name:'Bloqueador de Anúncios',description:'Protege a rede inteira contra propagandas invasivas, anúncios de Smart TV e rastreadores.',recommended:true}
	,usteer:{name:'Assistente de Roaming (usteer)',description:'Orquestra troca rápida de sinal (AP Steering) e Band Steering entre múltiplos roteadores e bandas Wi-Fi.',recommended:true}
};
