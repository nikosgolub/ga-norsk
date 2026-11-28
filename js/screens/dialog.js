// Экран диалога: режимы «Слушать» (без текста) и «Следить» (караоке). Этапы «Говорить»/«Экзамен» — позже.
// Звук — синглтон (core/player.js): уход с экрана его не останавливает.
import { DIALOGS } from '../data/dialogs.js';
import { cover } from '../data/covers.js';
import { register, back, go } from '../core/router.js';
import { L, fmtDur, fmtLive } from '../core/i18n.js';
import { state, update } from '../core/store.js';
import { dlgState, DAY_GOAL_SEC, toggleHeard, setStage, dlgTotal } from '../core/path.js';
import * as P from '../core/player.js';
import { karaoke } from '../features/karaoke.js';
import { buzz, swipes } from '../core/tg.js';
import { openWordCard, closeSheet } from '../features/wordcard.js';
import { toast } from '../features/toast.js';

const mmss = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const PLAY = '<svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
const PAUSE = '<svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>';
const SW = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const ICON = {
  back: '<svg width="24" height="24" viewBox="0 0 24 24" ' + SW + '><path d="m15 18-6-6 6-6"/></svg>',
  ccw: '<svg width="28" height="28" viewBox="0 0 24 24" ' + SW + '><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><text x="12" y="15.5" text-anchor="middle" font-size="8.5" font-weight="700" stroke="none" fill="currentColor" font-family="Manrope,system-ui">5</text></svg>',
  cw: '<svg width="28" height="28" viewBox="0 0 24 24" ' + SW + '><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/><text x="12" y="15.5" text-anchor="middle" font-size="8.5" font-weight="700" stroke="none" fill="currentColor" font-family="Manrope,system-ui">5</text></svg>'
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

register('dialog', (app, { i, autoplay }) => {
  const d = DIALOGS[i];
  let mode = dlgState(d.id).stage === 'listen' ? 'listen' : 'follow';   // stage = последний выбранный режим
  let counted = false, showTr = false, timing = null, offline = false, kar = null, disposed = false, stripHidden = false, resume = false;
  const player = P.load(i, mode);
  const audio = player.audio;
  swipes(false);

  fetch('audio/' + d.id + '.json').then(r => r.ok ? r.json() : null).catch(() => null).then(t => {
    if(disposed) return;
    timing = t; offline = !t; if(mode === 'follow') draw();
  });

  const stripWho = t => String(t || '').replace(/^[–-]\s*/, '').replace(/^[^:]{1,20}:\s*/, '');
  const lines = () => d.lines.map(l => Object.assign({}, l, { tr: showTr ? stripWho(state.lang === 'en' ? l.en : l.ru) : '' }));

  function draw(){
    if(kar){ kar.dispose(); kar = null; }
    const total = dlgTotal(d.id);
    app.innerHTML =
      '<div class="dlg ' + mode + '">' +
        '<div class="dlg-bg"><img src="' + cover(d.id) + '" alt=""></div>' +
        '<div class="dlg-top"><button class="hb glass-btn" id="bk" aria-label="' + L('Назад', 'Back') + '">' + ICON.back + '</button>' +
          '<div class="seg" role="tablist"><button role="tab" data-m="listen" aria-selected="' + (mode === 'listen') + '">' + L('Слушать', 'Listen') + '</button>' +
          '<button role="tab" data-m="follow" aria-selected="' + (mode === 'follow') + '">' + L('Следить', 'Follow') + '</button></div>' +
          (mode === 'follow' ? '<button class="glass-btn pill' + (showTr ? ' on' : '') + '" id="tr" aria-pressed="' + showTr + '">' + L('Перевод', 'Translate') + '</button>' : '<span class="pill-gap"></span>') +
        '</div>' +
        (mode === 'listen' ? listenBody(total) : followBody()) +
        (mode === 'listen' && total >= 3 * 3600 && !stripHidden ? '<div class="strip"><button class="btn" id="toFollow">' + L('Слышу все звуки → Следить', 'I hear every sound → Follow') + '</button><button class="link" id="keep">' + L('Позже', 'Later') + '</button></div>' : '') +
        '<div class="dock glass" id="dock">' +
          '<div class="trk-row"><span class="tm" id="cur">0:00</span><div class="pl-track" id="trk"><i id="fill"></i></div><span class="tm" id="dur">--:--</span></div>' +
          '<div class="ctl"><button class="cb txt" id="rate" aria-label="' + L('Скорость', 'Speed') + '">' + ((state.rate || 1) === 1 ? '1×' : '0.75×') + '</button>' +
            '<button class="cb" id="m5" aria-label="' + L('Назад на 5 секунд', 'Back 5 seconds') + '">' + ICON.ccw + '</button>' +
            '<button class="play" id="play" aria-label="' + L('Играть', 'Play') + '">' + (audio.paused ? PLAY : PAUSE) + '</button>' +
            '<button class="cb" id="p5" aria-label="' + L('Вперёд на 5 секунд', 'Forward 5 seconds') + '">' + ICON.cw + '</button></div>' +
        '</div></div>';
    const dock = app.querySelector('#dock'); app.querySelector('.dlg').style.setProperty('--dock-h', dock.offsetHeight + 'px');
    bind();
    if(mode === 'follow'){
      kar = karaoke({ audio, host: app.querySelector('#kh'), scroller: app.querySelector('#sc'), lines: lines(), timing,
        onSeek: t => { audio.currentTime = t; },
        heard: dlgState(d.id).heard,
        onHeard: k => {
          toggleHeard(d.id, k); const n = dlgState(d.id).heard.length;
          const h = app.querySelector('#hc'); if(h) h.textContent = n;
          const lab = app.querySelector('#hl'); if(lab) lab.textContent = n ? L('Слышу каждое слово', 'I hear every word') : L('Отметь реплики, которые слышишь целиком', 'Mark lines you hear in full');
          if(n === d.lines.length){ const m = app.querySelector('#mastered'); if(m){ m.classList.add('all'); m.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } toast(L('Все ', 'All ') + n + L(' реплик. Дальше?', ' lines. Next?')); }
        },
        onWord: (w, k) => {
          if(/^\d+$/.test(w.replace(/\W/g, ''))) return;
          resume = !audio.paused; if(resume) audio.pause();                  // пока открыт лист слова — звук на паузе
          openWordCard(w, d.lines[k].no.replace(/^[^:]{1,24}:\s*/, '').replace(/^[–-]\s*/, ''), () => { if(resume && !disposed) audio.play().catch(() => {}); resume = false; });
        } });
      swipes(false);
    }
    tick();
  }

  function listenBody(total){
    const ready = total >= 3 * 3600;
    const msg = ready ? 'Три часа — ориентир метода. Слышишь все звуки? Тогда переходи к «Следить». Нет — слушай дальше.'
      : total >= 7200 ? 'Два часа на этом диалоге. Знакомые куски начнут всплывать сами. Не всё сразу — это нормально.'
      : total >= 3600 ? 'Час на этом диалоге. Мозг делит кашу звуков на слова, даже если пока не слышно.'
      : 'Не ищи смысл. Просто слушай — уши привыкают к звукам.';
    const C = 2 * Math.PI * 17;
    return '<div class="listen' + (ready && !stripHidden ? ' has-strip' : '') + '"><img class="art" src="' + cover(d.id) + '" alt="" width="640" height="400">' +
      '<h2 class="lt" lang="nb">' + esc(d.title) + '</h2><p class="mut one">' + esc(d.sub) + '</p>' +
      '<div class="lday"><svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="var(--tint-2)" stroke-width="6"/>' +
        '<circle id="lring" cx="20" cy="20" r="17" fill="none" stroke="var(--ring-day)" stroke-width="6" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '" transform="rotate(-90 20 20)"/></svg>' +
        '<b id="lnow">0:00</b><span>' + L('из 3 ч сегодня', 'of 3 h today') + '</span></div>' +
      '<p class="mut one" id="ltot"></p>' + (ready && !stripHidden ? '' : '<p class="method">' + msg + '</p>') + '</div>';
  }

  function followBody(){
    const n = dlgState(d.id).heard.length, st = dlgState(d.id);
    const hint = (state.followOpens || 0) <= 3 && st.sec.f < 600 ? '<p class="method">' + L('Нажми на слово — карточка. Нажми на строку — перемотка.', 'Tap a word for a card. Tap a line to seek.') + '</p>' : '';
    if(!counted){ counted = true; update(s => { s.followOpens = (s.followOpens || 0) + 1; }); }
    const next = DIALOGS[i + 1];
    return '<div class="sheet"><i class="grip"></i><div class="sheet-in" id="sc">' +
      '<p class="sh-t" lang="nb">' + esc(d.title) + '</p>' + (offline ? '<p class="method">' + L('Нет меток слов: подсветка недоступна, звук работает.', 'No word timings: highlighting unavailable, audio works.') + '</p>' : '') + hint +
      '<p class="heard"><span id="hl">' + (n ? L('Слышу каждое слово', 'I hear every word') : L('Отметь реплики, которые слышишь целиком', 'Mark lines you hear in full')) + '</span><span><b id="hc">' + n + '</b> ' + L('из ', 'of ') + d.lines.length + '</span></p>' +
      '<div id="kh"></div>' +
      (next ? '<button class="btn sec done-btn' + (n === d.lines.length ? ' all' : '') + '" id="mastered">' + L('Диалог освоен → к диалогу ', 'Dialogue mastered → to dialogue ') + (i + 2) + '</button>' : '') +
      '<div class="sheet-end"></div></div></div>';
  }

  function bind(){
    const q = s => app.querySelector(s);
    q('#bk').onclick = back;
    app.querySelectorAll('.seg button').forEach(b => { b.onclick = () => {
      if(b.dataset.m === mode) return;
      mode = b.dataset.m; P.setMode(mode); setStage(d.id, mode); buzz('tap'); draw();
    }; });
    const trb = q('#tr'); if(trb) trb.onclick = () => { showTr = !showTr; draw(); };
    q('#play').onclick = () => P.toggle();
    q('#rate').onclick = () => { update(s => { s.rate = (s.rate || 1) === 1 ? 0.75 : 1; }); audio.playbackRate = state.rate; q('#rate').textContent = state.rate === 1 ? '1×' : '0.75×'; };
    q('#m5').onclick = () => { audio.currentTime = Math.max(0, audio.currentTime - 5); };
    q('#p5').onclick = () => { audio.currentTime = Math.min(audio.duration || 1e9, audio.currentTime + 5); };
    q('#trk').onclick = e => { if(!audio.duration) return; const r = q('#trk').getBoundingClientRect(); audio.currentTime = (e.clientX - r.left) / r.width * audio.duration; };
    const tf = q('#toFollow'); if(tf) tf.onclick = () => { mode = 'follow'; P.setMode('follow'); setStage(d.id, 'follow'); draw(); };
    const kp = q('#keep'); if(kp) kp.onclick = () => { stripHidden = true; draw(); };
    const md = q('#mastered');
    if(md) md.onclick = () => {
      setStage(d.id, 'done'); P.unload(); buzz('win');
      toast(L('Диалог ', 'Dialogue ') + (i + 1) + L(' пройден', ' done'), { action: L('Отменить', 'Undo'), onAction: () => setStage(d.id, 'follow') });
      back();
    };
  }

  // живые счётчики: время дня, «на диалоге», позиция — раз в секунду и по событиям плеера
  const C17 = 2 * Math.PI * 17;
  function tick(){
    const c = app.querySelector('#cur'), f = app.querySelector('#fill'), du = app.querySelector('#dur');
    if(c){ c.textContent = mmss(audio.currentTime); if(audio.duration){ f.style.width = (audio.currentTime / audio.duration * 100) + '%'; du.textContent = mmss(audio.duration); } }
    const ln = app.querySelector('#lnow');
    if(ln){
      const sec = P.liveDaySec();
      ln.textContent = fmtLive(sec);
      const ring = app.querySelector('#lring'); if(ring) ring.setAttribute('stroke-dashoffset', C17 * (1 - Math.min(1, sec / DAY_GOAL_SEC)));
      const lt = app.querySelector('#ltot'); if(lt) lt.textContent = L('Всего на диалоге: ', 'Total on this dialogue: ') + fmtLive(dlgTotal(d.id) + P.pending()) + L(' · ориентир 3 ч', ' · guide: 3 h');
    }
  }
  const sync = () => { const p = app.querySelector('#play'); if(p){ p.innerHTML = audio.paused ? PLAY : PAUSE; p.setAttribute('aria-label', audio.paused ? L('Играть', 'Play') : L('Пауза', 'Pause')); } tick(); };
  const off = P.subscribe(sync);
  const iv = setInterval(tick, 1000);
  audio.addEventListener('error', () => toast(L('Звук не загрузился. Проверь сеть.', 'Audio failed to load. Check your connection.')), { once: true });

  draw();
  if(autoplay && audio.paused) audio.play().catch(() => {});
  return () => { disposed = true; clearInterval(iv); off(); closeSheet(); if(kar) kar.dispose(); swipes(true); };
});
