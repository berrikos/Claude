import Anthropic from '@anthropic-ai/sdk';
import { MODELS, MODEL_TIERS, config } from './config.js';

// Complexity routing. Goal: never spend Opus money (or Opus latency) on a
// task Haiku handles, and never let Haiku flail on a task that needs Opus.
//
// Stage 1 — free heuristics: obvious-simple messages skip classification
//           entirely and go straight to the cheapest model.
// Stage 2 — a single tiny Haiku call classifies everything else with
//           structured output: {complexity, is_pc_task}. Costs a fraction of
//           a cent and ~1s, and pays for itself instantly in routing quality.

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

const GREETING_RE =
  /^(hi|hey|hello|yo|sup|good (morning|afternoon|evening|night)|thanks?|thank you|ok(ay)?|cool|nice|great|lol|haha|bye|goodnight|gn|gm)[\s!.?]*$/i;

// Signals that a message wants something done on the PC rather than answered.
const PC_TASK_RE =
  /\b(open|close|run|execute|install|uninstall|create|make|delete|remove|move|copy|rename|download|convert|compress|zip|unzip|organi[sz]e|clean( up)?|find|search my|list my|backup|screenshot|restart|kill|launch|write.*(file|script)|edit.*(file|config)|my (pc|computer|desktop|downloads|documents|files|folder))\b/i;

function heuristicRoute(text) {
  const t = text.trim();
  if (GREETING_RE.test(t)) {
    return { complexity: 'simple', isPcTask: false, via: 'heuristic' };
  }
  // Very short, no task verbs, no question of substance → simple chat.
  if (t.length <= 25 && !PC_TASK_RE.test(t) && !/\bwhy|how|explain|compare\b/i.test(t)) {
    return { complexity: 'simple', isPcTask: false, via: 'heuristic' };
  }
  return null;
}

export async function classify(text, log) {
  const quick = heuristicRoute(text);
  if (quick) return quick;

  try {
    const res = await anthropic.messages.create({
      model: MODELS.classifier,
      max_tokens: 100,
      system:
        'Classify a message sent to a personal assistant that can chat AND control the user\'s PC.\n' +
        'complexity:\n' +
        '- simple: greetings, casual chat, trivial lookups, single-fact answers, reminders to remember something, tiny PC actions (open an app, list a folder)\n' +
        '- moderate: multi-step reasoning, drafting text, summarising, typical PC tasks (organise files, write a small script, install something)\n' +
        '- complex: deep analysis, hard debugging, multi-file coding, planning across many steps, anything ambiguous AND high-stakes\n' +
        'is_pc_task: true only if fulfilling the request requires acting on the user\'s computer (files, apps, commands), not just answering.',
      messages: [{ role: 'user', content: text.slice(0, 2000) }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              complexity: { type: 'string', enum: ['simple', 'moderate', 'complex'] },
              is_pc_task: { type: 'boolean' },
            },
            required: ['complexity', 'is_pc_task'],
            additionalProperties: false,
          },
        },
      },
    });
    const text0 = res.content.find((b) => b.type === 'text')?.text;
    const parsed = JSON.parse(text0);
    return { complexity: parsed.complexity, isPcTask: parsed.is_pc_task, via: 'classifier' };
  } catch (err) {
    log?.warn({ err: err.message }, 'router: classification failed, defaulting to moderate');
    // Fail safe: moderate tier, treat as PC task only if it looks like one.
    return { complexity: 'moderate', isPcTask: PC_TASK_RE.test(text), via: 'fallback' };
  }
}

export function modelForTier(tier) {
  return MODELS[tier] || MODELS.moderate;
}

// One step up the ladder; null when already at the top.
export function escalateTier(tier) {
  const i = MODEL_TIERS.indexOf(tier);
  if (i === -1 || i === MODEL_TIERS.length - 1) return null;
  return MODEL_TIERS[i + 1];
}
