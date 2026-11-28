// Мини-роутер: стек экранов, кнопка «Назад» Telegram, рендер в #app.
import { TG } from './tg.js';
const screens = {};
const stack = [];
let current = null, cleanup = null;

export const register = (name, fn) => { screens[name] = fn; };
export function go(name, params = {}, { replace = false } = {}){
  if(cleanup){ try{ cleanup(); }catch(e){} cleanup = null; }
  if(replace) stack.pop();
  stack.push({ name, params });
  show();
}
export function back(){
  if(stack.length < 2) return;
  if(cleanup){ try{ cleanup(); }catch(e){} cleanup = null; }
  stack.pop(); show();
}
export const rerender = () => show();
function show(){
  const top = stack[stack.length - 1];
  if(!top) return;
  current = top;
  const app = document.getElementById('app');
  app.innerHTML = '';
  const r = screens[top.name](app, top.params);
  cleanup = typeof r === 'function' ? r : null;
  scrollTo(0, 0);
  if(TG && TG.initData && TG.BackButton){ try{ stack.length > 1 ? TG.BackButton.show() : TG.BackButton.hide(); }catch(e){} }
}
if(TG && TG.initData && TG.BackButton){ try{ TG.BackButton.onClick(back); }catch(e){} }
