// Учёт активного времени по событиям <audio>, а не по тикам JS: в фоне (экран заблокирован) таймеры
// и timeupdate замирают или идут реже, а play/pause/waiting приходят вовремя. Считаем реальное время Play.
// Цикл (audio.loop) события паузы не даёт — время идёт. Кольцо дня = сумма по этапам (решение владельца 28.11).
import { addTime } from './path.js';

export function trackAudio(audio, id, getKind){
  let t0 = null, rest = 0, timer = null;
  const now = () => performance.now();
  function flush(){
    if(t0 === null) return;
    const t = now();
    rest += (t - t0) / 1000; t0 = t;
    const whole = Math.floor(rest);
    if(whole > 0){ rest -= whole; addTime(id, getKind(), whole); }
  }
  const begin = () => { if(t0 === null) t0 = now(); if(!timer) timer = setInterval(flush, 15000); };
  const stop = () => { flush(); t0 = null; if(timer){ clearInterval(timer); timer = null; } };
  const on = (e, f) => audio.addEventListener(e, f);
  on('playing', begin);
  on('pause', stop); on('ended', stop); on('waiting', stop); on('stalled', stop); on('error', stop);
  document.addEventListener('visibilitychange', flush);
  if(!audio.paused && !audio.ended && audio.readyState > 2) begin();
  const pending = () => rest + (t0 === null ? 0 : (now() - t0) / 1000);   // ещё не записанные секунды (для «живых» счётчиков)
  return { flush, stop, pending, dispose(){ stop(); document.removeEventListener('visibilitychange', flush); } };
}
