import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { WA_AUTH_DIR, config } from './config.js';

// WhatsApp transport via Baileys — talks the WhatsApp Web protocol directly
// (no browser, no Chromium). Pair once by scanning a QR code; the session is
// persisted in data/wa-auth and survives restarts.

function extractText(msg) {
  const m = msg.message;
  if (!m) return null;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    null
  );
}

function senderNumber(jid) {
  // '61412345678@s.whatsapp.net' -> '61412345678'
  return (jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

export async function startWhatsApp({ onMessage, log }) {
  const { state, saveCreds } = await useMultiFileAuthState(WA_AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    markOnlineOnConnect: false, // keep phone notifications working
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      log.info('Scan this QR code with WhatsApp (Settings → Linked Devices → Link a Device):');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      log.info('✅ WhatsApp connected. The assistant is live.');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode === DisconnectReason.loggedOut) {
        log.error(
          'Logged out of WhatsApp. Run "npm run reset-auth" and restart to pair again.'
        );
        process.exit(1);
      }
      log.warn({ statusCode }, 'Connection closed — reconnecting...');
      startWhatsApp({ onMessage, log }).catch((err) =>
        log.error({ err: err.message }, 'Reconnect failed')
      );
    }
  });

  // Serialize handling per chat so replies never interleave out of order,
  // while different chats still process in parallel.
  const chatQueues = new Map();

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue; // ignore our own messages
      const chatId = msg.key.remoteJid;
      if (!chatId || chatId.endsWith('@g.us') || chatId === 'status@broadcast') continue; // DMs only

      const text = extractText(msg);
      if (!text) continue;

      const sender = senderNumber(msg.key.participant || chatId);
      if (!config.allowedNumbers.includes(sender)) {
        log.warn({ sender }, 'Ignored message from non-whitelisted number');
        continue;
      }

      const prev = chatQueues.get(chatId) || Promise.resolve();
      const job = prev.then(async () => {
        try {
          await sock.readMessages([msg.key]);
          await sock.sendPresenceUpdate('composing', chatId);

          const reply = await onMessage({
            chatId,
            text,
            onStatus: (status) => sock.sendMessage(chatId, { text: status }),
          });

          await sock.sendPresenceUpdate('paused', chatId);
          if (reply) await sock.sendMessage(chatId, { text: reply });
        } catch (err) {
          log.error({ err: err.message }, 'Failed to handle message');
          await sock
            .sendMessage(chatId, { text: `⚠️ Error: ${err.message}` })
            .catch(() => {});
        }
      });
      chatQueues.set(chatId, job);
    }
  });

  return sock;
}
