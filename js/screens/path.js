// Путь по диалогам: строка диалога (общая для главной) и экран «Весь путь».
import { DIALOGS } from '../data/dialogs.js';
import { cover } from '../data/covers.js';
import { L, fmtDur } from '../core/i18n.js';
import { dlgState, dlgTotal } from '../core/path.js';
import { register, go, back } from '../core/router.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function dialogRow(i){
  const d = DIALOGS[i], s = dlgState(d.id), tot = dlgTotal(d.id);
  return '<button class="row p" data-i="' + i + '"><img src="' + cover(d.id) + '" alt="" width="64" height="48" loading="lazy">' +
    '<span class="tx"><b lang="nb">' + (i + 1) + '. ' + esc(d.title.replace(/\s+[-–—]\s+(\d+)$/, ' · $1')) + '</b><small>' + esc(d.sub.split(' · ')[0]) + '</small></span>' +
    (s.stage === 'done' ? '<span class="done-mark" aria-label="' + L('Пройден', 'Done') + '">✓</span>' : tot ? '<span class="hrs">' + fmtDur(tot) + '</span>' : '') + '</button>';
}
export const bindRows = app => app.querySelectorAll('.row[data-i]').forEach(b => { b.onclick = () => go('dialog', { i: +b.dataset.i }); });

register('path', app => {
  app.innerHTML = '<div class="top"><button class="hb" id="bk" aria-label="' + L('Назад', 'Back') + '"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button><span class="t">' + L('Весь путь', 'Full path') + '</span></div>' +
    '<div class="list">' + DIALOGS.map((_, i) => dialogRow(i)).join('') + '</div>';
  app.querySelector('#bk').onclick = back; bindRows(app);
});
