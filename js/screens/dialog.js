// Экран диалога: режимы «Слушать» (без текста) и «Следить» (караоке). Этапы «Говорить»/«Экзамен» — позже.
import { DIALOGS } from '../data/dialogs.js';
import { cover } from '../data/covers.js';
import { register, back } from '../core/router.js';
import { L, fmtDur } from '../core/i18n.js';
import { state, update } from '../core/store.js';
import { dlgState, daySec, DAY_GOAL_SEC, toggleHeard } from '../core/path.js';
import { trackAudio } from '../core/clock.js';
import { karaoke } from '../features/karaoke.js';
import { setMediaSession } from '../features/mediasession.js';
import { buzz } from '../core/tg.js';
import { openWordCard, closeSheet } from '../features/wordcard.js';

const mmss = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const PLAY = '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
const PAUSE = '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>';
const ICON = {
  back: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  ccw: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><text x="12" y="15.5" text-anchor="middle" font-size="8.5" font-weight="700" stroke="none" fill="currentColor" font-family="Manrope,system-ui">5</text></svg>',
  cw: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/><text x="12" y="15.5" text-anchor="middle" font-size="8.5" font-weight="700" stroke="none" fill="currentColor" font-family="Manrope,system-ui">5</text></svg>'
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

register('dialog', (app, { i, mode: startMode }) => {
  const d = DIALOGS[i];
  const st = dlgState(d.id);
  let mode = startMode || (st.stage === 'listen' ? 'listen' : 'follow');
  let showTr = false, timing = null, kar = null, disposed = false;
  const stageOf = () => (mode === 'listen' ? 'l' : 'f');

  const audio = new Audio('audio/' + d.file);
  audio.preload = 'metadata'; audio.loop = true;   // по методу цикл всегда включён (аудио — «волна за волной») audio.playbackRate = state.rate || 1;
  const clock = trackAudio(audio, d.id, stageOf);
  const msOff = setMediaSession(audio, { title: d.title, artist: 'Gå! · ' + L('Диалог ', 'Dialogue ') + (i + 1), cover: cover(d.id) });

  fetch('audio/' + d.id + '.json').then(r => r.ok ? r.json() : null).catch(() => null).then(t => {
    if(disposed) return; timing = t; if(mode === 'follow') draw();
  });

  const stripWho = t => String(t || '').replace(/^[–-]\s*/, '').replace(/^[^:]{1,20}:\s*/, '');
  const lines = () => d.lines.map(l => Object.assign({}, l, { tr: showTr ? stripWho(state.lang === 'en' ? l.en : l.ru) : '' }));

  function draw(){
    clock.flush(); if(kar){ kar.dispose(); kar = null; }
    const heardL = dlgState(d.id).sec.l;
    app.innerHTML =
      '<div class="dlg ' + mode + '">' +
        '<div class="dlg-bg"><img src="' + cover(d.id) + '" alt=""></div>' +
        '<div class="dlg-top"><button class="hb glass-btn" id="bk" aria-label="' + L('Назад', 'Back') + '">' + ICON.back + '</button>' +
          '<div class="seg" role="tablist"><button role="tab" data-m="listen" aria-selected="' + (mode === 'listen') + '">' + L('Слушать', 'Listen') + '</button>' +
          '<button role="tab" data-m="follow" aria-selected="' + (mode === 'follow') + '">' + L('Следить', 'Follow') + '</button></div>' +
          (mode === 'follow' ? '<button class="hb glass-btn txt' + (showTr ? ' on' : '') + '" id="tr" aria-pressed="' + showTr + '" aria-label="' + L('Перевод', 'Translation') + '">' + (state.lang === 'en' ? 'EN' : 'RU') + '</button>' : '<span class="hb"></span>') +
        '</div>' +
        (mode === 'listen' ? listenBody(heardL) : '<div class="sheet"><i class="grip"></i><div class="sheet-in" id="sc">' + followHead() + '<div id="kh"></div><div class="sheet-end"></div></div></div>') +
        '<div class="dock glass">' +
          '<div class="trk-row"><span class="tm" id="cur">0:00</span><div class="pl-track" id="trk"><i id="fill"></i></div><span class="tm" id="dur">--:--</span></div>' +
          '<div class="ctl"><button class="cb txt" id="rate" aria-label="' + L('Скорость', 'Speed') + '">' + ((state.rate || 1) === 1 ? '1×' : '0.75×') + '</button>' +
            '<button class="cb" id="m5" aria-label="' + L('Назад на 5 секунд', 'Back 5 seconds') + '">' + ICON.ccw + '</button>' +
            '<button class="play" id="play" aria-label="' + L('Играть', 'Play') + '">' + (audio.paused ? PLAY : PAUSE) + '</button>' +
            '<button class="cb" id="p5" aria-label="' + L('Вперёд на 5 секунд', 'Forward 5 seconds') + '">' + ICON.cw + '</button></div>' +
        '</div></div>';
    bind();
    if(mode === 'follow'){
      kar = karaoke({ audio, host: app.querySelector('#kh'), scroller: app.querySelector('#sc'), lines: lines(), timing,
        onSeek: t => { audio.currentTime = t; },
        heard: dlgState(d.id).heard, onHeard: k => { toggleHeard(d.id, k); const h = app.querySelector('#heard b'); if(h) h.textContent = dlgState(d.id).heard.length; },
        onWord: (w, k) => /^\d+$/.test(w.replace(/\W/g, '')) ? null : openWordCard(w, d.lines[k].no.replace(/^[^:]{1,24}:\s*/, '').replace(/^[–-]\s*/, '')) });
    }
    tick();
  }

  const followHead = () => {
    const n = dlgState(d.id).heard.length, hint = dlgState(d.id).sec.f < 600 ? '<p class="method">Следи за текстом, пока слышишь каждое слово. Нажми на незнакомое — оно сохранится в карточки.</p>' : '';
    return hint + '<p class="heard" id="heard">Слышу <b>' + n + '</b> из ' + d.lines.length + ' реплик</p>';
  };
  function listenBody(heardL){
    const sec = daySec(), f = Math.min(1, sec / DAY_GOAL_SEC), C = 2 * Math.PI * 17;
    const ready = heardL >= 3 * 3600;
    const listenMsg = h => h >= 7200 ? 'Два часа. Знакомые куски начнут всплывать сами. Не всё сразу — это нормально.' : h >= 3600 ? 'Час позади. Мозг делит кашу звуков на слова, даже если пока не слышно.' : 'Не ищи смысл. Просто слушай — уши привыкают к звукам.';
    return '<div class="listen"><img class="art" src="' + cover(d.id) + '" alt="" width="640" height="478">' +
      '<h2 class="h1 lt" lang="nb">' + esc(d.title) + '</h2><p class="mut">' + esc(d.sub) + '</p>' +
      '<div class="lday"><svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="var(--tint-2)" stroke-width="6"/>' +
        '<circle cx="20" cy="20" r="17" fill="none" stroke="var(--ring-day)" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - f)) + '" transform="rotate(-90 20 20)"/></svg>' +
        '<b>' + fmtDur(sec) + '</b><span>' + L('из 3 ч сегодня', 'of 3 h today') + '</span></div>' +
      '<p class="mut">' + L('На этом диалоге: ', 'On this dialogue: ') + fmtDur(heardL) + '</p>' +
      (ready ? '<p class="method">Три часа — ориентир метода. Слышишь все звуки? Тогда переходи к «Следить». Нет — слушай дальше.</p><button class="btn sec slim" id="toFollow">' + L('Слышу все звуки → Следить', 'I hear every sound → Follow') + '</button>'
             : '<p class="method">' + listenMsg(heardL) + '</p>') +
      '</div>';
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
  return () => { closeSheet(); disposed = true; clock.dispose(); audio.pause(); audio.removeAttribute('src'); audio.load(); if(kar) kar.dispose(); msOff(); cancelAnimationFrame(tickRaf); };
});
