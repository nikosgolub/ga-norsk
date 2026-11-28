import { DIALOGS } from '../data/dialogs.js';
import { cover } from '../data/covers.js';
import { L, fmtDur } from '../core/i18n.js';
import { dlgState, currentIndex, daySec, DAY_GOAL_SEC } from '../core/path.js';
import { register, go } from '../core/router.js';
import { toggleTheme } from '../core/theme.js';
import { rerender } from '../core/router.js';
import { state } from '../core/store.js';

const STAGE_NAME = { listen: ['Слушать', 'Listen'], follow: ['Следить', 'Follow'], speak: ['Говорить', 'Speak'], exam: ['Экзамен', 'Exam'], done: ['Пройден', 'Done'] };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function ring(sec){
  const R = 90, C = 2 * Math.PI * R, f = Math.min(1, sec / DAY_GOAL_SEC);
  return '<div class="ring"><svg viewBox="0 0 216 216"><circle class="trk" cx="108" cy="108" r="' + R + '" fill="none" stroke-width="20"/>' +
    '<circle class="arc" cx="108" cy="108" r="' + R + '" fill="none" stroke-width="20" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - f)) + '"/></svg>' +
    '<div class="mid"><b>' + fmtDur(sec) + '</b><small>' + L('из 3 ч', 'of 3 h') + '</small></div></div>';
}

register('home', app => {
  const cur = currentIndex(), cd = DIALOGS[cur], cs = dlgState(cd.id);
  const sec = daySec();
  const rows = DIALOGS.map((d, i) => {
    const s = dlgState(d.id), hrs = (s.sec.l + s.sec.f + s.sec.s);
    return '<button class="row' + (i === cur ? ' cur' : '') + '" data-i="' + i + '">' +
      '<img src="' + cover(d.id) + '" alt="" width="64" height="48" loading="lazy">' +
      '<span class="tx"><b lang="nb">' + (i + 1) + '. ' + esc(d.title) + '</b><small>' + esc(d.sub) + (hrs ? ' · ' + fmtDur(hrs) : '') + '</small></span>' +
      '<span class="stage">' + L(...STAGE_NAME[s.stage]) + '</span></button>';
  }).join('');
  app.innerHTML =
    '<div class="top"><span class="t">Gå!</span><button class="hb" id="th" aria-label="' + L('Тема', 'Theme') + '">◐</button></div>' +
    '<p class="h1">' + (state.name ? 'Hei, ' + esc(state.name) + '!' : 'Hei!') + '</p>' +
    '<div class="night-card day-card" style="margin-top:var(--sp-4)">' + ring(sec) +
      '<button class="btn" id="go">' + L('Продолжить · диалог ', 'Continue · dialogue ') + (cur + 1) + ' · ' + L(...STAGE_NAME[cs.stage]) + '</button></div>' +
    '<div class="sec-h"><h3>' + L('Путь', 'Path') + '</h3><span class="mut">' + DIALOGS.length + '</span></div>' +
    '<div class="list">' + rows + '</div>';
  app.querySelector('#th').onclick = () => { toggleTheme(); rerender(); };
  app.querySelector('#go').onclick = () => go('dialog', { i: cur });
  app.querySelectorAll('.row').forEach(b => { b.onclick = () => go('dialog', { i: +b.dataset.i }); });
});
