import { DIALOGS } from '../data/dialogs.js';
import { cover } from '../data/covers.js';
import { L, fmtDur, fmtLive, wordsN } from '../core/i18n.js';
import { dlgState, currentIndex, daySec, DAY_GOAL_SEC, streak, STREAK_MIN_SEC, dlgTotal } from '../core/path.js';
import * as P from '../core/player.js';
import { dialogRow, bindRows } from './path.js';
import { register, go } from '../core/router.js';
import { toggleTheme } from '../core/theme.js';
import { rerender } from '../core/router.js';
import { state, update } from '../core/store.js';
import * as cards from '../features/cards.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const PLAYI = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
function BTN(cs, cur){
  const total = cs.sec.l + cs.sec.f + cs.sec.s;
  const verb = cs.stage === 'follow' ? L('Следить', 'Follow') : cs.stage === 'speak' ? L('Говорить', 'Speak') : cs.stage === 'exam' ? L('Экзамен', 'Exam') : total ? L('Продолжить', 'Continue') : L('Слушать', 'Listen');
  return PLAYI + verb + L(' диалог ', ' dialogue ') + (cur + 1);
}
const R = 90, C = 2 * Math.PI * R;
function ring(sec){
  const f = Math.min(1, sec / DAY_GOAL_SEC), a = 2 * Math.PI * (STREAK_MIN_SEC / DAY_GOAL_SEC);   // svg повёрнут на −90°, поэтому угол без поправки
  const tx = 108 + Math.cos(a) * R, ty = 108 + Math.sin(a) * R, ux = Math.cos(a), uy = Math.sin(a);
  return '<div class="ring"><svg viewBox="0 0 216 216"><circle class="trk" cx="108" cy="108" r="' + R + '" fill="none" stroke-width="20"/>' +
    '<circle class="arc" id="arc" cx="108" cy="108" r="' + R + '" fill="none" stroke-width="20" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - f)) + '" stroke-linecap="' + (f < 0.015 ? 'butt' : 'round') + '"/>' +
    '<line class="notch" x1="' + (tx - ux * 10) + '" y1="' + (ty - uy * 10) + '" x2="' + (tx + ux * 10) + '" y2="' + (ty + uy * 10) + '" stroke-width="2"/></svg>' +
    '<div class="mid"><b id="rnow">' + fmtLive(sec) + '</b><small>' + L('из 3 ч', 'of 3 h') + '</small></div></div>';
}
const streakLine = sec => sec >= STREAK_MIN_SEC ? L('Ещё ', 'Still ') + fmtDur(Math.max(60, DAY_GOAL_SEC - sec)) + L(' до цели', ' to the goal') : L('До серии ещё ', 'To keep the streak: ') + Math.max(1, Math.ceil((STREAK_MIN_SEC - sec) / 60)) + L(' мин', ' min');
const dayWord = n => { const k = n % 10, h = n % 100; return L(h >= 11 && h <= 14 ? 'дней' : k === 1 ? 'день' : k >= 2 && k <= 4 ? 'дня' : 'дней', n === 1 ? 'day' : 'days'); };
function streakHTML(){
  const n = streak();
  if(!n) return '';
  const today = daySec() >= STREAK_MIN_SEC;
  return '<span class="streak' + (today ? ' today' : '') + '" aria-label="' + L('Серия: ', 'Streak: ') + n + ' ' + dayWord(n) + (today ? '' : L(' — сегодня ещё нет', ' — not yet today')) + '">' + (today ? '<span class="chk" aria-hidden="true">✓</span>' : '') + '<svg width="16" height="16" viewBox="0 0 24 24" fill="' + (today ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg><b>' + n + '</b> ' + dayWord(n) + '</span>';
}
function noteHTML(){
  const n = state.importNote;
  if(!n || !n.dialogs) return '';
  return '<button class="import-note" id="imp">' + L('Перенесено из старого приложения: ', 'Imported from the old app: ') + fmtDur(n.sec) + L(' слушания, диалогов: ', ' of listening, dialogues: ') + n.dialogs + (n.cards ? L(', слов в карточках: ', ', cards: ') + n.cards : '') + ' ✕</button>';
}
register('home', app => {
  const cur = currentIndex(), cd = DIALOGS[cur], cs = dlgState(cd.id);
  const sec = P.liveDaySec();
  const doneN = DIALOGS.filter(d => dlgState(d.id).stage === 'done').length;
  const shown = [cur, cur + 1, cur + 2].filter(k => k < DIALOGS.length);
  const tot = dlgTotal(cd.id);
  app.innerHTML =
    '<div class="top"><span class="t">Gå!</span>' + streakHTML() + '<button class="hb round" id="th" aria-label="' + L('Тема', 'Theme') + '">◐</button></div>' +
    noteHTML() +
    '<div class="night-card day-card" style="margin-top:var(--sp-4)">' + ring(sec) + '<p class="sline" id="sline">' + streakLine(sec) + '</p>' +
      '<button class="btn" id="go">' + BTN(cs, cur) + '</button>' + (tot ? '<p class="cap">' + L('на диалоге ', 'on this dialogue ') + fmtDur(tot) + '</p>' : '') + '</div>' +
    '<button class="row" id="cards" style="margin-top:var(--sp-4)"><span class="tx"><b>' + L('Мои карточки', 'My Cards') + '</b><small>' + wordsN(cards.list().length) + (cards.due().length ? ' · ' + L('к повтору: ', 'due: ') + cards.due().length : '') + '</small></span><span class="mut">›</span></button>' +
    '<div class="sec-h"><h3>' + L('Путь', 'Path') + '</h3>' + (doneN ? '<span class="mut">' + L('Пройдено: ', 'Done: ') + doneN + '</span>' : '') + '</div>' +
    '<div class="list">' + shown.map(dialogRow).join('') + '</div>' +
    '<button class="link-row" id="all">' + L('Весь путь · ', 'Full path · ') + DIALOGS.length + ' ›</button>' +
    '<button class="row" id="how" style="margin-top:var(--sp-4)"><span class="tx"><b>Как это работает</b><small>Метод Замяткина за 4 экрана</small></span><span class="mut">›</span></button>';
  const imp = app.querySelector('#imp'); if(imp) imp.onclick = () => { update(st => { delete st.importNote; }); rerender(); };
  app.querySelector('#th').onclick = () => { toggleTheme(); rerender(); };
  app.querySelector('#how').onclick = () => go('onboarding');
  app.querySelector('#cards').onclick = () => go('cards');
  app.querySelector('#all').onclick = () => go('path');
  app.querySelector('#go').onclick = () => go('dialog', { i: cur, autoplay: true });     // кнопка сразу включает звук
  bindRows(app);
  // живое кольцо: пока играет звук — обновляем раз в секунду
  const live = () => {
    const s = P.liveDaySec(), f = Math.min(1, s / DAY_GOAL_SEC);
    const arc = app.querySelector('#arc'); if(arc){ arc.setAttribute('stroke-dashoffset', C * (1 - f)); arc.setAttribute('stroke-linecap', f < 0.015 ? 'butt' : 'round'); }
    const n = app.querySelector('#rnow'); if(n) n.textContent = fmtLive(s);
    const l = app.querySelector('#sline'); if(l) l.textContent = streakLine(s);
  };
  const iv = setInterval(live, 1000);
  return () => clearInterval(iv);
});
