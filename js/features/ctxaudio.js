// Фрагмент диалога по меткам: 🔊 у слова в карточке проигрывает реплику, из которой слово сохранено.
import { DIALOGS } from '../data/dialogs.js';
import * as P from '../core/player.js';

let a = null;
const norm = s => String(s || '').replace(/^[^:]{1,24}:\s*/, '').replace(/^[–-]\s*/, '').trim();
export function findLine(ctx){
  const c = norm(ctx); if(!c) return null;
  for(let di = 0; di < DIALOGS.length; di++){ const k = DIALOGS[di].lines.findIndex(l => norm(l.no) === c); if(k >= 0) return { di, k }; }
  return null;
}
export async function playContext(ctx){
  const f = findLine(ctx); if(!f) return false;
  const d = DIALOGS[f.di];
  let t; try{ t = await (await fetch('audio/' + d.id + '.json')).json(); }catch(e){ return false; }
  const l = t.l[f.k]; if(!l || !l.w.length) return false;
  if(P.playing()) P.toggle();
  if(a){ a.pause(); a = null; }
  a = new Audio('audio/' + d.file);
  const start = Math.max(0, l.s - 0.15), end = l.e + 0.25;
  a.addEventListener('loadedmetadata', () => { a.currentTime = start; a.play().catch(() => {}); }, { once: true });
  a.addEventListener('timeupdate', () => { if(a && a.currentTime >= end){ a.pause(); a = null; } });
  return true;
}
export const stopContext = () => { if(a){ a.pause(); a = null; } };
