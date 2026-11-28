// Карточка слова (нижний лист): нажал слово в караоке → перевод, начальная форма, «В карточки».
import { L, } from '../core/i18n.js';
import { state } from '../core/store.js';
import { lookup, tokens, clean, base, kind } from './lookup.js';
import * as cards from './cards.js';
import { aiAsk } from './ai.js';
import { buzz } from '../core/tg.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let root = null;
export function closeSheet(){ if(root){ root.remove(); root = null; } }
export function openSheet(html){
  closeSheet();
  root = document.createElement('div');
  root.className = 'modal';
  root.innerHTML = '<div class="modal-bg"></div><div class="modal-sheet" role="dialog" aria-modal="true"><i class="grip2"></i>' + html + '</div>';
  root.querySelector('.modal-bg').onclick = closeSheet;
  let y0 = null; const sh = root.querySelector('.modal-sheet');
  sh.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, { passive: true });
  sh.addEventListener('touchmove', e => { if(y0 !== null && e.touches[0].clientY - y0 > 60){ y0 = null; closeSheet(); } }, { passive: true });
  document.body.appendChild(root);
  return root.querySelector('.modal-sheet');
}

// word — нажатое слово как в тексте; lineText — вся реплика (контекст для словосочетаний и ИИ)
export function openWordCard(word, lineText){
  const toks = tokens(lineText), tok = clean(word);
  let i = toks.indexOf(tok); if(i < 0){ toks.push(tok); i = toks.length - 1; }
  const hit = lookup(toks, i);
  let c = hit
    ? { n: hit.e.n, r: state.lang === 'en' ? (hit.e.en || hit.e.r) : hit.e.r, word: (base(hit.e.n).indexOf(' ') >= 0 && kind(hit.e.n) === 'o') ? hit.e.n : tok, form: hit.kind === 'form', name: !!hit.e.name }
    : { n: tok, r: '', word: tok, form: false, unknown: true };
  let seq = 0;
  const draw = () => {
    const have = c.r && cards.isIn(c.n);
    const sh = openSheet(
      '<div class="wcard-w" lang="nb">' + esc(c.word) + '</div>' +
      (c.unknown ? '<div class="wcard-base" id="wc-tr">' + L('Этого слова нет в словаре курса', 'This word is not in the course vocabulary') + '</div>'
                 : '<div class="wcard-tr" id="wc-tr">' + esc(c.r) + '</div>') +
      (c.form && c.n !== c.word ? '<div class="wcard-base">' + L('Начальная форма: ', 'Base form: ') + '<b lang="nb">' + esc(c.n) + '</b></div>' : '') +
      (have ? '<div class="wcard-in">✓ ' + L('В карточках', 'In My Cards') + '</div>' : '') +
      (have || c.name ? '' : c.r ? '<button class="btn" id="wc-add">' + L('В карточки', 'Add to My Cards') + '</button>'
                       : '<button class="btn" id="wc-ai">' + L('Узнать перевод', 'Get translation') + '</button>'));
    const a = sh.querySelector('#wc-add'); if(a) a.onclick = () => { cards.add(c.n, c.r); buzz('ok'); draw(); };
    const q = sh.querySelector('#wc-ai'); if(q) q.onclick = () => ask(sh);
  };
  const ask = async sh => {
    const my = ++seq, btn = sh.querySelector('#wc-ai'), tr = sh.querySelector('#wc-tr');
    btn.disabled = true; btn.textContent = L('Ищу…', 'Looking up…');
    try{
      const r = await aiAsk('Ты помощник в приложении для изучения норвежского (bokmål), уровень A1–A2. Слово из фразы: "' + c.word + '", фраза: "' + lineText +
        '". Верни JSON: {"no": "начальная форма (en/ei/et для существительных, å для глаголов)", "ru": "краткий перевод на ' + (state.lang === 'en' ? 'английский' : 'русский') + '"}. Только JSON.', true);
      if(my !== seq) return;
      const t = String(r.ru || '').replace(/[<>&"]/g, '').trim().slice(0, 60), no = String(r.no || '').replace(/[<>&"]/g, '').trim().slice(0, 60);
      if(!t) throw new Error(L('ИИ не ответил', 'No answer'));
      c = { n: no || c.word, r: t, word: c.word, form: !!no && no !== c.word };
      draw();
    }catch(e){ btn.disabled = false; btn.textContent = L('Повторить', 'Try again'); tr.textContent = e.message; }
  };
  draw();
}
