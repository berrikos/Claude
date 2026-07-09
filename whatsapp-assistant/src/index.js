import pino from 'pino';
import { validateConfig, config, MODELS } from './config.js';
import { initMemory } from './memory.js';
import { startWhatsApp } from './whatsapp.js';
import { handleMessage } from './brain.js';

const log = pino({
  transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
}).child({ app: 'wa-assistant' });

async function main() {
  const problems = validateConfig();
  if (problems.length) {
    for (const p of problems) log.error(p);
    process.exit(1);
  }

  log.info(
    {
      models: MODELS,
      workDir: config.workDir,
      allowedNumbers: config.allowedNumbers.map((n) => `...${n.slice(-4)}`),
    },
    'Starting WhatsApp PC assistant'
  );

  initMemory();
  log.info('Local memory ready (SQLite)');

  await startWhatsApp({
    log,
    onMessage: ({ chatId, text, onStatus }) => handleMessage({ chatId, text, log, onStatus }),
  });
}

process.on('unhandledRejection', (err) => log.error({ err: err?.message }, 'Unhandled rejection'));

main().catch((err) => {
  log.error({ err: err.message }, 'Fatal startup error');
  process.exit(1);
});
