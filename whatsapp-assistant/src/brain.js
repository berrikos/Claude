import Anthropic from '@anthropic-ai/sdk';
import { classify, modelForTier, escalateTier } from './router.js';
import { runPcTask, ESCALATE_SENTINEL } from './agent.js';
import {
  saveMessage,
  getRecentHistory,
  recallRelevant,
  saveFact,
  listFacts,
  forgetFacts,
  extractFactsInBackground,
} from './memory.js';
import { config } from './config.js';

// The brain: for each incoming WhatsApp message —
//   commands → handled locally for free
//   otherwise → classify complexity → route to the right model →
//   answer (direct API) or act on the PC (Agent SDK) →
//   escalate one tier once if the model signals incapability →
//   remember everything.

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

const QA_SYSTEM = `You are ${config.assistantName}, a personal assistant chatting over WhatsApp.

Style: WhatsApp-appropriate — short, direct, friendly. No markdown headers or
bullet-heavy formatting; plain sentences. Match the user's tone. Only go long
when the question genuinely needs it.

You have long-term memory: relevant remembered facts and past-conversation
snippets may be included below. Use them naturally; never claim you can't
remember things.

If after genuinely trying you believe this question is beyond your capability
to answer well (too complex for you specifically), reply with exactly
"${ESCALATE_SENTINEL}" and nothing else. Use this only for real capability
gaps, not for questions that are unanswerable in principle.`;

function buildMemoryBlock(recall) {
  const parts = [];
  if (recall.facts.length) {
    parts.push('Remembered facts about the user:\n- ' + recall.facts.join('\n- '));
  }
  if (recall.snippets.length) {
    parts.push('Possibly relevant past conversation:\n' + recall.snippets.join('\n'));
  }
  return parts.length ? parts.join('\n\n') : null;
}

async function answerQuestion({ text, chatId, tier, recall, log }) {
  const model = modelForTier(tier);
  const history = getRecentHistory(chatId);
  const memoryBlock = buildMemoryBlock(recall);

  const messages = [...history];
  const lastContent = memoryBlock
    ? `<memory>\n${memoryBlock}\n</memory>\n\n${text}`
    : text;
  messages.push({ role: 'user', content: lastContent });

  const params = {
    model,
    max_tokens: 2048,
    system: [{ type: 'text', text: QA_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages,
  };
  // Adaptive thinking for the bigger tiers; Haiku answers directly.
  if (tier !== 'simple') params.thinking = { type: 'adaptive' };

  const res = await anthropic.messages.create(params);
  const reply = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  log?.info({ model, tier, tokens: res.usage?.output_tokens }, 'brain: answered');
  return reply;
}

// Built-in commands — handled locally, zero tokens.
function handleCommand(text) {
  const lower = text.trim().toLowerCase();

  const rememberMatch = text.match(/^(?:remember|note)(?:\s+that)?\s+(.+)/i);
  if (rememberMatch) {
    const added = saveFact(rememberMatch[1], 'user');
    return added ? '✅ Remembered.' : 'ℹ️ I already knew that.';
  }

  const forgetMatch = text.match(/^forget\s+(.+)/i);
  if (forgetMatch) {
    const n = forgetFacts(forgetMatch[1]);
    return n ? `🗑️ Forgot ${n} fact${n > 1 ? 's' : ''}.` : "I didn't have anything matching that.";
  }

  if (lower === 'memory' || lower === 'what do you remember' || lower === 'what do you remember?') {
    const facts = listFacts(30);
    if (!facts.length) return "I haven't stored any facts yet. Say 'remember ...' to teach me.";
    return 'Here\'s what I remember:\n' + facts.map((f) => `• ${f.fact}`).join('\n');
  }

  if (lower === 'help' || lower === '/help') {
    return (
      `I'm ${config.assistantName} 🤖 — I can:\n` +
      '• Answer questions (I pick the right AI model for the job)\n' +
      '• Do things on your PC — "organise my downloads", "open spotify", "write a script that..."\n' +
      '• Remember things — "remember my wifi password is X", "memory", "forget X"\n' +
      'Just talk to me normally.'
    );
  }

  return null;
}

export async function handleMessage({ chatId, text, log, onStatus }) {
  // 1. Free local commands.
  const commandReply = handleCommand(text);
  if (commandReply) {
    saveMessage(chatId, 'user', text);
    saveMessage(chatId, 'assistant', commandReply);
    return commandReply;
  }

  // 2. Classify complexity + task type (heuristics, then one tiny Haiku call).
  const route = await classify(text, log);
  log?.info(route, 'brain: routed');

  // 3. Recall relevant memory once, reused across escalation attempts.
  const recall = recallRelevant(chatId, text);
  saveMessage(chatId, 'user', text);

  let tier = route.complexity;
  let reply;

  try {
    if (route.isPcTask) {
      if (onStatus) await onStatus(`🖥️ On it (${tier} task)...`);
      const context = buildMemoryBlock(recall);

      let result = await runPcTask({ task: text, model: modelForTier(tier), context, log });

      if (!result.success && result.wantsEscalation) {
        const next = escalateTier(tier);
        if (next) {
          log?.info({ from: tier, to: next }, 'brain: escalating PC task');
          if (onStatus) await onStatus('🔼 That needs a bigger model — escalating...');
          tier = next;
          result = await runPcTask({ task: text, model: modelForTier(tier), context, log });
        }
      }
      reply = result.text;
    } else {
      reply = await answerQuestion({ text, chatId, tier, recall, log });

      if (reply.includes(ESCALATE_SENTINEL) || reply === '') {
        const next = escalateTier(tier);
        if (next) {
          log?.info({ from: tier, to: next }, 'brain: escalating question');
          tier = next;
          reply = await answerQuestion({ text, chatId, tier, recall, log });
          reply = reply.replace(ESCALATE_SENTINEL, '').trim();
        } else {
          reply = reply.replace(ESCALATE_SENTINEL, '').trim();
        }
      }
      if (!reply) reply = "Sorry, I couldn't produce an answer for that one.";
    }
  } catch (err) {
    log?.error({ err: err.message }, 'brain: handling failed');
    reply = `⚠️ Something went wrong: ${err.message}`;
  }

  saveMessage(chatId, 'assistant', reply);

  // 4. Background memory distillation — never blocks the reply.
  extractFactsInBackground(text, reply, log);

  return reply;
}
