#!/usr/bin/env node
/**
 * compile-episode.mjs - turn an episode's beats into `episode.json`.
 *
 * A beat is the unit the writer works in (3-10 s, one thought, one line). A shot
 * is the unit the audience sees (1-3 s, one picture, one claim). This compiler is
 * where one becomes the other, and it is the only place allowed to decide it.
 *
 * Since the composition pass it is also where the *visual plan* is resolved and
 * checked. A shot is no longer "a world and a pose": it is a claim with a
 * camera, a focal subject, supporting subjects, a character role, a caption
 * treatment and a reason to cut. Those fields come from, in order:
 *
 *   1. `content/csv/visual.csv`, the authored plan (one row per beat);
 *   2. a per-type default, so an unplanned episode still compiles;
 *   3. the scene catalogue, which says what a world can actually draw.
 *
 * Everything is then validated. A shot whose fields disagree with each other -
 * an "object detail" with no object, a comparison with nothing to compare, a
 * wipe with no reason - fails here, before a frame exists.
 *
 * Usage:
 *   node tools/compile-episode.mjs              # every episode
 *   node tools/compile-episode.mjs 0102         # one, by id prefix
 *   node tools/compile-episode.mjs --check      # validate, write nothing
 *   node tools/compile-episode.mjs --report 0102  # print the plan, shot by shot
 *   node tools/compile-episode.mjs --json        # the compiled episodes on stdout
 *
 * Output: series/<series>/episodes/<slug>/episode.json  (git-ignored)
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LipSync = require(path.join(ROOT, 'src/stage/rig/lipsync.js'));

const FPS = 30;
const CSV = path.join(ROOT, 'content/csv');

// ---------------------------------------------------------------------------
// vocabularies
// ---------------------------------------------------------------------------

/**
 * The four-stage spine every episode has to walk. `title` is a chapter card: it
 * is allowed, it is neutral, and it may not stand in for any of the four.
 */
const STAGES = ['problem', 'mechanism', 'complication', 'resolution'];
const STAGE_RANK = { problem: 0, mechanism: 1, complication: 2, resolution: 3, title: null };

const STAGE_BY_BEAT_TYPE = {
  hook: 'problem',
  title: 'title',
  explain: 'mechanism',
  analogy: 'mechanism',
  'step-by-step': 'mechanism',
  'myth-check': 'complication',
  compare: 'complication',
  recap: 'resolution',
  outro: 'resolution',
};

const INTENTS = new Set([
  'provoke', 'frame', 'define', 'model-the-rule', 'break', 'introduce',
  'walk-the-loop', 'reframe', 'debunk', 'show-failure', 'recap', 'land-it',
]);

const CHARACTER_ROLES = new Set(['lead', 'present', 'react', 'absent']);

const CAPTION_TREATMENTS = new Set(['standard', 'punchline', 'steps', 'takeaway']);

/** How many shots a beat type is cut into, and what those shots are for. */
const SHOT_COUNTS = {
  hook: 2,
  title: 1,
  explain: 3,
  analogy: 4,
  'step-by-step': 4,
  'myth-check': 3,
  compare: 3,
  recap: 2,
  outro: 1,
};

/**
 * The default plan for a beat type, used when `visual.csv` has no row for it.
 *
 * These are intentionally conservative: no comparison (that needs a second
 * subject the default cannot promise) and no two consecutive shots with the same
 * camera.
 */
const DEFAULT_PLAN = {
  hook: { intent: 'provoke', compositions: ['object-detail', 'character-reaction'], caption: 'punchline' },
  title: { intent: 'frame', compositions: ['wide-establish'], caption: 'standard' },
  explain: { intent: 'define', compositions: ['object-detail', 'overhead-process', 'character-reaction'], caption: 'standard' },
  analogy: { intent: 'introduce', compositions: ['object-detail', 'overhead-process', 'object-detail', 'character-reaction'], caption: 'standard' },
  'step-by-step': { intent: 'walk-the-loop', compositions: ['wide-establish', 'object-detail', 'overhead-process', 'character-reaction'], caption: 'standard' },
  'myth-check': { intent: 'debunk', compositions: ['object-detail', 'overhead-process', 'character-reaction'], caption: 'standard' },
  compare: { intent: 'debunk', compositions: ['comparison', 'object-detail', 'character-reaction'], caption: 'standard' },
  recap: { intent: 'recap', compositions: ['overhead-process', 'character-reaction'], caption: 'steps' },
  outro: { intent: 'land-it', compositions: ['character-reaction'], caption: 'takeaway' },
};

/** Which action a composition adds to the beat's action. */
const ACTION_STAGE = {
  'wide-establish': 'establish',
  'object-detail': 'detail',
  'character-reaction': 'reaction',
  'overhead-process': 'process',
  comparison: 'contrast',
};

/** Subject options a world implies, per beat number. */
const SUBJECT_OPTIONS = {
  '0106': {
    2: { 'chat-bubble': { question: '"how do I get to the station?"', answer: 'turn left, then follow the river' } },
    3: { calendar: { caption: 'this week' } },
    4: { invite: { title: 'Meeting, Thursday 3 pm', sub: 'two slots compared · one chosen' } },
    6: { 'steps-row': { items: ['PLAN', 'USE A TOOL', 'CHECK'] } },
    8: { checkpoint: { chip: 'APPROVE' } },
    7: { invite: { wrong: true, title: 'Meeting, Thursday 3 pm', sub: 'you asked for Friday' } },
    9: { versus: {}, 'cat-pillow': { card: 'CHECK RESULT' } },
    10: { versus: {} },
  },
  '0107': {
    1: { 'url-bar': { text: 'nao.explains/cat', caption: 'six words, one page' }, 'page-stage': { url: 'nao.explains/cat' } },
    2: { 'dns-directory': { hit: 0 }, 'address-card': {} },
    3: { 'address-card': { name: 'nao.explains', ip: '203.0.113.7', kicker: 'the answer' } },
    4: { 'link-path': { near: 'you', far: 'the server' } },
    5: { 'https-lock': { caption: 'nobody in the middle can read it' }, 'link-path': { secure: true } },
    6: { 'request-envelope': { label: 'GET /cat' }, 'link-path': { near: 'you', far: 'the server' } },
    7: { 'file-cards': { files: [['HTML', 'the words', null], ['CSS', 'the look', null], ['JS', 'the behaviour', null], ['IMG', 'the pictures', null]] } },
    8: { 'page-stage': { assemble: true, url: 'nao.explains/cat' }, 'cat-pillow': { stack: true } },
    9: { 'page-stage': { broken: true, missing: 'hero', missingName: 'hero.jpg did not load' } },
    10: { 'steps-row': { items: ['FIND', 'CONNECT', 'REQUEST', 'RENDER'] } },
  },
  '0102': {
    5: { 'rule-cards': { broken: true }, 'rule-machine': { broken: true } },
    10: { checkpoint: { failing: true } },
    12: { signpost: { kicker: 'ask where', text: 'the check is' } },
  },
};

const EMPHASIS_WORDS = new Set([
  'not', 'never', 'one', 'two', 'three', 'four', 'loop', 'check', 'goal',
  'tools', 'rules', 'model', 'automation', 'vibes', 'genius', 'robot', 'same',
]);

// ---------------------------------------------------------------------------
// csv
// ---------------------------------------------------------------------------

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift().map((h) => h.trim());
  return rows
    .filter((r) => r.length === header.length && r.some((v) => v.trim()))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i].trim()])));
}

const readCsv = (name) => {
  const file = path.join(CSV, name);
  return fs.existsSync(file) ? parseCsv(fs.readFileSync(file, 'utf8')) : [];
};
const cleanId = (v) => String(v).replace(/^'+/, '').trim();
const slug = (text) => String(text).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const listOf = (cell, sep = '|') => String(cell || '').split(sep).map((s) => s.trim()).filter(Boolean);

// ---------------------------------------------------------------------------
// scenes, from the stage
// ---------------------------------------------------------------------------

const stageModule = await import(path.join('file://', ROOT, 'src/stage/reel/worlds-episode.js'));
const { SCENES, SUBJECTS, SUBJECT_ROLES, SUBJECT_IDS } = stageModule;
const { COMPOSITION_IDS, CAMERAS, FRAME_FOR_COMPOSITION } = await import(
  path.join('file://', ROOT, 'src/stage/reel/composition.js')
);

/** The world an episode's beats are drawn in. */
const EPISODE_WORLDS = {
  '0101': {
    1: 'ep_cloud_photo', 2: 'ep_cloud_title', 3: 'ep_cloud_photo', 4: 'ep_cloud_racks',
    5: 'ep_cloud_racks', 6: 'ep_cloud_heat', 7: 'ep_cloud_copies', 8: 'ep_cloud_copies',
    9: 'ep_cloud_heat', 10: 'ep_cloud_racks', 11: 'ep_cloud_copies', 12: 'ep_cloud_outro',
  },
  '0102': {
    1: 'ep_checklist', 2: 'ep_title', 3: 'ep_steps', 4: 'ep_rules',
    5: 'ep_rules_broken', 6: 'ep_pile', 7: 'ep_loop', 8: 'ep_loop',
    9: 'ep_gate', 10: 'ep_gate', 11: 'ep_loop', 12: 'ep_outro',
  },
  '0103': {
    1: 'ep_free_title', 2: 'ep_free_title', 3: 'ep_free_tools', 4: 'ep_free_tools',
    5: 'ep_free_tools', 6: 'ep_free_tools', 7: 'ep_free_tools', 8: 'ep_free_tools',
    9: 'ep_free_scale', 10: 'ep_free_scale', 11: 'ep_free_tools', 12: 'ep_free_outro',
  },
  '0106': {
    1: 'ep_ai_panels', 2: 'ep_ai_chatbot', 3: 'ep_ai_agent', 4: 'ep_ai_invite',
    5: 'ep_ai_setup', 6: 'ep_ai_steps', 7: 'ep_ai_mistake', 8: 'ep_ai_permissions',
    9: 'ep_ai_recap', 10: 'ep_ai_outro',
  },
  '0107': {
    1: 'ep_url_hook', 2: 'ep_url_dns', 3: 'ep_url_address', 4: 'ep_url_connect',
    5: 'ep_url_https', 6: 'ep_url_request', 7: 'ep_url_response', 8: 'ep_url_render',
    9: 'ep_url_broken', 10: 'ep_url_recap', 11: 'ep_url_outro',
  },
  '0104': {
    1: 'ep_wifi_title', 2: 'ep_wifi_title', 3: 'ep_wifi_router', 4: 'ep_wifi_channels',
    5: 'ep_wifi_channels', 6: 'ep_wifi_crowd', 7: 'ep_wifi_crowd', 8: 'ep_wifi_router',
    9: 'ep_wifi_channels', 10: 'ep_wifi_channels', 11: 'ep_wifi_crowd', 12: 'ep_wifi_outro',
  },
};

const POSE_BY_EXPRESSION = {
  surprised: 'openhands2',
  confident: 'presenting',
  neutral: 'neutral',
  focused: 'pointing',
  confused: 'thinking',
  thinking: 'thinking',
  emphatic: 'onefinger',
  skeptical: 'skeptical',
  angry: 'nope',
  relieved: 'warm',
  wink: 'fingerheart',
  happy: 'warm',
};

/**
 * One pose per beat is why the first half of a film read as a still: three cuts
 * in a row landed on the same drawing, so the only thing that moved was the
 * camera. A beat is 2-4 shots long, so every expression names a *performance*
 * instead - one pose for each insert, and one for the close-up, which is the
 * shot where her face is the new information. The orders are per-shot, not
 * random, so a render is still frame-for-frame reproducible.
 */
const PERFORMANCE = {
  // 'openhands' is the clasped-hands pose and 'openhands2' is the wide one, so
  // the wide version is the one that reads as an open question.
  curious: { inserts: ['presenting', 'pointing'], close: 'openhands2' },
  neutral: { inserts: ['presenting', 'pointing'], close: 'explaining' },
  confident: { inserts: ['explaining', 'pointing'], close: 'presenting' },
  focused: { inserts: ['thinking', 'pointing'], close: 'explaining' },
  skeptical: { inserts: ['skeptical', 'nope'], close: 'skeptical' },
  emphatic: { inserts: ['onefinger', 'pointing'], close: 'onefinger' },
  confused: { inserts: ['thinking', 'skeptical'], close: 'thinking' },
  thinking: { inserts: ['thinking', 'skeptical'], close: 'thinking' },
  relieved: { inserts: ['presenting'], close: 'warm' },
  wink: { inserts: ['warm'], close: 'fingerheart' },
  surprised: { inserts: ['openhands2', 'presenting'], close: 'openhands2' },
  happy: { inserts: ['presenting', 'warm'], close: 'warm' },
  angry: { inserts: ['nope', 'skeptical'], close: 'nope' },
};

/** An episode can overrule one beat when the expression is not the performance. */
const PERFORMANCE_BY_BEAT = {
  // the gate opens: she does not say "no", she holds an open palm and waits
  8: { inserts: ['nope', 'pointing'], close: 'nope' },
};

function performanceFor(beat, shotIndex, isReactionShot) {
  const beatTable = PERFORMANCE_BY_BEAT[Number(beat.beat_no)];
  const table = beatTable || PERFORMANCE[beat.expression] || null;
  const fallback = POSE_BY_EXPRESSION[beat.expression] || 'presenting';
  if (!table) return fallback;
  if (isReactionShot) return table.close || fallback;
  const inserts = table.inserts && table.inserts.length ? table.inserts : [fallback];
  return inserts[shotIndex % inserts.length];
}

const TRANSITIONS = { wipe: 'whip', fade: 'cut', none: 'cut', cut: 'cut' };

// ---------------------------------------------------------------------------
// text -> caption
// ---------------------------------------------------------------------------

function emphasisFor(text) {
  const hits = [];
  for (const raw of String(text).split(/\s+/)) {
    const word = raw.toLowerCase().replace(/[^a-z0-9'-]/g, '');
    if (EMPHASIS_WORDS.has(word) && !hits.includes(word)) hits.push(word);
    if (hits.length === 2) break;
  }
  return hits;
}

/** Rows for a `steps` caption: one row per sentence, in order. */
function stepRowsFor(text) {
  return String(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/[.!?]$/, '').trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// the plan
// ---------------------------------------------------------------------------

function planFor(episodeId, beat, world) {
  const scene = SCENES[world] || { subjects: [], kicker: '' };
  const type = beat.beat_type;
  const fallback = DEFAULT_PLAN[type] || DEFAULT_PLAN.explain;
  const authored = PLANS.get(`${episodeId}:${beat.beat_no}`) || {};

  const compositions = authored.compositions && authored.compositions.length
    ? authored.compositions
    : fallback.compositions;

  const focal = authored.focal || scene.subjects[0] || 'loop-row';
  const supporting = authored.supporting
    ? authored.supporting
    : (scene.subjects[1] ? [scene.subjects[1]] : []);

  return {
    stage: authored.stage || STAGE_BY_BEAT_TYPE[type] || 'mechanism',
    intent: authored.intent || fallback.intent,
    compositions,
    focal,
    supporting,
    characterRole: authored.characterRole || (type === 'hook' || type === 'outro' ? 'lead' : 'react'),
    action: authored.action || `${type}-${slug(beat.on_screen_text || beat.narration).slice(0, 40)}`,
    captionTreatment: authored.captionTreatment || fallback.caption,
    // Every shot says why it is joined to the next one. A cut is the default
    // and it still needs a stated reason, because "cut" is a decision too.
    transitionReason: authored.transitionReason || (authored.hold
      ? 'same framing held on purpose'
      : beat.transition && beat.transition !== 'none' && beat.transition !== 'cut'
        ? `${type}-changes-what-the-viewer-has-to-hold`
        : 'new-information-cuts-away'),
    rationale: authored.rationale || '',
    authored: Boolean(PLANS.get(`${episodeId}:${beat.beat_no}`)),
    kicker: authored.kicker || scene.kicker || '',
    hold: Boolean(authored.hold),
  };
}

// ---------------------------------------------------------------------------
// compile
// ---------------------------------------------------------------------------

function framesFor(beat, n) {
  const total = Math.round(Number(beat.duration_s) * FPS);
  const base = Math.floor(total / n);
  const out = new Array(n).fill(base);
  for (let i = 0; i < total - base * n; i++) out[i] += 1;
  return out;
}

/** Turn a beat + its plan into shots. Pure: no I/O, so validation can reuse it. */
function shotsForBeat(beat, plan) {
  const n = plan.compositions.length;
  const frames = framesFor(beat, n);
  const rows = stepRowsFor(beat.narration);
  const emphasis = [
    ...String(beat.emphasis || '').split(';').map((w) => w.trim().toLowerCase()).filter(Boolean),
    ...emphasisFor(beat.narration),
  ].filter((w, i, all) => all.indexOf(w) === i).slice(0, 2);

  return plan.compositions.map((composition, i) => {
    const reaction = composition === 'character-reaction';
    const frameRule = FRAME_FOR_COMPOSITION[composition];
    const role = reaction ? 'lead' : plan.characterRole;
    const placement = (frameRule?.placements || {})[role] || 'off';
    const code = frameRule?.code || 'INSERT';

    const subjects = reaction
      ? []
      : [
        { id: plan.focal, role: 'focal' },
        ...plan.supporting.filter((id) => id !== plan.focal).map((id) => ({ id, role: SUBJECTS[id]?.role || 'supporting' })),
      ];

    return {
      beat: Number(beat.beat_no),
      beatType: beat.beat_type,
      stage: plan.stage,
      index: i,
      of: n,
      composition,
      visualIntent: plan.intent,
      focalSubject: reaction ? 'nao' : plan.focal,
      supportingSubjects: reaction ? [] : plan.supporting,
      characterRole: role,
      action: plan.action,
      actionStage: ACTION_STAGE[composition] || 'beat',
      transitionReason: plan.transitionReason,
      rationale: plan.rationale,
      hold: plan.hold,
      composition2: undefined,
      code,
      placement,
      frames: frames[i],
      captionTreatment: plan.captionTreatment,
      // A beat with no narration (a silent outro card) still needs words on
      // screen; the board text is what the sheet intended the viewer to read.
      captionText: String(beat.narration || beat.on_screen_text || '').trim(),
      captionSteps: plan.captionTreatment === 'steps' ? rows : undefined,
      emphasis,
      kicker: plan.kicker,
      subjects,
      focus: beat.beat_type === 'step-by-step'
        ? ['goal', 'tools', 'check', 'again'][i]
        : (Number(beat.beat_no) === 8 ? 'tools' : undefined),
      world: EWorld(beat),
      pose: performanceFor(beat, i, reaction),
      transition: i === 0 ? (TRANSITIONS[beat.transition] || 'cut') : 'cut',
    };
  });
}

let EPISODE_IN_CONTEXT = null;
function EWorld(beat) {
  const id = EPISODE_IN_CONTEXT;
  return (EPISODE_WORLDS[id] && EPISODE_WORLDS[id][beat.beat_no]) || 'ep_title';
}

// ---------------------------------------------------------------------------
// validation
// ---------------------------------------------------------------------------

function validateEpisode(episode, plans, beats) {
  const errors = [];
  const warnings = [];
  const where = `${episode.episode_id}`;

  // The spine is a gate on production, not on drafting. An episode with an
  // authored visual plan - or one that has already been built - must walk all
  // four stages in order; an episode still being written is only warned, because
  // a draft is allowed to be missing its complication.
  const strict = [...plans.values()].some((p) => p.authored)
    || ['built', 'rendered', 'published'].includes(String(episode.status || '').toLowerCase());
  const spine = (msg) => (strict ? errors : warnings).push(msg);

  // ---- the spine ---------------------------------------------------------
  const stageOrder = [];
  for (const beat of beats) {
    const plan = plans.get(beat.beat_no);
    if (!STAGES.includes(plan.stage) && plan.stage !== 'title') {
      errors.push(`${where} beat ${beat.beat_no}: unknown stage "${plan.stage}"`);
      continue;
    }
    if (plan.stage !== 'title' && !stageOrder.includes(plan.stage)) stageOrder.push(plan.stage);
  }
  const missing = STAGES.filter((s) => !stageOrder.includes(s));
  if (missing.length) spine(`${where}: story never reaches ${missing.join(', ')}`);
  for (let i = 1; i < stageOrder.length; i++) {
    if (STAGE_RANK[stageOrder[i]] < STAGE_RANK[stageOrder[i - 1]]) {
      spine(`${where}: stage "${stageOrder[i]}" starts after "${stageOrder[i - 1]}" - the spine must open each stage in order`);
    }
  }
  const firstResolution = beats.find((b) => plans.get(b.beat_no).stage === 'resolution');
  if (firstResolution) {
    const at = Number(firstResolution.beat_no);
    if (at < Math.ceil(beats.length * 0.6)) {
      warnings.push(`${where}: resolution starts at beat ${at} of ${beats.length}, early for an earned ending`);
    }
  }

  // ---- each beat ---------------------------------------------------------
  for (const beat of beats) {
    const plan = plans.get(beat.beat_no);
    const tag = `${where} beat ${beat.beat_no}`;
    const scene = SCENES[plan.world] || { subjects: [] };
    const catalogue = new Set(SUBJECT_IDS);
    const inScene = new Set(scene.subjects);

    if (!INTENTS.has(plan.intent)) errors.push(`${tag}: intent "${plan.intent}" is not in the vocabulary`);
    if (!CHARACTER_ROLES.has(plan.characterRole)) errors.push(`${tag}: character role "${plan.characterRole}" is not one of ${[...CHARACTER_ROLES].join(', ')}`);
    if (!CAPTION_TREATMENTS.has(plan.captionTreatment)) errors.push(`${tag}: caption treatment "${plan.captionTreatment}" is not one of ${[...CAPTION_TREATMENTS].join(', ')}`);
    if (plan.captionTreatment === 'takeaway' && plan.stage !== 'resolution') errors.push(`${tag}: a takeaway caption only belongs in the resolution`);
    if (plan.captionTreatment === 'steps' && stepRowsFor(beat.narration).length < 2) warnings.push(`${tag}: "steps" caption has only one step`);

    // the cut
    const expected = SHOT_COUNTS[beat.beat_type] || 1;
    if (plan.compositions.length !== expected) {
      errors.push(`${tag}: ${beat.beat_type} is cut into ${expected} shot${expected === 1 ? '' : 's'}, the plan lists ${plan.compositions.length}`);
    }
    plan.compositions.forEach((composition, i) => {
      if (!COMPOSITION_IDS.includes(composition)) {
        errors.push(`${tag}: shot ${i + 1}: unknown composition "${composition}"`);
        return;
      }
      if (composition === 'character-reaction' && plan.characterRole === 'absent') {
        errors.push(`${tag}: shot ${i + 1}: a reaction shot with the character absent`);
      }
      if (composition === 'comparison' && !plan.supporting.length && plan.characterRole === 'absent') {
        errors.push(`${tag}: shot ${i + 1}: a comparison needs a second thing to compare`);
      }
      if (i > 0 && plan.compositions[i - 1] === composition && !plan.hold) {
        errors.push(`${tag}: shots ${i} and ${i + 1} use the same camera "${composition}" with nothing changing between them (mark the beat as a deliberate hold if that is the intent)`);
      }
    });

    // the subjects
    if (!catalogue.has(plan.focal)) {
      errors.push(`${tag}: focal subject "${plan.focal}" has no painter in the catalogue`);
    }
    // The scene is what the world draws by default; the plan may ask for
    // anything the catalogue can draw, but a subject the scene never mentions is
    // worth saying out loud - it is usually a typo or a leftover.
    if (!inScene.has(plan.focal)) {
      warnings.push(`${tag}: "${plan.focal}" is not in the ${plan.world} scene, which draws ${[...inScene].join(', ')}`);
    }
    for (const id of plan.supporting) {
      if (!catalogue.has(id)) errors.push(`${tag}: supporting subject "${id}" has no painter in the catalogue`);
      if (!SUBJECTS[id]) errors.push(`${tag}: supporting subject "${id}" has no definition`);
      if (id === plan.focal) errors.push(`${tag}: "${id}" cannot be both the focal subject and a supporting one`);
    }
    for (const id of [plan.focal, ...plan.supporting]) {
      if (SUBJECTS[id] && !SUBJECT_ROLES.includes(SUBJECTS[id].role)) {
        errors.push(`${tag}: subject "${id}" has role "${SUBJECTS[id].role}", which is not a role`);
      }
    }

    // the action is a claim about a change, not a label
    if (!/^[a-z0-9]+(-[a-z0-9]+){1,}$/.test(plan.action)) {
      errors.push(`${tag}: action "${plan.action}" should be a kebab-case description of what changes (at least two words)`);
    }
    if (plan.action === 'undefined' || plan.action.includes('undefined')) errors.push(`${tag}: the action did not resolve`);

    // the cut reason
    if (beat.transition && beat.transition !== 'none' && beat.transition !== 'cut' && !plan.transitionReason) {
      errors.push(`${tag}: a ${beat.transition} transition needs a transitionReason`);
    }

    // the five questions
    if (!plan.rationale) warnings.push(`${tag}: no rationale written for the visual choice`);
  }

  // ---- no two beats may make the same claim ------------------------------
  let prev = null;
  for (const beat of beats) {
    const plan = plans.get(beat.beat_no);
    if (prev && prev.action === plan.action) {
      errors.push(`${where} beat ${beat.beat_no}: same action as beat ${prev.beatNo} ("${plan.action}") - the viewer learns nothing new`);
    }
    prev = { action: plan.action, beatNo: beat.beat_no };
  }

  // ---- she has to be seen ------------------------------------------------
  const shots = [];
  EPISODE_IN_CONTEXT = episode.episode_id;
  for (const beat of beats) shots.push(...shotsForBeat(beat, plans.get(beat.beat_no)));
  const onScreen = shots.filter((s) => s.placement !== 'off' && s.placement !== 'absent').length;
  const share = onScreen / shots.length;
  if (share < 0.3) warnings.push(`${where}: she is on screen in ${Math.round(share * 100)} % of shots`);

  // ---- reading check -----------------------------------------------------
  for (const beat of beats) {
    const words = String(beat.narration || '').split(/\s+/).filter(Boolean).length;
    const needed = words / 4 + 0.6;
    if (Number(beat.duration_s) + 1e-6 < needed) {
      warnings.push(`${where} beat ${beat.beat_no}: caption needs ${needed.toFixed(1)} s, has ${beat.duration_s} s`);
    }
  }

  return { errors, warnings, shots, onScreenShare: share };
}

// ---------------------------------------------------------------------------
// compile one episode
// ---------------------------------------------------------------------------

function compileEpisode(rawEpisode, allBeats) {
  const episode = { ...rawEpisode, episode_id: cleanId(rawEpisode.episode_id) };
  EPISODE_IN_CONTEXT = episode.episode_id;

  const beats = allBeats
    .filter((b) => cleanId(b.episode_id) === episode.episode_id)
    .sort((a, b) => Number(a.beat_no) - Number(b.beat_no));
  if (!beats.length) throw new Error(`${episode.episode_id}: no beats`);

  const seriesSlug = slug(episode.series);
  const dir = path.join(ROOT, 'series', seriesSlug, 'episodes', episode.slug);
  const scriptFile = path.join(dir, 'script.md');
  if (!fs.existsSync(scriptFile)) throw new Error(`${episode.episode_id}: no script.md at ${dir}`);

  // ---- resolve the plan, beat by beat ------------------------------------
  const plans = new Map();
  for (const beat of beats) {
    const world = (EPISODE_WORLDS[episode.episode_id] || {})[beat.beat_no] || 'ep_title';
    const plan = planFor(episode.episode_id, beat, world);
    plan.world = world;
    plan.beatNo = Number(beat.beat_no);
    plans.set(beat.beat_no, plan);
  }

  // A default action is derived from the on-screen text, and two beats can share
  // that text ("The loop"). Authored plans must be unique and are checked; a
  // derived one gets its beat number appended so the film can still be compiled.
  const seenActions = new Map();
  for (const [no, plan] of plans) {
    if (plan.authored) continue;
    if (seenActions.has(plan.action)) plan.action = `${plan.action}-${no}`;
    seenActions.set(plan.action, no);
  }

  const check = validateEpisode(episode, plans, beats);
  if (check.errors.length) {
    const err = new Error(`${episode.episode_id}: ${check.errors.length} plan error(s)\n  - ${check.errors.join('\n  - ')}`);
    err.validation = check;
    throw err;
  }

  // ---- assemble ----------------------------------------------------------
  const shots = [];
  let cursor = 0;
  let n = 0;
  let stageSeen = new Set();

  for (const beat of beats) {
    const plan = plans.get(beat.beat_no);
    const beatShots = shotsForBeat(beat, plan);
    const firstOfStage = !stageSeen.has(plan.stage);
    if (plan.stage !== 'title') stageSeen.add(plan.stage);

    beatShots.forEach((s, i) => {
      n += 1;
      const start = cursor;
      cursor += s.frames;

      const voice = {
        offset: 3,
        schedule: LipSync.buildSchedule(s.captionText, Math.max(2, s.frames - 8), {
          mode: 'mid',
          fps: FPS,
          emphasis: s.emphasis,
        }).frames,
      };

      // the last shot of the film carries the disclosure; filled in below
      const isLastShot = shots.length === 0 ? false : false;
      shots.push({
        n,
        beat: s.beat,
        beatType: s.beatType,
        stage: s.stage,
        visualIntent: s.visualIntent,
        composition: s.composition,
        focalSubject: s.focalSubject,
        supportingSubjects: s.supportingSubjects,
        characterRole: s.characterRole,
        action: s.action,
        actionStage: s.actionStage,
        transitionReason: s.transitionReason,
        start,
        frames: s.frames,
        end: start + s.frames,
        code: s.code,
        lens: s.code === 'CU' ? '85mm' : s.code === 'INSERT' ? '100mm' : '50mm',
        framing: beat.camera || beat.beat_type,
        placement: s.placement,
        world: s.world,
        kicker: s.kicker,
        subjects: s.subjects,
        subjectOptions: (SUBJECT_OPTIONS[episode.episode_id] || {})[beat.beat_no] || {},
        focus: s.focus,
        pose: s.placement === 'off' || s.placement === 'absent' ? null : s.pose,
        transition: s.transition,
        vo: s.captionText,
        mouth: voice,
        caption: {
          text: s.captionText,
          treatment: s.captionTreatment,
          steps: s.captionSteps,
          emphasis: s.emphasis,
        },
        chrome: {
          badge: n === 1 || firstOfStage || false,
          progress: n !== 1,
          // the presenter is illustrated and has to say so; the line rides on
          // the last shot of the film, where the sign-off already is
          disclosure: isLastShot,
        },
        purpose: {
          viewerKnows: i === 0 ? (shots.length ? shots[shots.length - 1].action : 'cold open') : `${s.action} (part ${i + 1})`,
          newInformation: s.action,
          screenChange: `${s.composition} · ${s.focalSubject}`,
          whyThisVisual: plan.rationale || CAMERAS[s.composition]?.why || '',
          nextBeatBuildsOn: '',
        },
      });
    });
  }

  if (cursor !== Math.round(Number(episode.target_seconds) * FPS)) {
    throw new Error(
      `${episode.episode_id}: beats total ${cursor} frames, header says ${Math.round(Number(episode.target_seconds) * FPS)}`
    );
  }

  // ---- fix-ups that need the whole film ---------------------------------
  const last = shots[shots.length - 1];
  last.transition = 'cut';           // nothing to cut to
  last.chrome.badge = true;
  // the disclosure rides the last shot, where the sign-off already is
  last.chrome.disclosure = true;
  last.caption.treatment = last.caption.treatment === 'takeaway' ? 'takeaway' : last.caption.treatment;
  for (let i = 0; i < shots.length; i++) {
    const next = shots[i + 1];
    shots[i].purpose.nextBeatBuildsOn = next ? next.action : 'the viewer leaves with the question';
    shots[i].chrome.progress = !(i === 0 || i === shots.length - 1);
  }

  // ---- metadata ----------------------------------------------------------
  const onScreen = shots.filter((s) => s.placement !== 'off' && s.placement !== 'absent').length;

  return {
    id: episode.episode_id,
    kind: 'episode',
    slug: episode.slug,
    title: episode.title,
    question: episode.question,
    series: episode.series,
    seriesSlug,
    level: episode.level,
    seconds: Number(episode.target_seconds),
    frames: cursor,
    fps: FPS,
    shotCount: shots.length,
    beatCount: beats.length,
    averageShot: Number((Number(episode.target_seconds) / shots.length).toFixed(2)),
    onScreenShare: Number((onScreen / shots.length).toFixed(2)),
    walkaway: episode.answer_oneliner,
    spine: STAGES.map((stage) => ({
      stage,
      beats: beats.filter((b) => plans.get(b.beat_no).stage === stage).map((b) => Number(b.beat_no)),
    })),
    shots,
    source: {
      script: path.relative(ROOT, scriptFile),
      csv: 'content/csv/beats.csv',
      plan: PLANS.size ? 'content/csv/visual.csv' : '(default plan)',
      // authored = this episode has rows in visual.csv, so its shots were chosen
      // by hand rather than split mechanically from the beat sheet. The strict
      // quality gates apply to authored episodes.
      authored: beats.some((b) => PLANS.has(`${episode.episode_id}:${Number(b.beat_no)}`)),
    },
    compiledBy: 'tools/compile-episode.mjs',
  };
}

// ---------------------------------------------------------------------------
// the authored plan
// ---------------------------------------------------------------------------

/**
 * `content/csv/visual.csv` - one row per beat.
 *
 * Columns: episode_id, beat_no, stage, intent, focal, supporting,
 * character_role, action, caption_treatment, compositions, transition_reason,
 * kicker, rationale, hold
 *
 * `supporting` is `;`-separated, `compositions` is `|`-separated.
 */
const PLANS = new Map();
for (const row of readCsv('visual.csv')) {
  const episodeId = cleanId(row.episode_id);
  PLANS.set(`${episodeId}:${Number(row.beat_no)}`, {
    stage: (row.stage || '').trim(),
    intent: (row.intent || '').trim(),
    focal: (row.focal || '').trim(),
    supporting: listOf(row.supporting, ';'),
    characterRole: (row.character_role || '').trim(),
    action: (row.action || '').trim(),
    captionTreatment: (row.caption_treatment || '').trim(),
    compositions: listOf(row.compositions, '|'),
    transitionReason: (row.transition_reason || '').trim(),
    kicker: (row.kicker || '').trim(),
    rationale: (row.rationale || '').trim(),
    hold: /^(true|yes|1)$/i.test(String(row.hold || '').trim()),
  });
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function report(reel) {
  console.log(`\n${reel.id}  ${reel.title}  —  ${reel.seconds.toFixed(1)} s, ${reel.shotCount} shots, she is on screen ${Math.round(reel.onScreenShare * 100)} % of the time`);
  console.log(`spine: ${reel.spine.map((s) => `${s.stage} (${s.beats.join(',')})`).join('  →  ')}`);
  const pad = (s, n) => String(s).padEnd(n).slice(0, n);
  console.log(`\n${pad('#', 3)}${pad('stage', 14)}${pad('camera', 20)}${pad('focal', 14)}${pad('role', 8)}${pad('action', 28)}caption`);
  for (const s of reel.shots) {
    console.log(
      `${pad(s.n, 3)}${pad(s.stage, 14)}${pad(s.composition, 20)}${pad(s.focalSubject, 14)}${pad(s.characterRole, 8)}${pad(s.action, 28)}${s.caption.treatment}`
    );
  }
  console.log('');
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const showReport = args.includes('--report');
  // The test suite needs the compiled plan without a compiled artefact on disk:
  // episode.json is a build output, and a test that reads it can pass on a stale
  // file from a previous branch.
  const asJson = args.includes('--json');
  const wanted = args.find((a) => !a.startsWith('--'));

  const episodes = readCsv('episodes.csv').map((e) => ({ ...e, episode_id: cleanId(e.episode_id) }));
  const beats = readCsv('beats.csv').map((b) => ({ ...b, episode_id: cleanId(b.episode_id) }));
  let compiled = 0;
  const problems = [];
  const out = [];

  for (const episode of episodes) {
    if (wanted && !episode.episode_id.startsWith(wanted) && !episode.slug.includes(wanted)) continue;
    try {
      const reel = compileEpisode(episode, beats);
      out.push(reel);
      if (check || asJson) {
        // nothing written
      } else {
        const dir = path.join(ROOT, 'series', reel.seriesSlug, 'episodes', reel.slug);
        fs.writeFileSync(path.join(dir, 'episode.json'), `${JSON.stringify(reel, null, 2)}\n`);
      }
      if (!asJson) console.log(
        `  ${check ? 'ok ' : '→  '} ${reel.id}  ${reel.seconds.toFixed(1)}s  ${reel.frames} frames  ` +
        `${reel.beatCount} beats · ${reel.shotCount} shots · ${Math.round(reel.onScreenShare * 100)}% with her  ${reel.series}`
      );
      if (showReport && !asJson) report(reel);
      compiled += 1;
    } catch (err) {
      problems.push(err.message);
    }
  }

  if (!compiled) throw new Error(`no episode matched ${wanted || '(all)'}`);
  if (problems.length) {
    console.error(`\n${problems.length} episode(s) failed the plan check:\n${problems.join('\n')}`);
    process.exit(1);
  }
  if (asJson) {
    process.stdout.write(`${JSON.stringify({ episodes: out }, null, 2)}\n`);
    if (problems.length) process.exit(1);
    return;
  }
  console.log(`\n${compiled} episode(s) ${check ? 'validated' : 'compiled'}.`);
}

main();
