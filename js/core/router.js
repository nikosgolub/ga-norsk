// Мини-роутер: стек экранов, кнопка «Назад» Telegram, рендер в #app.
import { TG } from './tg.js';
const screens = {};
const stack = [];
let current = null, cleanup = null, hook = null, hookCleanup = null;
export const onShow = fn => { hook = fn; };
function runCleanup(){ if(cleanup){ try{ cleanup(); }catch(e){} cleanup = null; } if(hookCleanup){ try{ hookCleanup(); }catch(e){} hookCleanup = null; } }

export const register = (name, fn) => { screens[name] = fn; };
export function go(name, params = {}, { replace = false } = {}){
  runCleanup();
  if(replace) stack.pop();
  stack.push({ name, params });
  show();
}
export function back(){
  if(stack.length < 2) return;
  runCleanup();
  stack.pop(); show();
}
export const rerender = () => show();
function show(){
  const top = stack[stack.length - 1];
  if(!top) return;
  runCleanup();
  current = top;
  const app = document.getElementById('app');
  app.innerHTML = '';
  const r = screens[top.name](app, top.params);
  cleanup = typeof r === 'function' ? r : null;
  if(hook){ const h = hook(top.name, app); hookCleanup = typeof h === 'function' ? h : null; }
  scrollTo(0, 0);
  if(TG && TG.initData && TG.BackButton){ try{ stack.length > 1 ? TG.BackButton.show() : TG.BackButton.hide(); }catch(e){} }
}
if(TG && TG.initData && TG.BackButton){ try{ TG.BackButton.onClick(back); }catch(e){} }
