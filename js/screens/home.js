import { DIALOGS } from '../data/dialogs.js';
import { cover } from '../data/covers.js';
import { L, fmtDur } from '../core/i18n.js';
import { dlgState, currentIndex, daySec, DAY_GOAL_SEC } from '../core/path.js';
import { register, go } from '../core/router.js';
import { toggleTheme } from '../core/theme.js';
import { rerender } from '../core/router.js';
import { state, update } from '../core/store.js';

const STAGE_NAME = { listen: ['Слушать', 'Listen'], follow: ['Следить', 'Follow'], speak: ['Говорить', 'Speak'], exam: ['Экзамен', 'Exam'], done: ['Пройден', 'Done'] };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const PLAYI = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
function BTN(cs, cur){
  const total = cs.sec.l + cs.sec.f + cs.sec.s;
  const verb = cs.stage === 'follow' ? L('Следить', 'Follow') : cs.stage === 'speak' ? L('Говорить', 'Speak') : cs.stage === 'exam' ? L('Экзамен', 'Exam') : total ? L('Продолжить', 'Continue') : L('Слушать', 'Listen');
  return PLAYI + verb + L(' диалог ', ' dialogue ') + (cur + 1);
}
function ring(sec){
  const R = 90, C = 2 * Math.PI * R, f = Math.min(1, sec / DAY_GOAL_SEC);
  return '<div class="ring"><svg viewBox="0 0 216 216"><circle class="trk" cx="108" cy="108" r="' + R + '" fill="none" stroke-width="20"/>' +
    '<circle class="arc" cx="108" cy="108" r="' + R + '" fill="none" stroke-width="20" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - f)) + '"/></svg>' +
    '<div class="mid"><b>' + fmtDur(sec) + '</b><small>' + L('из 3 ч', 'of 3 h') + '</small></div></div>';
}

function noteHTML(){
  const n = state.importNote;
  if(!n || !n.dialogs) return '';
  return '<button class="import-note" id="imp">' + L('Перенесено из старого приложения: ', 'Imported from the old app: ') + fmtDur(n.sec) + L(' слушания, диалогов: ', ' of listening, dialogues: ') + n.dialogs + (n.cards ? L(', слов в карточках: ', ', cards: ') + n.cards : '') + ' ✕</button>';
}
register('home', app => {
  const cur = currentIndex(), cd = DIALOGS[cur], cs = dlgState(cd.id);
  const sec = daySec();
  const rows = DIALOGS.map((d, i) => {
    const s = dlgState(d.id), hrs = (s.sec.l + s.sec.f + s.sec.s);
    return '<button class="row" data-i="' + i + '">' +
      '<img src="' + cover(d.id) + '" alt="" width="64" height="48" loading="lazy">' +
      '<span class="tx"><b lang="nb">' + (i + 1) + '. ' + esc(d.title) + '</b><small>' + esc(d.sub) + (hrs ? ' · ' + fmtDur(hrs) : '') + '</small></span>' +
      (i === cur ? '<span class="chip-now">' + L('Сейчас', 'Now') + '</span>' : s.stage === 'done' ? '<span class="done-mark" aria-label="' + L('Пройден', 'Done') + '">✓</span>' : '') + '</button>';
  }).join('');
  app.innerHTML =
    '<div class="top"><span class="t">Gå!</span><button class="hb" id="th" aria-label="' + L('Тема', 'Theme') + '">◐</button></div>' +
    noteHTML() +
    '<div class="night-card day-card" style="margin-top:var(--sp-4)">' + ring(sec) +
      '<button class="btn" id="go">' + BTN(cs, cur) + '</button></div>' +
    '<div class="sec-h"><h3>' + L('Путь', 'Path') + '</h3><span class="mut">' + DIALOGS.length + '</span></div>' +
    '<div class="list">' + rows + '</div>';
  const imp = app.querySelector('#imp'); if(imp) imp.onclick = () => { update(st => { delete st.importNote; }); rerender(); };
  app.querySelector('#th').onclick = () => { toggleTheme(); rerender(); };
  app.querySelector('#go').onclick = () => go('dialog', { i: cur });
  app.querySelectorAll('.row').forEach(b => { b.onclick = () => go('dialog', { i: +b.dataset.i }); });
});
