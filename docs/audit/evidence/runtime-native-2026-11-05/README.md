# Evidência física do lote 022

Alvo: Acer Predator W6x 192.168.73.1, OpenWrt 25.12.6 / kernel 6.12.112. Aplicação explicitamente solicitada pelo usuário em 05/11/2026.

- `validation.json`: hashes anteriores/instalados, resultados do Doctor, estado preservado, ACL RPC, conectividade e limites dos testes isolados.
- `doctor-native-1280.png` e `doctor-native-390.png`: Chrome com LuCI real do W6x, após Executar Diagnóstico; notificações dispensadas pelos botões da interface antes da captura.
- Backup de código, scripts e registros operacionais completos ficam em `Evidencias locais/Runtime-022-2026-11-05/`, relativo à raiz do workspace. Não são credenciais nem exportação integral de UCI.

Os testes de SQM usam TC/UCI nativos com serviço/offload injetados e IFBs isolados; não constituem ensaio de desligamento da WAN de produção. A amostra de ping é curta. Consulte escopo, incidentes do harness e pendências no [relatório 022](../../batches/022-runtime-native-deployment.md).
