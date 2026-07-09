import http from 'http';
import { config } from './config.js';

// WhatsApp transport via Whapi (whapi.cloud) — a hosted WhatsApp API.
// Incoming messages arrive as webhook POSTs from Whapi's servers; replies go
// out through their REST API with your channel token. No QR pairing, no
// WhatsApp Web session to babysit.
//
// Setup (one-time, in the Whapi dashboard, Settings → Webhooks):
//   URL:    http://<public-address-of-this-pc>:8088/webhook
//   Events: messages (POST)
// If your PC has no public address, run a tunnel (cloudflared/ngrok) and use
// the tunnel URL — see the README.

function senderNumber(value) {
  // '61412345678@s.whatsapp.net' or '61412345678' -> '61412345678'
  return (value || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function extractText(msg) {
  return (
    msg.text?.body ||
    msg.image?.caption ||
    msg.video?.caption ||
    msg.document?.caption ||
    null
  );
}

export async function startWhapi({ onMessage, log }) {
  async function send(chatId, text) {
    const res = await fetch(`${config.whapiApiUrl}/messages/text`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.whapiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: chatId, body: text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Whapi send failed (${res.status}): ${body.slice(0, 200)}`);
    }
  }

  // Whapi retries webhook deliveries — dedupe on message id.
  const seenIds = new Set();
  const rememberId = (id) => {
    seenIds.add(id);
    if (seenIds.size > 2000) {
      for (const old of seenIds) {
        seenIds.delete(old);
        if (seenIds.size <= 1000) break;
      }
    }
  };

  // Serialize handling per chat so replies never interleave out of order.
  const chatQueues = new Map();

  function handleMessages(messages) {
    for (const msg of messages) {
      if (msg.from_me) continue;
      if (!msg.id || seenIds.has(msg.id)) continue;
      rememberId(msg.id);

      const chatId = msg.chat_id;
      // DMs only — skip groups (@g.us), newsletters, statuses.
      if (!chatId || !chatId.endsWith('@s.whatsapp.net')) continue;

      const text = extractText(msg);
      if (!text) continue;

      const sender = senderNumber(msg.from || chatId);
      if (!config.allowedNumbers.includes(sender)) {
        log.warn({ sender }, 'Ignored message from non-whitelisted number');
        continue;
      }

      const prev = chatQueues.get(chatId) || Promise.resolve();
      const job = prev.then(async () => {
        try {
          const reply = await onMessage({
            chatId,
            text,
            onStatus: (status) => send(chatId, status),
          });
          if (reply) await send(chatId, reply);
        } catch (err) {
          log.error({ err: err.message }, 'Failed to handle message');
          await send(chatId, `⚠️ Error: ${err.message}`).catch(() => {});
        }
      });
      chatQueues.set(chatId, job);
    }
  }

  const server = http.createServer((req, res) => {
    if (req.method !== 'POST' || !req.url.startsWith(config.webhookPath)) {
      res.writeHead(404).end();
      return;
    }
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) req.destroy(); // sanity cap
    });
    req.on('end', () => {
      // Ack immediately so Whapi never retries because of our processing time.
      res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');
      try {
        const payload = JSON.parse(body);
        if (Array.isArray(payload.messages)) handleMessages(payload.messages);
      } catch (err) {
        log.warn({ err: err.message }, 'Ignored malformed webhook payload');
      }
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.webhookPort, () => resolve());
  });

  log.info(
    `✅ Whapi webhook listening on port ${config.webhookPort} (path ${config.webhookPath}). ` +
      'Point your Whapi channel webhook at this address.'
  );
  return { send, server };
}
