// Караоке: подсветка по реальным меткам слов (audio/NNnor.json), requestAnimationFrame от audio.currentTime.
// Механика Apple Music: текущая реплика в фокусе, слово заливается по ходу, автопрокрутка с паузой при ручной прокрутке.
const LEAD = 0.12;   // реплика становится текущей чуть раньше первого слова

export function karaoke({ audio, host, scroller, lines, timing, onSeek, onWord, heard = [], onHeard }){
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const starts = lines.map((l, k) => (timing && timing.l[k] && timing.l[k].w.length) ? timing.l[k].s : null);
  host.innerHTML = lines.map((l, k) => {
    const m = /^([^:]{1,24}):\s*(.*)$/.exec(l.no);
    const words = timing && timing.l[k] && timing.l[k].w.length ? timing.l[k].w.map(w => w[0]) : (m ? m[2] : l.no).split(/\s+/);
    return '<div class="kl" data-k="' + k + '"><div class="kl-body">' + (m ? '<span class="kl-who">' + esc(m[1]) + '</span>' : '') +
      '<p class="kl-no" lang="nb">' + words.map((w, j) => '<span class="kw" data-j="' + j + '">' + esc(w) + '</span>').join(' ') + '</p>' +
      '<p class="kl-tr">' + esc(l.tr || '') + '</p></div>' +
      (onHeard ? '<button class="kl-ear" data-ear="' + k + '" aria-pressed="' + heard.includes(k) + '" aria-label="Слышу эту реплику целиком"><i></i></button>' : '') + '</div>';
  }).join('');
  const els = Array.from(host.querySelectorAll('.kl'));
  let cur = -1, lastWord = -1, raf = 0, userScrollUntil = 0, programmatic = 0;

  host.addEventListener('click', e => {
    const ear = e.target.closest('.kl-ear');
    if(ear){ const k = +ear.dataset.ear; ear.setAttribute('aria-pressed', ear.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); onHeard(k); return; }
    const w = e.target.closest('.kw'), line = e.target.closest('.kl');
    if(!line) return;
    const k = +line.dataset.k;
    if(w && onWord){ onWord(w.textContent, k); return; }
    if(starts[k] !== null) onSeek(Math.max(0, starts[k] - LEAD));
  });
  scroller.addEventListener('scroll', () => { if(!programmatic) userScrollUntil = performance.now() + 4000; showBack(); }, { passive: true });
  const back = document.createElement('button');
  back.className = 'kl-back'; back.hidden = true; back.textContent = '↓';
  back.onclick = () => { userScrollUntil = 0; center(true); };
  scroller.parentNode.appendChild(back);
  function showBack(){ back.hidden = !(cur >= 0 && performance.now() < userScrollUntil); }

  function center(smooth){
    const el = els[cur]; if(!el) return;
    const target = el.offsetTop - scroller.clientHeight * 0.3;
    programmatic++;
    scroller.scrollTo({ top: Math.max(0, target), behavior: smooth ? 'smooth' : 'auto' });
    setTimeout(() => { programmatic = Math.max(0, programmatic - 1); }, smooth ? 600 : 60);
  }
  function lineAt(t){
    let k = -1;
    for(let i = 0; i < starts.length; i++){ if(starts[i] !== null && starts[i] - LEAD <= t) k = i; else if(starts[i] !== null) break; }
    return k;
  }
  function frame(){
    const t = audio.currentTime;
    const k = timing ? lineAt(t) : -1;
    if(k !== cur){
      if(els[cur]) els[cur].classList.remove('on');
      cur = k; lastWord = -1;
      if(els[cur]){ els[cur].classList.add('on'); if(performance.now() >= userScrollUntil) center(true); }
      els.forEach((el, i) => {
        el.classList.toggle('past', cur >= 0 && i < cur);
        if(i === cur) return;
        const done = i < cur;                       // прошлые реплики — залиты целиком, будущие — пустые
        el.querySelectorAll('.kw').forEach(s => { s.classList.toggle('done', done); s.classList.remove('now'); s.style.removeProperty('--p'); s.dataset.s = done ? '1' : '0'; });
      });
      showBack();
    }
    if(cur >= 0){
      const ws = timing.l[cur].w, spans = els[cur].querySelectorAll('.kw');
      for(let j = 0; j < ws.length; j++){
        const s = spans[j]; if(!s) break;
        const [, a, b] = ws[j];
        if(t >= b){ if(s.dataset.s !== '1'){ s.dataset.s = '1'; s.style.removeProperty('--p'); s.classList.add('done'); } }
        else if(t >= a){ s.dataset.s = '0'; s.classList.remove('done'); s.classList.add('now'); s.style.setProperty('--p', Math.round((t - a) / Math.max(0.05, b - a) * 100) + '%'); }
        else if(s.dataset.s !== '0' || s.classList.contains('done') || s.classList.contains('now')){ s.dataset.s = '0'; s.classList.remove('done', 'now'); s.style.removeProperty('--p'); }
      }
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return { dispose(){ cancelAnimationFrame(raf); back.remove(); }, current: () => cur };
}
