# Continuidade — Fluxo Central

Use este arquivo como contexto inicial em uma nova conversa.

## Objetivo

Construir o **Fluxo Central**, um sistema independente de atendimento omnicanal, CRM, tickets, contatos, equipe, relatórios e indicadores. A referência visual/funcional foi observada no sistema Único/Atender Bem, mas esta implementação não reutiliza marca, código, credenciais ou dados de terceiros.

## Links

- Código: https://github.com/RAGCodeBR/fluxo-central
- Aplicação estática: https://ragcodebr.github.io/fluxo-central/
- Publicação privada alternativa: https://fluxo-central.reinan3323.chatgpt.site

## Estado atual

- Repositório público `RAGCodeBR/fluxo-central`, branch `main`.
- GitHub Pages vem da branch `gh-pages` e publica o conteúdo de `dist/`.
- Interface inicia sem dados reais.
- Menu horizontal superior com ícones compactos e tooltip no hover.
- Dashboard de Atendimentos possui filtros, seis indicadores, gráfico horário, gráficos circulares e tabela vazia.
- Módulos de Equipe, CRM, Tickets, Atendimentos, Chat interno, Contatos, Relatórios e Integrações existem como front-end local.

## REA

REA foi usado para observar estrutura de interface e analisar bundles públicos do frontend da referência. Ele pode mapear telas, fluxos e contratos de API visíveis, mas não acessa código de servidor, banco, tokens ou dados privados.

## WhatsApp / Z-API

Foi criado um esqueleto de backend em `server/index.js`:

- `GET /health`
- `GET /api/integrations/zapi/status`
- `GET /api/conversations`
- `POST /api/messages`
- `POST /webhooks/zapi`

Arquivos relevantes:

- `.env.example`: nomes das variáveis necessárias; nunca enviar tokens ao GitHub.
- `README.md`: instruções de execução e configuração da Z-API.
- `package.json`: `npm start` executa a API na porta `8787`.

O WhatsApp real ainda **não está conectado**. Para concluir, será preciso:

1. Criar uma instância na Z-API e ler o QR Code do número próprio.
2. Hospedar `server/` em um serviço Node.js com HTTPS.
3. Configurar `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN` (se usado) e `ZAPI_WEBHOOK_SECRET` como variáveis secretas no host.
4. Informar `https://SEU_BACKEND/webhooks/zapi` na Z-API.
5. Salvar a URL pública do backend em Integrações no Fluxo Central e testar.

## Regra importante

Não copiar código, marca, dados, números, sessões, credenciais ou integrações da referência. Usar somente números e credenciais pertencentes ao usuário no novo sistema.
