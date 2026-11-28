// Экран блокировки: название, обложка, play/pause/±10 с. В WebView Telegram поддержка не гарантирована — если нет, молча пропускаем.
export function setMediaSession(audio, { title, artist, cover }){
  if(!('mediaSession' in navigator)) return () => {};
  try{
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album: 'Gå!',
      artwork: cover ? [{ src: new URL(cover, location.href).href, sizes: '640x478', type: 'image/webp' }] : [] });
    const set = (a, f) => { try{ navigator.mediaSession.setActionHandler(a, f); }catch(e){} };
    set('play', () => audio.play()); set('pause', () => audio.pause());
    set('seekbackward', () => { audio.currentTime = Math.max(0, audio.currentTime - 10); });
    set('seekforward', () => { audio.currentTime = Math.min(audio.duration || 1e9, audio.currentTime + 10); });
  }catch(e){}
  return () => { try{ ['play', 'pause', 'seekbackward', 'seekforward'].forEach(a => navigator.mediaSession.setActionHandler(a, null)); navigator.mediaSession.metadata = null; }catch(e){} };
}
