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
  timer = setTimeout(() => { if(el){ el.remove(); el = null; } }, ms);
}
