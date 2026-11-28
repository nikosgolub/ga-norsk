// «Мои карточки»: список, добавление вручную, повторение (интервалы 1·3·7·14·30 дней).
import { register, go, back, rerender } from '../core/router.js';
import { L } from '../core/i18n.js';
import * as cards from '../features/cards.js';
import { buzz, TG, inTelegram } from '../core/tg.js';
const askConfirm = (msg, ok) => { try{ if(inTelegram && TG.showConfirm){ TG.showConfirm(msg, y => { if(y) ok(); }); return; } }catch(e){} if(confirm(msg)) ok(); };

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const topbar = t => '<div class="top"><button class="hb" id="bk" aria-label="' + L('Назад', 'Back') + '"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button><span class="t">' + t + '</span></div>';
const word = n => { const k = n % 10, h = n % 100; return L(h >= 11 && h <= 14 ? 'слов' : k === 1 ? 'слово' : k >= 2 && k <= 4 ? 'слова' : 'слов', n === 1 ? 'word' : 'words'); };

register('cards', app => {
  const all = cards.list(), dueN = cards.due().length;
  app.innerHTML = topbar(L('Мои карточки', 'My Cards')) +
    '<p class="mut">' + all.length + ' ' + word(all.length) + '' + '</p>' +
    (dueN ? '<button class="btn" id="rev" style="margin-top:var(--sp-4)">' + L('Повторить · ', 'Review · ') + dueN + '</button>' : '') +
    '<form class="add" id="addf"><input id="an" lang="nb" placeholder="norsk" autocapitalize="off" maxlength="60" aria-label="norsk"><input id="ar" placeholder="' + L('перевод', 'translation') + '" maxlength="60" aria-label="' + L('перевод', 'translation') + '"><button class="btn sec" type="submit">' + L('Добавить слово', 'Add word') + '</button></form>' +
    (all.length ? '' : '<div class="empty"><img src="img/s/S-empty-words.webp" alt="" width="240" height="180"><p class="mut">' + L('Пока пусто. Нажми на слово в режиме «Следить» — оно появится здесь.', 'Empty for now. Tap a word in Follow mode — it will appear here.') + '</p></div>') +
    '<div class="list" style="margin-top:var(--sp-4)">' + all.map((w, i) =>
      '<div class="row"><span class="tx"><b lang="nb">' + esc(w.n) + '</b><small>' + esc(w.r) + '</small></span><span class="lvl" aria-label="' + L('уровень ', 'level ') + (w.s || 0) + '">' + '●'.repeat(w.s || 0) + '</span>' +
      '<button class="hb" data-del="' + i + '" aria-label="' + L('Удалить', 'Delete') + '">✕</button></div>').join('') + '</div>';
  app.querySelector('#bk').onclick = back;
  const rev = app.querySelector('#rev'); if(rev) rev.onclick = () => go('review');
  app.querySelector('#addf').onsubmit = e => { e.preventDefault(); if(cards.add(app.querySelector('#an').value, app.querySelector('#ar').value)){ buzz('ok'); rerender(); } };
  app.querySelectorAll('[data-del]').forEach(b => { b.onclick = () => { askConfirm(L('Удалить слово?', 'Delete this word?'), () => { cards.removeAt(+b.dataset.del); rerender(); }) }; });
});

register('review', app => {
  const queue = cards.due().map(w => cards.list().indexOf(w));
  let flipped = false, known = 0;
  const draw = () => {
    if(!queue.length){
      app.innerHTML = topbar(L('Повторение', 'Review')) + '<div class="done-box"><h2 class="h1">' + L('На сегодня всё', 'All done for today') + '</h2><p class="mut">' + L('Повторено верно: ', 'Remembered: ') + known + '</p><button class="btn" id="ok">' + L('Готово', 'Done') + '</button></div>';
      app.querySelector('#bk').onclick = back; app.querySelector('#ok').onclick = back; return;
    }
    const w = cards.list()[queue[0]];
    app.innerHTML = topbar(L('Повторение', 'Review') + ' · ' + queue.length) +
      '<div class="rwrap"><div class="rcard" id="flip"><div class="rq" lang="nb">' + esc(w.n) + '</div>' + (flipped ? '<div class="rr">' + esc(w.r) + '</div>' : '') + '</div>' +
      (flipped ? '<div class="two"><button class="btn bad" id="no">' + L('Не помню', 'Again') + '</button><button class="btn good" id="yes">' + L('Помню', 'Got it') + '</button></div>'
               : '<button class="btn" id="show">' + L('Показать перевод', 'Show translation') + '</button>') + '</div>';
    app.querySelector('#bk').onclick = back;
    const flip = () => { flipped = true; draw(); };
    app.querySelector('#flip').onclick = flip; const sw = app.querySelector('#show'); if(sw) sw.onclick = flip;
    const yes = app.querySelector('#yes'), no = app.querySelector('#no');
    if(yes) yes.onclick = () => { cards.grade(queue[0], true); known++; queue.shift(); flipped = false; buzz('ok'); draw(); };
    if(no) no.onclick = () => { cards.grade(queue[0], false); queue.push(queue.shift()); flipped = false; draw(); };
  };
  draw();
});
