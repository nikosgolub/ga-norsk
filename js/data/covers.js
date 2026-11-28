// Обложки диалогов: многосерийные делят одну картинку (отображение Арт-директора).
const PAIRS = [[2, 3], [9, 10], [17, 18], [20, 24], [27, 28]];
export function cover(id){
  const n = parseInt(id, 10), p2 = x => String(x).padStart(2, '0');
  for(const [a, b] of PAIRS) if(n >= a && n <= b) return 'img/d/D' + p2(a) + '-' + p2(b) + '.webp';
  return 'img/d/D' + p2(n) + '.webp';
}
