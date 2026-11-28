import { state, update } from './store.js';
import { tgScheme, TG } from './tg.js';
export function applyTheme(){
  const light = (state.theme === 'auto' ? tgScheme() : state.theme) === 'light';
  document.documentElement.classList.toggle('theme-light', light);
  const m = document.querySelector('meta[name=theme-color]');
  if(m) m.content = light ? '#F4F2EE' : '#141414';
  try{ if(TG && TG.initData){ TG.setHeaderColor(light ? '#F4F2EE' : '#141414'); TG.setBackgroundColor(light ? '#F4F2EE' : '#141414'); } }catch(e){}
}
export const toggleTheme = () => {
  const light = document.documentElement.classList.contains('theme-light');
  update(s => { s.theme = light ? 'dark' : 'light'; });
  applyTheme();
};
