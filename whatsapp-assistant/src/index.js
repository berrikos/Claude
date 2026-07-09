import pino from 'pino';
import { validateConfig, config, MODELS } from './config.js';
import { initMemory } from './memory.js';
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
      provider: config.waProvider,
      models: MODELS,
      workDir: config.workDir,
      brain: config.obsidianVault ? `Obsidian vault (${config.obsidianVault})` : 'SQLite',
      allowedNumbers: config.allowedNumbers.map((n) => `...${n.slice(-4)}`),
    },
    'Starting WhatsApp PC assistant'
  );

  initMemory();
  log.info('Memory ready');

  const onMessage = ({ chatId, text, onStatus }) => handleMessage({ chatId, text, log, onStatus });

  if (config.waProvider === 'whapi') {
    const { startWhapi } = await import('./whapi.js');
    await startWhapi({ onMessage, log });
  } else {
    const { startWhatsApp } = await import('./whatsapp.js');
    await startWhatsApp({ onMessage, log });
  }
}

process.on('unhandledRejection', (err) => log.error({ err: err?.message }, 'Unhandled rejection'));

main().catch((err) => {
  log.error({ err: err.message }, 'Fatal startup error');
  process.exit(1);
});
