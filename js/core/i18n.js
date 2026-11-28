import { state } from './store.js';
// RU — основной, EN — вторая локаль (остальные языки позже). L('русский','english').
export const L = (ru, en) => (state.lang === 'en' ? en : ru);
export const tx = (o, k) => (state.lang === 'en' && o[k + 'En']) || o[k + 'Ru'] || o[k];
export const fmtDur = sec => {            // «1 ч 12 мин» (м:сс — только в плеере)
  const m = Math.floor(sec / 60), h = Math.floor(m / 60);
  return h ? h + L(' ч ', ' h ') + (m % 60) + L(' мин', ' min') : m + L(' мин', ' min');
};
