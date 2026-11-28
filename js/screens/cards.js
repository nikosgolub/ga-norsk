// «Мои карточки»: повторение (главное действие), список, добавление за «+», удаление с «Отменить».
import { register, go, back, rerender } from '../core/router.js';
import { L, wordsN } from '../core/i18n.js';
import * as cards from '../features/cards.js';
import { buzz } from '../core/tg.js';
import { toast } from '../features/toast.js';
import { update } from '../core/store.js';
import { findLine, playContext, stopContext } from '../features/ctxaudio.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const topbar = t => '<div class="top"><button class="hb" id="bk" aria-label="' + L('Назад', 'Back') + '"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button><span class="t">' + t + '</span></div>';
const SPK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
const spk = (w, cls = '') => (w.ctx && findLine(w.ctx) ? '<button class="hb spk ' + cls + '" data-ctx="' + esc(w.ctx) + '" aria-label="' + L('Послушать фразу', 'Listen to the phrase') + '">' + SPK + '</button>' : '');
const bindSpk = app => app.querySelectorAll('[data-ctx]').forEach(b => { b.onclick = e => { e.stopPropagation(); playContext(b.dataset.ctx); }; });

register('cards', app => {
  const all = cards.list(), dueN = cards.due().length;
  app.innerHTML = topbar(L('Мои карточки', 'My Cards')) +
    '<p class="mut">' + wordsN(all.length) + '</p>' +
    (dueN ? '<button class="btn" id="rev" style="margin-top:var(--sp-4)">' + L('Повторить · ', 'Review · ') + dueN + '</button>' : '') +
    (all.length ? '' : '<div class="empty"><img src="img/s/S-empty-words.webp" alt="" width="240" height="180"><p class="mut">' + L('Пока пусто. Нажми на слово в режиме «Следить» — оно появится здесь.', 'Empty for now. Tap a word in Follow mode — it will appear here.') + '</p></div>') +
    '<div class="list" style="margin-top:var(--sp-4)">' + all.map((w, i) =>
      '<div class="row"><span class="tx"><b lang="nb">' + esc(w.n) + '</b><small>' + esc(w.r) + '</small>' + (w.ctx ? '<small class="ctx" lang="nb">' + esc(w.ctx) + '</small>' : '') + '</span>' + spk(w) +
      '<span class="lvl" role="img" aria-label="' + L('Уровень ', 'Level ') + (w.s || 0) + L(' из 5', ' of 5') + '">' + [0, 1, 2, 3, 4].map(k => '<i class="' + (k < (w.s || 0) ? 'on' : '') + ((w.s || 0) >= 5 ? ' full' : '') + '"></i>').join('') + '</span>' +
      '<button class="hb" data-del="' + i + '" aria-label="' + L('Удалить', 'Delete') + '">✕</button></div>').join('') + '</div>' +
    '<button class="link-row" id="plus">+ ' + L('Добавить слово', 'Add a word') + '</button>' +
    '<form class="add" id="addf" hidden><input id="an" lang="nb" placeholder="norsk" autocapitalize="off" maxlength="60" aria-label="norsk"><input id="ar" placeholder="' + L('перевод', 'translation') + '" maxlength="60" aria-label="' + L('перевод', 'translation') + '"><button class="btn sec" type="submit">' + L('Добавить', 'Add') + '</button></form>';
  app.querySelector('#bk').onclick = back;
  const rev = app.querySelector('#rev'); if(rev) rev.onclick = () => go('review');
  app.querySelector('#plus').onclick = () => { const f = app.querySelector('#addf'); f.hidden = !f.hidden; if(!f.hidden) app.querySelector('#an').focus(); };
  app.querySelector('#addf').onsubmit = e => { e.preventDefault(); if(cards.add(app.querySelector('#an').value, app.querySelector('#ar').value)){ buzz('ok'); rerender(); } };
  app.querySelectorAll('[data-del]').forEach(b => { b.onclick = () => {
    const i = +b.dataset.del, w = cards.list()[i];
    cards.removeAt(i); rerender();
    toast(L('Слово удалено', 'Word deleted'), { action: L('Отменить', 'Undo'), onAction: () => { update(s => { s.cards.list.splice(i, 0, w); }); rerender(); } });
  }; });
  bindSpk(app);
  return stopContext;
});

register('review', app => {
  const queue = cards.due().map(w => cards.list().indexOf(w));
  let flipped = false, known = 0;
  const draw = () => {
    if(!queue.length){
      const nd = cards.nextDue();
      app.innerHTML = topbar(L('Повторение', 'Review')) + '<div class="done-box"><h2 class="h1">' + L('На сегодня всё', 'All done for today') + '</h2><p class="mut">' + L('Повторено верно: ', 'Remembered: ') + known + (nd ? '<br>' + L('Следующее повторение — через ', 'Next review in ') + nd + L(nd === 1 ? ' день' : nd < 5 ? ' дня' : ' дней', nd === 1 ? ' day' : ' days') : '') + '</p><button class="btn" id="ok">' + L('Готово', 'Done') + '</button></div>';
      app.querySelector('#bk').onclick = back; app.querySelector('#ok').onclick = back; return;
    }
    const w = cards.list()[queue[0]];
    app.innerHTML = topbar(L('Повторение', 'Review') + ' · ' + queue.length) +
      '<div class="rwrap"><div class="rcard" id="flip"><div class="rq" lang="nb">' + esc(w.n) + '</div>' + (flipped ? '<div class="rr">' + esc(w.r) + '</div>' : '') + (flipped && w.ctx ? '<div class="rc" lang="nb">' + esc(w.ctx) + '</div>' : '') + spk(w, 'on-night') + '</div>' +
      (flipped ? '<div class="two"><button class="btn bad" id="no">' + L('Не помню', 'Again') + '</button><button class="btn good" id="yes">' + L('Помню', 'Got it') + '</button></div>'
               : '<button class="btn" id="show">' + L('Показать перевод', 'Show translation') + '</button>') + '</div>';
    app.querySelector('#bk').onclick = back;
    const flip = () => { flipped = true; draw(); };
    app.querySelector('#flip').onclick = flip; const sw = app.querySelector('#show'); if(sw) sw.onclick = flip;
    const yes = app.querySelector('#yes'), no = app.querySelector('#no');
    if(yes) yes.onclick = () => { cards.grade(queue[0], true); known++; queue.shift(); flipped = false; buzz('ok'); draw(); };
    if(no) no.onclick = () => { cards.grade(queue[0], false); queue.push(queue.shift()); flipped = false; draw(); };
    bindSpk(app);
  };
  draw();
  return stopContext;
});
