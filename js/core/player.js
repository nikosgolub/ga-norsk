// Аудио-синглтон: звук живёт вне экрана — «Назад» его не гасит, на главной и в карточках остаётся мини-плеер.
// Остановка — только по паузе или при смене диалога (ревью 28.11, правка 2).
import { DIALOGS } from '../data/dialogs.js';
import { cover } from '../data/covers.js';
import { L } from './i18n.js';
import { state } from './store.js';
import { trackAudio } from './clock.js';
import { daySec } from './path.js';
import { setMediaSession } from '../features/mediasession.js';

let P = null;
const subs = new Set();
const notify = () => subs.forEach(f => { try{ f(); }catch(e){} });
export const subscribe = f => { subs.add(f); return () => subs.delete(f); };
export const current = () => P;
export const playing = () => !!P && !P.audio.paused;

export function load(i, mode){
  if(P && P.i === i){ if(mode) setMode(mode); return P; }
  unload();
  const d = DIALOGS[i];
  const audio = new Audio('audio/' + d.file);
  audio.preload = 'metadata';
  audio.loop = true;                       // по методу цикл всегда включён («волна за волной»)
  audio.playbackRate = state.rate || 1;
  P = { i, id: d.id, audio, mode: mode || 'listen' };
  P.clock = trackAudio(audio, d.id, () => (P && P.mode === 'listen' ? 'l' : 'f'));
  P.off = setMediaSession(audio, { title: d.title, artist: 'Gå! · ' + L('Диалог ', 'Dialogue ') + (i + 1), cover: cover(d.id) });
  ['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata', 'error'].forEach(e => audio.addEventListener(e, notify));
  notify();
  return P;
}
export function unload(){
  if(!P) return;
  const old = P; P = null;
  old.clock.dispose(); old.audio.pause(); old.audio.removeAttribute('src'); old.audio.load(); old.off();
  notify();
}
export function setMode(m){ if(!P || P.mode === m) return; P.clock.flush(); P.mode = m; }
export const toggle = () => { if(P) P.audio.paused ? P.audio.play().catch(() => {}) : P.audio.pause(); };
export const pending = () => (P ? P.clock.pending() : 0);
export const liveDaySec = () => daySec() + pending();
