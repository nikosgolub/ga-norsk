import { DIALOGS } from '../data/dialogs.js';
import { cover } from '../data/covers.js';
import { L, fmtDur } from '../core/i18n.js';
import { dlgState, currentIndex, daySec, DAY_GOAL_SEC, streak, STREAK_MIN_SEC } from '../core/path.js';
import { register, go } from '../core/router.js';
import { toggleTheme } from '../core/theme.js';
import { rerender } from '../core/router.js';
import { state, update } from '../core/store.js';
import * as cards from '../features/cards.js';

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

const dayWord = n => { const k = n % 10, h = n % 100; return L(h >= 11 && h <= 14 ? 'дней' : k === 1 ? 'день' : k >= 2 && k <= 4 ? 'дня' : 'дней', n === 1 ? 'day' : 'days'); };
function streakHTML(){
  const n = streak();
  if(!n) return '';
  const today = daySec() >= STREAK_MIN_SEC;
  return '<span class="streak' + (today ? ' today' : '') + '" aria-label="' + L('Серия: ', 'Streak: ') + n + ' ' + dayWord(n) + (today ? '' : L(' — сегодня ещё нет', ' — not yet today')) + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="' + (today ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 2c1 3.5 4 5 4 9.2A4.2 4.2 0 0 1 12 15.4 4.2 4.2 0 0 1 8 11.2c0-1.4.5-2.5 1.3-3.5.2 1.4 1 2 1.7 2C10.600 7 11 4.500 12 2zm0 20a6 6 0 0 1-6-6c0-1.200.4-2.300 1-3.200.4 1.600 2.200 3.400 5 3.400s4.600-1.800 5-3.400c.6.900 1 2 1 3.200a6 6 0 0 1-6 6z"/></svg><b>' + n + '</b> ' + dayWord(n) + '</span>';
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
    '<div class="top"><span class="t">Gå!</span>' + streakHTML() + '<button class="hb" id="th" aria-label="' + L('Тема', 'Theme') + '">◐</button></div>' +
    noteHTML() +
    '<div class="night-card day-card" style="margin-top:var(--sp-4)">' + ring(sec) +
      '<button class="btn" id="go">' + BTN(cs, cur) + '</button></div>' +
    '<button class="row" id="cards" style="margin-top:var(--sp-4)"><span class="tx"><b>' + L('Мои карточки', 'My Cards') + '</b><small>' + cards.list().length + L(' слов', ' words') + (cards.due().length ? ' · ' + L('к повтору: ', 'due: ') + cards.due().length : '') + '</small></span><span class="mut">›</span></button>' +
    '<div class="sec-h"><h3>' + L('Путь', 'Path') + '</h3><span class="mut">' + DIALOGS.length + '</span></div>' +
    '<div class="list">' + rows + '</div>' +
    '<button class="row" id="how" style="margin-top:var(--sp-2)"><span class="tx"><b>Как это работает</b><small>Метод Замяткина за 4 экрана</small></span><span class="mut">›</span></button>';
  const imp = app.querySelector('#imp'); if(imp) imp.onclick = () => { update(st => { delete st.importNote; }); rerender(); };
  app.querySelector('#th').onclick = () => { toggleTheme(); rerender(); };
  app.querySelector('#how').onclick = () => go('onboarding');
  app.querySelector('#cards').onclick = () => go('cards');
  app.querySelector('#go').onclick = () => go('dialog', { i: cur });
  app.querySelectorAll('.row[data-i]').forEach(b => { b.onclick = () => go('dialog', { i: +b.dataset.i }); });
});
