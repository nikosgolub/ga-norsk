// Заглушка этапа 0. Этап 1: «Слушать» + «Следить» (караоке, тайминги audio/NNnor.json).
import { DIALOGS } from '../data/dialogs.js';
import { cover } from '../data/covers.js';
import { register, back } from '../core/router.js';
import { L } from '../core/i18n.js';

register('dialog', (app, { i }) => {
  const d = DIALOGS[i];
  app.innerHTML = '<div class="top"><button class="hb" id="bk" aria-label="' + L('Назад', 'Back') + '">‹</button><span class="t">' + L('Диалог ', 'Dialogue ') + (i + 1) + '</span></div>' +
    '<img src="' + cover(d.id) + '" alt="" style="border-radius:var(--r-card);width:100%;aspect-ratio:4/3;object-fit:cover">' +
    '<h2 class="h2" lang="nb" style="margin-top:var(--sp-4)">' + d.title + '</h2><p class="mut">' + d.sub + '</p>' +
    '<p class="mut" style="margin-top:var(--sp-4)">' + L('Слушать и Следить — следующий этап.', 'Listen and Follow — next stage.') + '</p>';
  app.querySelector('#bk').onclick = back;
});
