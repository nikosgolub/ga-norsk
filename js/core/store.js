// Единое состояние приложения: localStorage + облако Telegram (с разбиением на куски по 4096 байт).
// Ключи ga2_*. Старые ro_* не пишем и не удаляем (откат на старое приложение безопасен).
import { TG, hasCloud } from './tg.js';

const KEY = 'ga2_state';
const CHUNK = 3800, MAX_CHUNKS = 8;
const DEFAULT = () => ({ v: 1, name: '', lang: 'ru', theme: 'auto', rate: 1, loop: 1, path: {}, days: {}, cards: { list: [], sets: [] }, imported: false, onboarded: false });

export let state = DEFAULT();
const listeners = new Set();
let saveTimer = null, sent = {}, nChunks = 0;

function migrate(s){
  const d = Object.assign(DEFAULT(), s || {});
  if(!d.cards || !Array.isArray(d.cards.list)) d.cards = { list: [], sets: [] };
  d.v = 1;          // здесь — будущие миграции по номеру версии
  return d;
}
try{ state = migrate(JSON.parse(localStorage.getItem(KEY) || '{}')); }catch(e){ state = DEFAULT(); }

export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export function update(fn){ fn(state); save(); listeners.forEach(f => f(state)); }

function chunks(str){
  const b = new TextEncoder().encode(str), dec = new TextDecoder(), out = [];
  let i = 0;
  while(i < b.length){
    let end = Math.min(i + CHUNK, b.length);
    while(end > i && end < b.length && (b[end] & 0xC0) === 0x80) end--;     // не режем символ пополам
    out.push(dec.decode(b.subarray(i, end))); i = end;
  }
  return out.length ? out : [''];
}
function cloudSet(k, v){ if(sent[k] === v) return; try{ TG.CloudStorage.setItem(k, v, () => {}); sent[k] = v; }catch(e){} }
function cloudPush(){
  if(!hasCloud) return;
  const parts = chunks(JSON.stringify(state));
  if(parts.length > MAX_CHUNKS) return;                                      // не влезло — не портим облако
  parts.forEach((p, i) => cloudSet('ga2_s' + i, p));
  for(let i = parts.length; i < nChunks; i++){ try{ TG.CloudStorage.removeItem('ga2_s' + i, () => {}); }catch(e){} delete sent['ga2_s' + i]; }
  nChunks = parts.length;
  cloudSet('ga2_i', String(nChunks));
}
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){}
  clearTimeout(saveTimer); saveTimer = setTimeout(cloudPush, 1200);
}
export function flush(){ clearTimeout(saveTimer); try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} cloudPush(); }
document.addEventListener('visibilitychange', () => { if(document.hidden) flush(); });
addEventListener('pagehide', flush);

// Подтянуть состояние из облака, если на этом устройстве пусто (новое устройство).
export function cloudRestore(){
  return new Promise(resolve => {
    if(!hasCloud || localStorage.getItem(KEY)) return resolve(false);
    TG.CloudStorage.getItem('ga2_i', (e, n) => {
      const cnt = parseInt(n, 10);
      if(e || !cnt) return resolve(false);
      const keys = Array.from({ length: cnt }, (_, i) => 'ga2_s' + i);
      TG.CloudStorage.getItems(keys, (e2, res) => {
        if(e2 || !res) return resolve(false);
        try{
          state = migrate(JSON.parse(keys.map(k => res[k] || '').join('')));
          nChunks = cnt; save(); resolve(true);
        }catch(err){ resolve(false); }
      });
    });
  });
}
