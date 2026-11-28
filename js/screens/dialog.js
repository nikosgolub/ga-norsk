// Экран диалога: режимы «Слушать» (без текста) и «Следить» (караоке). Этапы «Говорить»/«Экзамен» — позже.
import { DIALOGS } from '../data/dialogs.js';
import { cover } from '../data/covers.js';
import { register, back } from '../core/router.js';
import { L, fmtDur } from '../core/i18n.js';
import { state, update } from '../core/store.js';
import { dlgState, daySec, DAY_GOAL_SEC } from '../core/path.js';
import { trackAudio } from '../core/clock.js';
import { karaoke } from '../features/karaoke.js';
import { setMediaSession } from '../features/mediasession.js';
import { buzz } from '../core/tg.js';

const mmss = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const PLAY = '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
const PAUSE = '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

register('dialog', (app, { i, mode: startMode }) => {
  const d = DIALOGS[i];
  const st = dlgState(d.id);
  let mode = startMode || (st.stage === 'listen' ? 'listen' : 'follow');
  let showTr = false, timing = null, kar = null, disposed = false;
  const stageOf = () => (mode === 'listen' ? 'l' : 'f');

  const audio = new Audio('audio/' + d.file);
  audio.preload = 'metadata'; audio.loop = !!state.loop; audio.playbackRate = state.rate || 1;
  const clock = trackAudio(audio, d.id, stageOf);
  const msOff = setMediaSession(audio, { title: d.title, artist: 'Gå! · ' + L('Диалог ', 'Dialogue ') + (i + 1), cover: cover(d.id) });

  fetch('audio/' + d.id + '.json').then(r => r.ok ? r.json() : null).catch(() => null).then(t => {
    if(disposed) return; timing = t; if(mode === 'follow') draw();
  });

  const lines = () => d.lines.map(l => Object.assign({}, l, { tr: showTr ? (state.lang === 'en' ? l.en : l.ru) : '' }));

  function draw(){
    clock.flush(); if(kar){ kar.dispose(); kar = null; }
    const heardL = dlgState(d.id).sec.l;
    app.innerHTML =
      '<div class="dlg ' + mode + '">' +
        '<div class="dlg-bg"><img src="' + cover(d.id) + '" alt=""></div>' +
        '<div class="dlg-top"><button class="hb glass-btn" id="bk" aria-label="' + L('Назад', 'Back') + '">‹</button>' +
          '<div class="seg" role="tablist"><button role="tab" data-m="listen" aria-selected="' + (mode === 'listen') + '">' + L('Слушать', 'Listen') + '</button>' +
          '<button role="tab" data-m="follow" aria-selected="' + (mode === 'follow') + '">' + L('Следить', 'Follow') + '</button></div>' +
          (mode === 'follow' ? '<button class="hb glass-btn' + (showTr ? ' on' : '') + '" id="tr" aria-pressed="' + showTr + '" aria-label="' + L('Перевод', 'Translation') + '">' + (state.lang === 'en' ? 'EN' : 'RU') + '</button>' : '<span class="hb"></span>') +
        '</div>' +
        (mode === 'listen' ? listenBody(heardL) : '<div class="sheet"><div class="sheet-in" id="sc"><h2 class="h2" lang="nb">' + esc(d.title) + '</h2><div id="kh"></div><div class="sheet-end"></div></div></div>') +
        '<div class="dock glass">' +
          '<div class="trk-row"><span class="tm" id="cur">0:00</span><div class="pl-track" id="trk"><i id="fill"></i></div><span class="tm" id="dur">--:--</span></div>' +
          '<div class="ctl"><button class="cb" id="rate">' + ((state.rate || 1) === 1 ? '1×' : '0.75×') + '</button>' +
            '<button class="cb" id="m5">−5</button><button class="play" id="play" aria-label="' + L('Играть', 'Play') + '">' + (audio.paused ? PLAY : PAUSE) + '</button><button class="cb" id="p5">+5</button>' +
            '<button class="cb' + (state.loop ? ' on' : '') + '" id="loop" aria-pressed="' + !!state.loop + '" aria-label="' + L('Цикл', 'Loop') + '">⟳</button></div>' +
        '</div></div>';
    bind();
    if(mode === 'follow'){
      kar = karaoke({ audio, host: app.querySelector('#kh'), scroller: app.querySelector('#sc'), lines: lines(), timing,
        onSeek: t => { audio.currentTime = t; }, onWord: null });
    }
    tick();
  }

  function listenBody(heardL){
    const sec = daySec();
    return '<div class="listen"><img class="art" src="' + cover(d.id) + '" alt="" width="640" height="478">' +
      '<div class="lcard glass"><h2 class="h2" lang="nb">' + esc(d.title) + '</h2><p class="mut">' + esc(d.sub) + '</p>' +
        '<p class="big">' + fmtDur(sec) + ' <small>' + L('из 3 ч сегодня', 'of 3 h today') + '</small></p>' +
        '<p class="mut">' + L('На этом диалоге: ', 'On this dialogue: ') + fmtDur(heardL) + '</p></div>' +
      '<button class="btn sec glass" id="toFollow">' + L('Слышу все звуки — перейти к «Следить»', 'I hear every sound — go to Follow') + '</button></div>';
  }

  function bind(){
    const q = s => app.querySelector(s);
    q('#bk').onclick = back;
    app.querySelectorAll('.seg button').forEach(b => { b.onclick = () => { if(b.dataset.m !== mode){ mode = b.dataset.m; buzz('tap'); draw(); } }; });
    const trb = q('#tr'); if(trb) trb.onclick = () => { showTr = !showTr; draw(); };
    q('#play').onclick = () => { audio.paused ? audio.play().catch(() => {}) : audio.pause(); };
    q('#rate').onclick = () => { update(s => { s.rate = (s.rate || 1) === 1 ? 0.75 : 1; }); audio.playbackRate = state.rate; q('#rate').textContent = state.rate === 1 ? '1×' : '0.75×'; };
    q('#m5').onclick = () => { audio.currentTime = Math.max(0, audio.currentTime - 5); };
    q('#p5').onclick = () => { audio.currentTime = Math.min(audio.duration || 1e9, audio.currentTime + 5); };
    q('#loop').onclick = () => { update(s => { s.loop = s.loop ? 0 : 1; }); audio.loop = !!state.loop; q('#loop').classList.toggle('on', !!state.loop); };
    q('#trk').onclick = e => { if(!audio.duration) return; const r = q('#trk').getBoundingClientRect(); audio.currentTime = (e.clientX - r.left) / r.width * audio.duration; };
    const tf = q('#toFollow');
    if(tf) tf.onclick = () => { update(s => { const p = s.path[d.id] || (s.path[d.id] = { stage: 'listen', sec: { l: 0, f: 0, s: 0 }, heard: [], rec: {} }); if(p.stage === 'listen') p.stage = 'follow'; }); mode = 'follow'; draw(); };
  }

  let tickRaf = 0;
  function tick(){
    const c = app.querySelector('#cur'), f = app.querySelector('#fill'), du = app.querySelector('#dur');
    if(c){ c.textContent = mmss(audio.currentTime); if(audio.duration){ f.style.width = (audio.currentTime / audio.duration * 100) + '%'; du.textContent = mmss(audio.duration); } }
  }
  audio.addEventListener('timeupdate', tick);
  audio.addEventListener('loadedmetadata', tick);
  const sync = () => { const p = app.querySelector('#play'); if(p) p.innerHTML = audio.paused ? PLAY : PAUSE; };
  audio.addEventListener('play', sync); audio.addEventListener('pause', sync); audio.addEventListener('ended', sync);

  draw();
  return () => { disposed = true; clock.dispose(); audio.pause(); audio.removeAttribute('src'); audio.load(); if(kar) kar.dispose(); msOff(); cancelAnimationFrame(tickRaf); };
});
