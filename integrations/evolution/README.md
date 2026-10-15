# Evolution API local

Esta instalação é isolada e fica disponível somente em `http://127.0.0.1:8080`.

1. Copie `.env.evolution.example` para `.env.evolution` e use senhas/chaves únicas.
2. Execute `docker compose up -d` nesta pasta.
3. O Fluxo Central usará `EVOLUTION_API_URL=http://127.0.0.1:8080` e a mesma `EVOLUTION_API_KEY` no arquivo `.env` dele.
4. Crie uma instância pelo painel/API e escaneie o QR Code no WhatsApp desejado.

Não exponha a porta 8080 diretamente na internet. Para receber mensagens no Fluxo publicado, a API do Fluxo precisa ser implantada em um host com HTTPS; só então configuraremos o webhook.
