// AI assist: natural-language -> patch, and conflict-resolution suggestions.
// Uses the Claude API with structured JSON outputs; falls back to a transparent rule-based mock when no credentials exist.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.PATCHWORK_MODEL || 'claude-opus-5-5';
let client = null;
let failedUntil = 0;
let lastError = '';
const forced = (process.env.PW_AI || 'auto').toLowerCase();

export function aiStatus() {
  const hasCreds = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  return { mode: forced === 'mock' ? 'mock' : hasCreds || forced === 'real' ? 'claude' : 'auto', model: MODEL, lastError, hasKey: hasCreds };
}

const nullable = { type: ['string', 'null'] };
const OP_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ['setText', 'setHTML', 'setAttr', 'setStyle', 'addClass', 'removeClass', 'remove', 'insert', 'css'] },
    name: nullable, prop: nullable, value: nullable, html: nullable, position: nullable, rule: nullable
  },
  required: ['type', 'name', 'prop', 'value', 'html', 'position', 'rule']
};
const PATCH_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { title: { type: 'string' }, explanation: { type: 'string' }, targetSelector: nullable, ops: { type: 'array', items: OP_SCHEMA } },
  required: ['title', 'explanation', 'targetSelector', 'ops']
};
const RESOLVE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { strategy: { type: 'string', enum: ['keepA', 'keepB', 'custom'] }, customValue: nullable, reasoning: { type: 'string' } },
  required: ['strategy', 'customValue', 'reasoning']
};

async function callJson(system, user, schema) {
  if (forced === 'mock' || Date.now() < failedUntil) throw new Error(lastError || 'AI disabled');
  client ||= new Anthropic();
  try {
    const res = await client.messages.create({
      model: MODEL, max_tokens: 4000, system,
      messages: [{ role: 'user', content: user }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema } }
    });
    if (res.stop_reason === 'refusal') throw new Error('The model declined this request.');
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    return JSON.parse(text);
  } catch (e) {
    lastError = String(e.message || e).slice(0, 200);
    if (/auth|credential|api key|401|403|authentication/i.test(lastError)) failedUntil = Date.now() + 60000;
    throw e;
  }
}

const SYSTEM_PATCH = `You are PATCHWORK's patch generator. A developer describes a change to make to a LIVE website without rebuilding it.
Return a patch as a list of small, reversible DOM operations applied to ONE target element.
Operations: setText{value}, setHTML{value}, setAttr{name,value (null removes the attribute)}, setStyle{prop (CSS property, kebab-case),value}, addClass{name}, removeClass{name}, remove, insert{position (beforebegin|afterbegin|beforeend|afterend), html}, css{rule (a complete CSS rule)}.
Rules: set unused fields to null. Prefer the fewest operations. Never output scripts. If the user selected an element, targetSelector must be null (the selected element is the target). If nothing is selected, targetSelector must be a CSS selector that exists in the page outline provided. Keep titles under 60 characters and make the explanation one sentence.`;

export async function generatePatch({ prompt, selected, outline }) {
  const user = [
    `Request: ${prompt}`,
    selected ? `Selected element:\n${JSON.stringify(selected).slice(0, 3500)}` : 'No element is selected.',
    outline ? `Page outline (tag selector "text"):\n${String(outline).slice(0, 6000)}` : ''
  ].join('\n\n');
  try {
    const out = await callJson(SYSTEM_PATCH, user, PATCH_SCHEMA);
    return { ...clean(out), provider: 'claude', model: MODEL };
  } catch (e) {
    return { ...mockPatch(prompt, selected), provider: 'mock', warning: `Claude unavailable (${lastError || e.message}); used the built-in rule-based assistant.` };
  }
}
function clean(out) {
  const ops = out.ops.map((o) => {
    const r = { type: o.type };
    for (const k of ['name', 'prop', 'value', 'html', 'position', 'rule']) if (o[k] != null) r[k] = o[k];
    if (o.type === 'setAttr' && o.value == null) r.value = null;
    return r;
  });
  return { title: out.title, explanation: out.explanation, targetSelector: out.targetSelector || null, ops };
}

const COLORS = { red: '#dc2626', blue: '#2563eb', green: '#16a34a', black: '#111827', white: '#ffffff', orange: '#ea580c', purple: '#7c3aed', pink: '#db2777', gray: '#4b5563', grey: '#4b5563', yellow: '#ca8a04', dark: '#111827' };
function mockPatch(prompt, selected) {
  const p = prompt.toLowerCase(), ops = []; let title = 'Custom tweak', why = 'Applied from your description (rule-based assistant).';
  const quoted = prompt.match(/["“'‘]([^"”'’]{1,120})["”'’]/);
  if (/\b(hide|remove|delete|get rid)\b/.test(p)) { ops.push({ type: 'remove' }); title = 'Hide element'; }
  if (quoted && /\b(text|say|reads?|rename|change|label|to)\b/.test(p)) { ops.push({ type: 'setText', value: quoted[1] }); title = `Change text to "${quoted[1].slice(0, 30)}"`; }
  if (/\b(enable|un-?disable|not disabled|clickable|fix the disabled)\b/.test(p)) { ops.push({ type: 'setAttr', name: 'disabled', value: null }); title = 'Enable element'; }
  const color = Object.keys(COLORS).find((c) => new RegExp(`\\b${c}\\b`).test(p));
  if (color) {
    const bg = /\b(background|bg|button)\b/.test(p) && !/\btext colou?r\b/.test(p);
    ops.push({ type: 'setStyle', prop: bg ? 'background-color' : 'color', value: COLORS[color] });
    if (bg && ['white', 'yellow'].indexOf(color) === -1) ops.push({ type: 'setStyle', prop: 'color', value: '#ffffff' });
    title = `Make it ${color}`;
  }
  if (/\b(bigger|larger|increase font)\b/.test(p)) { ops.push({ type: 'setStyle', prop: 'font-size', value: '1.25em' }); title = 'Increase font size'; }
  if (/\b(smaller|decrease font)\b/.test(p)) { ops.push({ type: 'setStyle', prop: 'font-size', value: '0.85em' }); title = 'Decrease font size'; }
  if (/\bbold\b/.test(p)) { ops.push({ type: 'setStyle', prop: 'font-weight', value: '700' }); title = 'Make bold'; }
  if (/\bround(ed)?\b/.test(p)) { ops.push({ type: 'setStyle', prop: 'border-radius', value: '999px' }); title = 'Round the corners'; }
  if (/\bcenter\b/.test(p)) { ops.push({ type: 'setStyle', prop: 'text-align', value: 'center' }); title = 'Center content'; }
  if (/\bcontrast|readable|hard to read\b/.test(p)) { ops.push({ type: 'setStyle', prop: 'color', value: '#1f2937' }); title = 'Improve text contrast'; }
  if (!ops.length) { why = 'The built-in assistant could not understand this request. Add an Anthropic API key to enable full natural-language patching.'; }
  const seen = new Set(); const uniq = ops.filter((o) => { const k = o.type + (o.prop || o.name || ''); if (seen.has(k)) return false; seen.add(k); return true; });
  return { title, explanation: why, targetSelector: selected ? null : null, ops: uniq };
}

export async function suggestResolution({ conflict, patchA, patchB }) {
  const system = `You are a careful code reviewer resolving a conflict between two website patches. Decide which to keep (keepA / keepB) or propose a merged value (custom, put the value in customValue). Prefer the change that is more correct, accessible, user-friendly and already reviewed. Keep reasoning to two sentences.`;
  const user = JSON.stringify({
    conflict: { kind: conflict.kind, key: conflict.key, message: conflict.message, aValue: conflict.aValue, bValue: conflict.bValue },
    A: { title: patchA.title, author: patchA.author, status: patchA.status, description: patchA.description },
    B: { title: patchB.title, author: patchB.author, status: patchB.status, description: patchB.description }
  });
  try { return { ...(await callJson(system, user, RESOLVE_SCHEMA)), provider: 'claude', model: MODEL }; }
  catch {
    const keepA = patchA.status === 'approved' || patchA.status === 'live' || patchB.status === 'draft';
    return { strategy: keepA ? 'keepA' : 'keepB', customValue: null, provider: 'mock', reasoning: `Rule-based pick: "${(keepA ? patchA : patchB).title}" is further along in review (${(keepA ? patchA : patchB).status}).` };
  }
}
