import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataFile = join(root, 'data', 'conversations.json');
const port = Number(process.env.PORT || 8787);
const origin = process.env.APP_ORIGIN || '*';

function headers(res) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'content-type,x-webhook-secret');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
}
function send(res, status, body) { headers(res); res.writeHead(status); res.end(JSON.stringify(body)); }
async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function load() {
  try { return JSON.parse(await readFile(dataFile, 'utf8')); }
  catch { return []; }
}
async function save(items) {
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, JSON.stringify(items, null, 2));
}
function config() {
  return {
    configured: Boolean(process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_TOKEN),
    provider: 'Z-API',
    instanceId: process.env.ZAPI_INSTANCE_ID ? `${process.env.ZAPI_INSTANCE_ID.slice(0, 6)}…` : null
  };
}
function zapiUrl(path) {
  return `https://api.z-api.io/instances/${encodeURIComponent(process.env.ZAPI_INSTANCE_ID)}/token/${encodeURIComponent(process.env.ZAPI_TOKEN)}${path}`;
}
async function sendText(phone, text) {
  if (!config().configured) throw new Error('Integração Z-API não configurada.');
  const response = await fetch(zapiUrl('/send-text'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(process.env.ZAPI_CLIENT_TOKEN ? { 'Client-Token': process.env.ZAPI_CLIENT_TOKEN } : {}) },
    body: JSON.stringify({ phone, message: text })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || `Z-API respondeu ${response.status}`);
  return payload;
}
const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true, integration: config() });
    if (req.method === 'GET' && url.pathname === '/api/integrations/zapi/status') return send(res, 200, config());
    if (req.method === 'GET' && url.pathname === '/api/conversations') return send(res, 200, await load());
    if (req.method === 'POST' && url.pathname === '/api/messages') {
      const { phone, text } = await body(req);
      if (!phone || !text) return send(res, 400, { error: 'phone e text são obrigatórios.' });
      const result = await sendText(phone, text);
      return send(res, 202, { accepted: true, result });
    }
    if (req.method === 'POST' && url.pathname === '/webhooks/zapi') {
      if (process.env.ZAPI_WEBHOOK_SECRET && req.headers['x-webhook-secret'] !== process.env.ZAPI_WEBHOOK_SECRET) return send(res, 401, { error: 'Webhook não autorizado.' });
      const event = await body(req);
      const items = await load();
      items.unshift({ receivedAt: new Date().toISOString(), event });
      await save(items.slice(0, 500));
      return send(res, 200, { received: true });
    }
    return send(res, 404, { error: 'Rota não encontrada.' });
  } catch (error) {
    return send(res, 500, { error: error instanceof Error ? error.message : 'Erro interno.' });
  }
});
server.listen(port, () => console.log(`Fluxo Central API ouvindo em http://localhost:${port}`));
