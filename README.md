# Fluxo Central

Painel independente de atendimento, CRM, tickets e indicadores.

## WhatsApp via Z-API

O frontend publicado no GitHub Pages é estático. Para conectar um número real, publique o diretório `server/` em um host Node.js e configure as variáveis do `.env.example` nesse host — nunca no GitHub.

1. Crie uma instância na Z-API e conecte o número pelo QR Code.
2. Configure `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN` e, se aplicável, `ZAPI_CLIENT_TOKEN` no host do backend.
3. Publique a API e use `https://SEU_BACKEND/webhooks/zapi` como URL de webhook na Z-API.
4. Configure `APP_ORIGIN=https://ragcodebr.github.io`.

Para rodar localmente:

```bash
cp .env.example .env
npm start
```

`GET /health` mostra se a integração foi configurada. `POST /api/messages` envia uma mensagem somente quando as credenciais existirem no ambiente do servidor.

## WhatsApp via Evolution API

Para não depender de um provedor hospedado, existe uma instalação local da Evolution API em `integrations/evolution/`. Ela roda em containers locais, usa um banco próprio e não publica a porta da integração na internet.

1. Copie `integrations/evolution/.env.evolution.example` para `integrations/evolution/.env.evolution` e preencha senhas/chaves únicas.
2. Execute `docker compose up -d` dentro de `integrations/evolution/`.
3. Configure `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `EVOLUTION_INSTANCE_NAME` no `.env` do backend do Fluxo.
4. Crie a instância e escaneie o QR Code somente no WhatsApp que será usado pelo sistema.

Para produção, não exponha a Evolution diretamente: publique o backend `server/` com HTTPS e use-o como ponte de webhook.
