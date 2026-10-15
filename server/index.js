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
  if (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE_NAME) {
    return {
      configured: true,
      provider: 'Evolution API',
      instanceId: process.env.EVOLUTION_INSTANCE_NAME
    };
  }
  return {
    configured: Boolean(process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_TOKEN),
    provider: 'Z-API',
    instanceId: process.env.ZAPI_INSTANCE_ID ? `${process.env.ZAPI_INSTANCE_ID.slice(0, 6)}…` : null
  };
}
function evolutionUrl(path) {
  return `${process.env.EVOLUTION_API_URL.replace(/\/$/, '')}${path}`;
}
async function evolution(path, options = {}) {
  const response = await fetch(evolutionUrl(path), {
    ...options,
    headers: { 'apikey': process.env.EVOLUTION_API_KEY, ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.response?.message || `Evolution respondeu ${response.status}`);
  return payload;
}
function zapiUrl(path) {
  return `https://api.z-api.io/instances/${encodeURIComponent(process.env.ZAPI_INSTANCE_ID)}/token/${encodeURIComponent(process.env.ZAPI_TOKEN)}${path}`;
}
async function sendText(phone, text) {
  if (config().provider === 'Evolution API') {
    return evolution(`/message/sendText/${encodeURIComponent(process.env.EVOLUTION_INSTANCE_NAME)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: phone, text })
    });
  }
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
    if (req.method === 'GET' && url.pathname === '/api/integrations/evolution/status') {
      if (config().provider !== 'Evolution API') return send(res, 200, { configured: false, provider: 'Evolution API' });
      const instances = await evolution('/instance/fetchInstances');
      const instance = instances.find((item) => item.name === process.env.EVOLUTION_INSTANCE_NAME) || null;
      return send(res, 200, { configured: true, provider: 'Evolution API', instance });
    }
    if (req.method === 'GET' && url.pathname === '/api/integrations/evolution/qr') {
      if (config().provider !== 'Evolution API') return send(res, 409, { error: 'Evolution API não configurada.' });
      const connection = await evolution(`/instance/connect/${encodeURIComponent(process.env.EVOLUTION_INSTANCE_NAME)}`);
      return send(res, 200, { instance: process.env.EVOLUTION_INSTANCE_NAME, status: connection?.instance?.connectionStatus || 'connecting', qrcode: connection.base64 || null });
    }
    if (req.method === 'GET' && url.pathname === '/evolution-qr') {
      if (config().provider !== 'Evolution API') {
        res.writeHead(409, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Evolution API não configurada.');
      }
      const connection = await evolution(`/instance/connect/${encodeURIComponent(process.env.EVOLUTION_INSTANCE_NAME)}`);
      const qrcode = connection.base64;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conectar Fluxo Central</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#102820;color:#effff5;font:16px system-ui}main{max-width:420px;padding:30px;text-align:center}img{width:min(78vw,340px);background:#fff;padding:14px;border-radius:16px}small{opacity:.75}</style><main><h1>Conectar WhatsApp</h1><p>Abra <b>Dispositivos conectados</b> no WhatsApp e escaneie este QR Code.</p>${qrcode ? `<img src="${qrcode}" alt="QR Code para conectar o WhatsApp">` : '<p>Gerando QR Code… atualize a página.</p>'}<p><small>Instância: ${process.env.EVOLUTION_INSTANCE_NAME}. Esta página funciona somente neste Mac.</small></p></main>`);
    }
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
    if (req.method === 'POST' && url.pathname === '/webhooks/evolution') {
      const event = await body(req);
      const items = await load();
      items.unshift({ receivedAt: new Date().toISOString(), provider: 'Evolution API', event });
      await save(items.slice(0, 500));
      return send(res, 200, { received: true });
    }
    return send(res, 404, { error: 'Rota não encontrada.' });
  } catch (error) {
    return send(res, 500, { error: error instanceof Error ? error.message : 'Erro interno.' });
  }
});
server.listen(port, () => console.log(`Fluxo Central API ouvindo em http://localhost:${port}`));
