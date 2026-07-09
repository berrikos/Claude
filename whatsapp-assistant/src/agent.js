import { query } from '@anthropic-ai/claude-agent-sdk';
import { config } from './config.js';

// PC task execution via the Claude Agent SDK — the Claude Code engine as a
// library. It gives the model real tools (Bash, Read, Write, Edit, Glob,
// Grep) that run on this machine, plus the full agentic loop.
//
// The ESCALATE contract: the agent is told to print a sentinel if the task is
// beyond it. brain.js watches for the sentinel (or an error result) and
// re-runs once on the next model tier — one retry max, so a hopeless task
// fails fast instead of burning time and tokens.

export const ESCALATE_SENTINEL = '[[ESCALATE]]';

const AGENT_SYSTEM_APPEND = `
You are the PC-side executor of a personal assistant. The user sent this task
from WhatsApp on their phone and will read your final message there.

Rules:
- Be fast and economical: use the fewest tool calls that safely complete the
  task. No exploratory wandering, no unrequested refactors or extras.
- Never run destructive commands (rm -rf on broad paths, disk formatting,
  killing system processes) unless the task explicitly and unambiguously asks.
- If you complete the task, end with a short plain-text summary (1-4
  sentences) of what you did — this is what gets sent back to the phone. No
  markdown headers, no code fences unless essential.
- If after a genuine attempt the task is beyond your capability (too complex,
  requires reasoning you cannot do reliably), reply with exactly
  "${ESCALATE_SENTINEL}" followed by one line explaining what you tried. Do
  NOT use the sentinel for tasks that are impossible for anyone (missing
  files, no network, permission denied) — for those, just explain the blocker.
`;

export async function runPcTask({ task, model, context, log }) {
  const prompt = context ? `${context}\n\nTask: ${task}` : task;

  const q = query({
    prompt,
    options: {
      model,
      cwd: config.workDir,
      // Personal single-user assistant on the owner's own machine; access is
      // gated upstream by the WhatsApp number whitelist.
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      allowedTools: ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebSearch', 'WebFetch'],
      maxTurns: config.maxAgentTurns,
      systemPrompt: { type: 'preset', preset: 'claude_code', append: AGENT_SYSTEM_APPEND },
    },
  });

  let finalText = '';
  let success = false;

  for await (const message of q) {
    if (message.type === 'assistant') {
      const texts = (message.message?.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text);
      if (texts.length) finalText = texts.join('\n');
    } else if (message.type === 'result') {
      success = message.subtype === 'success';
      if (message.subtype === 'success' && message.result) {
        finalText = message.result;
      } else if (!success) {
        log?.warn({ subtype: message.subtype }, 'agent: task ended without success');
      }
    }
  }

  const wantsEscalation = finalText.includes(ESCALATE_SENTINEL);
  return {
    success: success && !wantsEscalation,
    wantsEscalation: wantsEscalation || !success,
    text: finalText.replace(ESCALATE_SENTINEL, '').trim() || '(task produced no output)',
  };
}
