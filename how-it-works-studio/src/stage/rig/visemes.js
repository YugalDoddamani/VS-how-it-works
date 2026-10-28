/**
 * visemes.js - grapheme to viseme mapping for Nao's lip-sync.
 *
 * Pure functions only. No clock, no randomness, no audio, no DOM. Loaded as a
 * plain <script> in the browser and required from Node by the tests, exactly
 * like timeline.js and motion.js.
 *
 * The viseme set is fixed by the talking-head sheet (assets/nao/visemes/):
 *   rest A E I O U W MBP FV L SZTD CGK
 *
 * Spelling is not pronunciation, so this is an ordered grapheme matcher with a
 * short exception dictionary, not a pronunciation model. See docs/11-lip-sync.md.
 */
(function (global) {
  'use strict';

  var VISEMES = ['rest', 'A', 'E', 'I', 'O', 'U', 'W', 'MBP', 'FV', 'L', 'SZTD', 'CGK'];

  /**
   * How open the mouth is for each viseme, 0..1. Used directly in talking-head
   * mode and to interpolate a jaw offset in full-body mode.
   */
  var OPENNESS = {
    rest: 0.0,
    MBP: 0.05,
    SZTD: 0.2,
    FV: 0.25,
    W: 0.3,
    U: 0.4,
    L: 0.6,
    CGK: 0.5,
    I: 0.55,
    E: 0.65,
    O: 0.75,
    A: 1.0,
  };

  /**
   * Words the rule list gets reliably wrong. Keyed lowercase, value is the
   * viseme sequence. Keep this short - every entry is a special case someone
   * has to maintain.
   */
  var EXCEPTIONS = {
    a: ['A'],
    an: ['A', 'CGK'],
    the: ['SZTD', 'E'],
    of: ['A', 'FV'],
    off: ['O', 'FV'],
    one: ['W', 'A', 'CGK'],
    once: ['W', 'A', 'SZTD'],
    two: ['SZTD', 'U'],
    who: ['CGK', 'U'],
    whose: ['CGK', 'U', 'SZTD'],
    what: ['W', 'A', 'SZTD'],
    was: ['W', 'A', 'SZTD'],
    were: ['W', 'E'],
    where: ['W', 'E'],
    there: ['SZTD', 'E'],
    their: ['SZTD', 'E'],
    they: ['SZTD', 'E'],
    though: ['SZTD', 'O'],
    through: ['SZTD', 'U'],
    thought: ['SZTD', 'O', 'SZTD'],
    enough: ['I', 'CGK', 'A', 'FV'],
    laugh: ['L', 'A', 'FV'],
    you: ['I', 'U'],
    your: ['I', 'O'],
    sure: ['CGK', 'U'],
    said: ['SZTD', 'E', 'SZTD'],
    says: ['SZTD', 'E', 'SZTD'],
    does: ['SZTD', 'A', 'SZTD'],
    done: ['SZTD', 'A', 'CGK'],
    have: ['CGK', 'A', 'FV'],
    give: ['CGK', 'I', 'FV'],
    live: ['L', 'I', 'FV'],
    love: ['L', 'A', 'FV'],
    people: ['MBP', 'I', 'MBP', 'U', 'L'],
    because: ['MBP', 'I', 'CGK', 'O', 'SZTD'],
    internet: ['I', 'CGK', 'SZTD', 'E', 'L', 'CGK', 'E', 'SZTD'],
    data: ['SZTD', 'E', 'SZTD', 'A'],
    wifi: ['W', 'I', 'FV', 'I'],
    ai: ['E', 'I'],
    ok: ['O', 'CGK', 'E'],
    okay: ['O', 'CGK', 'E'],
  };

  /**
   * Ordered rules. First match wins; the longest match at a position is taken.
   * `re` is anchored at the current position by the matcher.
   */
  var RULES = [
    { re: /^(tion|sion)/, v: 'CGK' },
    { re: /^(tch|ch|sh)/, v: 'CGK' },
    { re: /^th/, v: 'SZTD' },
    { re: /^ph/, v: 'FV' },
    { re: /^qu/, v: 'W' },
    { re: /^(oo|ou|ew)/, v: 'U' },
    { re: /^(ee|ea|ie)/, v: 'I' },
    { re: /^(ai|ay|ei)/, v: 'E' },
    { re: /^(oa|au|aw)/, v: 'O' },
    { re: /^ow/, v: 'O' },
    { re: /^ng/, v: 'CGK' },
    { re: /^(ck|kk|cc)/, v: 'CGK' },
    { re: /^c(?=[aou])/, v: 'CGK' },
    { re: /^(k|g|q)/, v: 'CGK' },
    { re: /^c(?=[ei])/, v: 'SZTD' },
    { re: /^(s|z|x)/, v: 'SZTD' },
    { re: /^(t|d)/, v: 'SZTD' },
    { re: /^(m|b|p)/, v: 'MBP' },
    { re: /^(f|v)/, v: 'FV' },
    { re: /^(l|r)/, v: 'L' },
    { re: /^a/, v: 'A' },
    { re: /^e/, v: 'E' },
    { re: /^i/, v: 'I' },
    { re: /^o/, v: 'O' },
    { re: /^u/, v: 'U' },
    { re: /^w/, v: 'W' },
    { re: /^(h|j|y)/, v: 'CGK' },
  ];

  /** Lowercase, strip anything that is not a letter or an apostrophe. */
  function normaliseWord(word) {
    return String(word || '')
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[^a-z']/g, '');
  }

  /** Number of characters a word contributes to its time slot. */
  function graphemeCount(word) {
    var w = normaliseWord(word).replace(/'/g, '');
    if (!w) return 0;
    if (EXCEPTIONS[w]) return EXCEPTIONS[w].length;
    return Math.max(1, w.length);
  }

  /**
   * Viseme sequence for one word. Never returns an empty array for a non-empty
   * word, so the caller can rely on at least one mouth shape.
   */
  function visemesForWord(word) {
    var w = normaliseWord(word);
    if (!w) return [];

    if (EXCEPTIONS[w]) return EXCEPTIONS[w].slice();

    // Drop a silent final 'e' ("make", "time") but keep it after a vowel pair
    // where it is doing work ("see" is handled by the rule list first).
    var body = w.replace(/'/g, '');
    var silentE = body.length > 2 && /e$/.test(body) && !/(ee|ie|oa|ue|ye)$/.test(body);
    if (silentE) body = body.slice(0, -1);

    var out = [];
    var i = 0;
    while (i < body.length) {
      var rest = body.slice(i);
      var matched = false;
      for (var r = 0; r < RULES.length; r++) {
        var m = rest.match(RULES[r].re);
        if (m) {
          out.push(RULES[r].v);
          // m[0] is the consumed text; lookahead-only rules have no group 1.
          i += m[0].length;
          matched = true;
          break;
        }
      }
      if (!matched) i += 1; // punctuation-ish leftovers are dropped
    }

    // Collapse a repeated viseme from a doubled consonant ("tt", "ss").
    var collapsed = [];
    for (var k = 0; k < out.length; k++) {
      if (collapsed[collapsed.length - 1] !== out[k]) collapsed.push(out[k]);
    }
    return collapsed.length ? collapsed : ['rest'];
  }

  /** Visemes for a whole string, concatenated. Punctuation becomes `rest`. */
  function visemesForText(text) {
    var words = String(text || '').split(/\s+/).filter(Boolean);
    var out = [];
    words.forEach(function (word) {
      var cleaned = normaliseWord(word);
      if (!cleaned) {
        out.push('rest');
        return;
      }
      var seq = visemesForWord(cleaned);
      for (var i = 0; i < seq.length; i++) out.push(seq[i]);
      if (/[.,;:!?]$/.test(word)) out.push('rest');
    });
    return out;
  }

  function opennessOf(viseme) {
    var value = OPENNESS[viseme];
    return typeof value === 'number' ? value : 0;
  }

  var Visemes = {
    VISEMES: VISEMES,
    OPENNESS: OPENNESS,
    EXCEPTIONS: EXCEPTIONS,
    normaliseWord: normaliseWord,
    graphemeCount: graphemeCount,
    visemesForWord: visemesForWord,
    visemesForText: visemesForText,
    opennessOf: opennessOf,
    isViseme: function (id) {
      return VISEMES.indexOf(id) !== -1;
    },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Visemes;
  } else {
    global.Visemes = Visemes;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
