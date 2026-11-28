// Онбординг «Как это работает» — 4 экрана (тексты утверждены владельцем 28.11, пока только русский).
import { register, back } from '../core/router.js';
import { update } from '../core/store.js';
import { DAY_GOAL_SEC } from '../core/path.js';

const SLIDES = [
  { img: 'img/onboarding-3.webp', h: 'Язык учат ушами и ртом', p: 'Как с велосипедом: правила не помогают, помогает практика. Уши учатся различать звуки, речь — произносить. Это метод Николая Замяткина: сначала очень много слушать, потом очень громко проговаривать.' },
  { img: 'img/onboarding-1.webp', h: 'Сначала слушай', p: 'Диалог по кругу, без текста — 3–5 часов. Кажется, что ничего не происходит. Происходит: мозг учится делить кашу звуков на слова. Это и есть прогресс, просто невидимый. Слушай в наушниках — экран можно блокировать, звук не прервётся.' },
  { img: 'img/onboarding-2.webp', h: 'Потом следи и говори', p: 'Смотри в текст, пока слышишь каждое слово. Потом проговаривай вслух, подражая интонации дикторов, — громче, чем кажется удобным. Правила и перевод — по желанию, не вместо слушания.' },
  { ring: true, h: 'Три часа в день', p: 'Одно кольцо. Оно растёт, пока играет диалог или идёт проговаривание. Первые пять диалогов — самые важные, на каждый уходит около двух недель. Переход к следующему этапу решаешь ты — когда слышишь все звуки.' }
];

const nb = t => t.replace(/ ([^ ]{1,3}) /g, ' $1\u00a0').replace(/ ([^ ]+)$/, '\u00a0$1');   // без висячих коротких слов и вдов
function ringArt(){
  const R = 90, C = 2 * Math.PI * R;
  return '<div class="ob-ring night-card"><div class="ring"><svg viewBox="0 0 216 216"><circle class="trk" cx="108" cy="108" r="' + R + '" fill="none" stroke-width="20"/>' +
    '<circle class="arc" cx="108" cy="108" r="' + R + '" fill="none" stroke-width="20" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * 0.62) + '"/></svg>' +
    '<div class="mid"><b>1 ч 54 мин</b><small>из ' + (DAY_GOAL_SEC / 3600) + ' ч</small></div></div><span class="ob-cap">пример</span></div>';
}

register('onboarding', app => {
  let i = 0;
  const done = () => update(s => { s.onboarded = true; });
  const draw = () => {
    const s = SLIDES[i], last = i === SLIDES.length - 1;
    app.innerHTML =
      '<div class="ob"><div class="top"><span class="t"></span>' + (last ? '' : '<button class="skip" id="skip">Пропустить</button>') + '</div>' +
      '<div class="ob-art">' + (s.ring ? ringArt() : '<img src="' + s.img + '" alt="" width="640" height="640">') + '</div>' +
      '<h1 class="h1">' + nb(s.h) + '</h1><p class="ob-p">' + nb(s.p) + '</p>' +
      '<div class="ob-foot"><div class="dots" aria-hidden="true">' + SLIDES.map((_, k) => '<i class="' + (k === i ? 'on' : '') + '"></i>').join('') + '</div>' +
      '<button class="btn" id="next">' + (last ? 'Начать' : 'Дальше') + '</button></div></div>';
    app.querySelector('#next').onclick = () => { if(last){ done(); back(); } else { i++; draw(); } };
    const sk = app.querySelector('#skip'); if(sk) sk.onclick = () => { done(); back(); };
  };
  draw();
  return done;     // выход любым способом (в т.ч. кнопка «Назад» Telegram) считается просмотром
});
