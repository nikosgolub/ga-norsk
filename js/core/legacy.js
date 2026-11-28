// Одноразовый импорт прогресса из старого приложения (ключи ro_*). Только чтение: ro_* не меняем и не удаляем.
// Уроки (ro_progress) не импортируем — их в новом приложении пока нет; данные остаются нетронутыми.
import { state, update } from './store.js';
import { hasCloud, TG } from './tg.js';

const OLD_DONE_SEC = 9 * 3600;   // в старом приложении диалог считался пройденным после 9 ч

function readCloud(){
  return new Promise(resolve => {
    if(!hasCloud) return resolve(null);
    try{
      TG.CloudStorage.getItem('ro_i', (e, idx) => {
        let n = 0; try{ n = (JSON.parse(idx || '{}').m) || 0; }catch(err){}
        const keys = n ? Array.from({ length: n }, (_, i) => 'ro_m' + i) : ['ro_meta'];
        TG.CloudStorage.getItems(keys, (e2, res) => {
          if(e2 || !res) return resolve(null);
          try{ resolve(JSON.parse(keys.map(k => res[k] || '').join('')) || null); }catch(err){ resolve(null); }
        });
      });
    }catch(e){ resolve(null); }
  });
}
const pad = k => String(k).split('-').map((x, i) => i ? x.padStart(2, '0') : x).join('-');

export function convert(m){
  const out = { path: {}, days: {}, cards: { list: m.my || [], sets: m.mysets || [] } };
  let hours = 0, n = 0;
  for(const id of Object.keys(m.dlg || {})){
    const sec = Math.round((m.dlg[id] && m.dlg[id].sec) || 0);
    if(!sec) continue;
    out.path[id] = { stage: sec >= OLD_DONE_SEC ? 'follow' : 'listen', sec: { l: sec, f: 0, s: 0 }, heard: [], rec: {} };
    hours += sec; n++;
  }
  const keys = Object.keys(m.log || {}).map(k => [pad(k), m.log[k]]).sort((a, b) => a[0] < b[0] ? -1 : 1).slice(-60);
  for(const [k, v] of keys) if(v && v.a) out.days[k] = { l: Math.round(v.a), f: 0, s: 0 };
  out.meta = { name: m.name || '', lang: m.lang === 'en' ? 'en' : 'ru', theme: (m.theme === 'light' || m.theme === 'dark') ? m.theme : 'auto', rate: m.rate === 0.75 ? 0.75 : 1 };
  out.note = { dialogs: n, sec: hours, cards: out.cards.list.length };
  return out;
}

export async function importLegacy(){
  if(state.imported) return false;
  let m = null;
  try{ m = JSON.parse(localStorage.getItem('ro_meta') || 'null'); }catch(e){}
  if(!m) m = await readCloud();
  if(!m){ update(s => { s.imported = true; }); return false; }
  const c = convert(m);
  update(s => {
    Object.assign(s, c.meta);
    s.path = Object.assign({}, c.path, s.path);
    s.days = Object.assign({}, c.days, s.days);
    s.cards = c.cards;
    s.imported = true;
    s.importNote = c.note;
  });
  return true;
}
