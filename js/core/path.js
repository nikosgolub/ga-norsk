// Модель пути: этап диалога, секунды по этапам. Этапы переключает человек, не таймер.
import { state, update } from './store.js';
import { DIALOGS } from '../data/dialogs.js';

export const STAGES = ['listen', 'follow', 'speak', 'exam', 'done'];
export const DAY_GOAL_SEC = 3 * 3600;
export const dstr = (off = 0) => { const d = new Date(); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

export const dlgState = id => state.path[id] || { stage: 'listen', sec: { l: 0, f: 0, s: 0 }, heard: [], rec: {} };
export const daySec = (d = dstr()) => { const r = state.days[d]; return r ? (r.l || 0) + (r.f || 0) + (r.s || 0) : 0; };

// Текущий диалог: первый, не доведённый до «done»; иначе последний.
export function currentIndex(){
  const i = DIALOGS.findIndex(d => dlgState(d.id).stage !== 'done');
  return i < 0 ? DIALOGS.length - 1 : i;
}
// Добавить секунды активного времени (кольцо считает только Play: слушать/следить/говорить).
export function addTime(id, kind, sec){
  if(!(sec > 0)) return;
  update(s => {
    const p = s.path[id] || (s.path[id] = { stage: 'listen', sec: { l: 0, f: 0, s: 0 }, heard: [], rec: {} });
    p.sec[kind] = (p.sec[kind] || 0) + sec;
    const day = s.days[dstr()] || (s.days[dstr()] = { l: 0, f: 0, s: 0 });
    day[kind] = (day[kind] || 0) + sec;
    const keys = Object.keys(s.days).sort();
    while(keys.length > 60) delete s.days[keys.shift()];
  });
}

// Самооценка: отметка «слышу эту реплику целиком» (по номеру реплики).
export function toggleHeard(id, k){
  update(s => {
    const p = s.path[id] || (s.path[id] = { stage: 'listen', sec: { l: 0, f: 0, s: 0 }, heard: [], rec: {} });
    const i = p.heard.indexOf(k);
    if(i >= 0) p.heard.splice(i, 1); else p.heard.push(k);
  });
}

// Серия: дни подряд, в каждом из которых активного времени ≥ STREAK_MIN_SEC. Сегодняшний день ещё может «догнать» — серия не рвётся до конца дня.
export const STREAK_MIN_SEC = 10 * 60;
export function streak(){
  let n = 0, off = 0;
  if(daySec(dstr(0)) < STREAK_MIN_SEC) off = -1;          // сегодня пока мало — считаем от вчера
  for(;; off--){ if(daySec(dstr(off)) >= STREAK_MIN_SEC) n++; else break; }
  return n;
}

// stage = последний выбранный режим (решение по ревью 28.11; «Следить» — режим, а не заперт). done/speak/exam не трогаем.
export function setStage(id, stage){
  update(s => {
    const p = s.path[id] || (s.path[id] = { stage: 'listen', sec: { l: 0, f: 0, s: 0 }, heard: [], rec: {} });
    if(p.stage === 'listen' || p.stage === 'follow' || stage === 'done' || stage === 'listen' || stage === 'follow') p.stage = stage;
  });
}
export const dlgTotal = id => { const s = dlgState(id).sec; return s.l + s.f + s.s; };
