// Telegram WebApp: тема, safe area, haptics. Вне Telegram — всё no-op.
export const TG = (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) || null;

export function tgInit(){
  if(!TG) return;
  try{ TG.ready(); TG.expand(); }catch(e){}
  try{
    const mob = /^(ios|android)/.test(String(TG.platform || ''));
    if(mob && TG.isVersionAtLeast && TG.isVersionAtLeast('8.0') && TG.requestFullscreen) TG.requestFullscreen();
  }catch(e){}
  const apply = () => {
    const top = (TG.contentSafeAreaInset && TG.contentSafeAreaInset.top || 0) + (TG.safeAreaInset && TG.safeAreaInset.top || 0);
    document.documentElement.style.setProperty('--tg-top', top + 'px');
  };
  apply();
  try{ TG.onEvent('safeAreaChanged', apply); TG.onEvent('contentSafeAreaChanged', apply); TG.onEvent('fullscreenChanged', apply); }catch(e){}
}
// В обычном браузере SDK тоже создаёт объект (версия 6.0, без initData) — настоящим считаем только Mini App.
export const inTelegram = !!(TG && TG.initData);
export const hasCloud = !!(inTelegram && TG.isVersionAtLeast && TG.isVersionAtLeast('6.9') && TG.CloudStorage);
export const tgScheme = () => (inTelegram && TG.colorScheme) || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

export function buzz(kind){
  const H = TG && TG.HapticFeedback;
  try{
    if(H){
      if(kind === 'win') H.notificationOccurred('success');
      else if(kind === 'err') H.notificationOccurred('error');
      else H.impactOccurred('light');
    } else if(navigator.vibrate){ navigator.vibrate(kind === 'win' ? [50, 50, 50] : 12); }
  }catch(e){}
}
