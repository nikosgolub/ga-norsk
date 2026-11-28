// Мини-плеер на главной и в карточках: звук не гаснет при выходе из диалога.
import { DIALOGS } from '../data/dialogs.js';
import { cover } from '../data/covers.js';
import { current, playing, toggle, subscribe } from '../core/player.js';
import { go } from '../core/router.js';
import { L } from '../core/i18n.js';

const PLAY = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
const PAUSE = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>';
const SCREENS = new Set(['home', 'cards', 'path']);

export function mountMini(name, app){
  if(!SCREENS.has(name)) return null;
  let el = null;
  const draw = () => {
    const P = current();
    if(!P){ if(el){ el.remove(); el = null; app.classList.remove('has-mini'); } return; }
    const d = DIALOGS[P.i];
    if(!el){
      el = document.createElement('div'); el.className = 'mini glass'; document.body.appendChild(el); app.classList.add('has-mini');
      el.onclick = e => { if(e.target.closest('.mini-pp')) toggle(); else go('dialog', { i: P.i }); };
    }
    el.innerHTML = '<img src="' + cover(d.id) + '" alt="" width="40" height="40"><span class="mini-t" lang="nb">' + d.title.replace(/[<>&]/g, '') + '</span>' +
      '<button class="mini-pp" aria-label="' + (playing() ? L('Пауза', 'Pause') : L('Играть', 'Play')) + '">' + (playing() ? PAUSE : PLAY) + '</button>';
  };
  draw();
  const off = subscribe(() => { const P = current(); if(!!P !== !!el || el) draw(); });
  return () => { off(); if(el) el.remove(); app.classList.remove('has-mini'); };
}
