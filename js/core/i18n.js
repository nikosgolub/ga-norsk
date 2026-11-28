import { state } from './store.js';
// RU — основной, EN — вторая локаль (остальные языки позже). L('русский','english').
export const L = (ru, en) => (state.lang === 'en' ? en : ru);
export const tx = (o, k) => (state.lang === 'en' && o[k + 'En']) || o[k + 'Ru'] || o[k];
export const fmtDur = sec => {            // «1 ч 12 мин» (м:сс — только в плеере)
  const m = Math.floor(sec / 60), h = Math.floor(m / 60);
  return h ? h + L(' ч ', ' h ') + (m % 60) + L(' мин', ' min') : m + L(' мин', ' min');
};

export const fmtLive = sec => (sec < 60 ? Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0') : fmtDur(sec));   // «0:42» до первой минуты
export const wordsN = n => { const k = n % 10, h = n % 100; return n + ' ' + L(h >= 11 && h <= 14 ? 'слов' : k === 1 ? 'слово' : k >= 2 && k <= 4 ? 'слова' : 'слов', n === 1 ? 'word' : 'words'); };
