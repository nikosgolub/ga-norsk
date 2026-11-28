// «Слово по нажатию → карточка»: поиск словарной формы слова в тексте диалога.
// Порт wcLookup из старого приложения (формы глаголов/прилагательных/существительных — js/data/forms.js).
import { WORDS, WC_EXTRA, WC_GLOSS } from '../data/words.js';
import { DIALOG_GLOSS } from '../data/gloss-dialogs.js';
import { VERB_GROUPS, ADJ_GROUPS, DEG_GROUPS, NOUN_IRR } from '../data/forms.js';

export const clean = w => String(w || '').toLowerCase().replace(/^[^\p{L}0-9]+|[^\p{L}0-9]+$/gu, '');
export const tokens = s => String(s || '').split(/\s+/).map(clean).filter(Boolean);
export const base = n => String(n).replace(/^(å|en|ei|et) /, '');
export const kind = n => (/^å /.test(n) ? 'v' : /^(en|ei|et) /.test(n) ? 'n' : 'o');

const isDefOf = (ind, def) => {
  if(NOUN_IRR[ind] && NOUN_IRR[ind].d === def) return true;
  if(def === ind + 'en' || def === ind + 'et' || def === ind + 'a') return true;
  return ind.slice(-1) === 'e' && (def === ind + 'n' || def === ind + 't' || def === ind.slice(0, -1) + 'a');
};
const isPlurOf = (sg, pl) => (NOUN_IRR[sg] && NOUN_IRR[sg].p === pl && pl !== sg) || pl === sg + 'er' || (sg.slice(-1) === 'e' && pl === sg + 'r');
const isPlurDefOf = (sg, pd) => (NOUN_IRR[sg] && NOUN_IRR[sg].pd === pd) || pd === sg + 'ene' || (sg.slice(-1) === 'e' && pd === sg + 'ne');

const ALL = [].concat(...WORDS);
let GLOSS = null;

function match(e, tok){
  const b = base(e.n), k = kind(e.n);
  if(b.indexOf(' ') >= 0) return null;
  if(tok === b) return 'base';
  if(k === 'v'){ const g = VERB_GROUPS.find(x => x[0] === b); return g && g.indexOf(tok) > 0 ? 'form' : null; }
  if(k === 'n') return (isDefOf(b, tok) || isPlurOf(b, tok) || isPlurDefOf(b, tok)) ? 'form' : null;
  const fa = ADJ_GROUPS.find(x => x[0] === b), fd = DEG_GROUPS.find(x => x[0] === b);
  return ((fa && fa.indexOf(tok) > 0) || (fd && fd.indexOf(tok) > 0)) ? 'form' : null;
}

// toks — слова реплики (нормализованные), i — индекс нажатого. Возвращает { e:{n,r,en}, kind:'base'|'form' } или null.
export function lookup(toks, i){
  const tok = toks[i];
  for(const e of ALL){                               // сначала словосочетания («i dag»)
    const b = base(e.n).split(' ');
    if(b.length < 2) continue;
    for(let s = Math.max(0, i - b.length + 1); s <= i && s + b.length <= toks.length; s++){
      if(b.every((x, k) => toks[s + k] === x)) return { e, kind: 'base' };
    }
  }
  let form = null;
  for(const e of ALL){
    const m = match(e, tok);
    if(m === 'base') return { e, kind: 'base' };
    if(m && !form) form = { e, kind: 'form' };
  }
  if(form) return form;
  for(const x of WC_EXTRA){ if(x[3].indexOf(tok) >= 0) return { e: { n: x[0], r: x[1], en: x[2] }, kind: base(x[0]) === tok ? 'base' : 'form' }; }
  if(!GLOSS){ GLOSS = {}; DIALOG_GLOSS.forEach(g => { GLOSS[g[0]] = g; }); WC_GLOSS.forEach(g => { GLOSS[g[0]] = g; }); }
  const g = Object.prototype.hasOwnProperty.call(GLOSS, tok) ? GLOSS[tok] : null;
  if(g) return { e: { n: g[1], r: g[2], en: g[3], name: g[2] === 'имя' }, kind: base(g[1]) === tok ? 'base' : 'form' };
  return null;
}
