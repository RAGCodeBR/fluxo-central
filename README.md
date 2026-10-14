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
