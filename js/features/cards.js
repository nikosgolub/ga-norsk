// «Мои карточки»: список слов с интервальным повторением. Формат записи как в старом приложении: {n, r, s: уровень 0–5, d: день повтора, set?}.
import { state, update } from '../core/store.js';
import { base } from './lookup.js';

export const SRS_INT = [1, 3, 7, 14, 30];
export const dnum = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
export const list = () => state.cards.list;
export const isIn = n => { const k = String(n).toLowerCase(), b = base(k); return list().some(w => { const x = String(w.n).toLowerCase(); return x === k || base(x) === b; }); };
export const due = () => list().filter(w => w.d === undefined || w.d <= dnum());
export function add(n, r){
  n = String(n).replace(/[<>&"]/g, '').trim().slice(0, 60); r = String(r).replace(/[<>&"]/g, '').trim().slice(0, 60);
  if(!n || !r || isIn(n)) return false;
  update(s => { s.cards.list.unshift({ n, r, s: 0, d: dnum() }); });
  return true;
}
export function remove(w){ update(s => { const i = s.cards.list.indexOf(w); if(i >= 0) s.cards.list.splice(i, 1); }); }
export function removeAt(i){ update(s => { s.cards.list.splice(i, 1); }); }
export function grade(i, ok){
  update(s => {
    const w = s.cards.list[i]; if(!w) return;
    if(ok){ w.s = Math.min((w.s || 0) + 1, SRS_INT.length); w.d = dnum() + SRS_INT[w.s - 1]; }
    else { w.s = 0; w.d = dnum(); }
  });
}
