// Тост внизу экрана с «Отменить» (ревью 28.11: отмена вместо подтверждений).
let el = null, timer = 0;
export function toast(msg, { action, onAction, ms = 4000 } = {}){
  clearTimeout(timer); if(el) el.remove();
  el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status');
  el.innerHTML = '<span></span>' + (action ? '<button>' + action + '</button>' : '');
  el.firstChild.textContent = msg;
  if(action) el.querySelector('button').onclick = () => { clearTimeout(timer); el.remove(); el = null; if(onAction) onAction(); };
  document.body.appendChild(el);
  const dock = document.querySelector('#dock'), mini = document.querySelector('.mini');   // не перекрываем плеер
  el.style.bottom = 'calc(' + ((dock ? dock.offsetHeight : mini ? 76 : 12) + 12 + (document.querySelector('#mastered.all') ? 80 : 0)) + 'px + env(safe-area-inset-bottom))';
  timer = setTimeout(() => { if(el){ el.remove(); el = null; } }, ms);
}
