// Генерирует js/data/dialogs.js из старого index.html (ветка main).
// Запуск: git show main:index.html > /tmp/legacy.html && node tools/extract-data.mjs /tmp/legacy.html
// Старые метки t (целые секунды «на глаз») не переносим — тайминги берём из audio/NNnor.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = fs.readFileSync(process.argv[2], 'utf8');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function grab(name, kw = 'const'){
  const m = src.indexOf(kw + ' ' + name + ' = ');
  if(m < 0) throw new Error('not found: ' + name);
  const a1 = src.indexOf('[', m), a2 = src.indexOf('{', m), start = (a2 >= 0 && a2 < a1) ? a2 : a1;
  let depth = 0, inStr = false, esc = false, i = start;
  for(; i < src.length; i++){
    const c = src[i];
    if(inStr){ if(esc) esc = false; else if(c === '\\') esc = true; else if(c === inStr) inStr = false; continue; }
    if(c === '"' || c === "'") inStr = c;
    else if(c === '[' || c === '{') depth++;
    else if(c === ']' || c === '}'){ depth--; if(depth === 0) break; }
  }
  return (0, eval)('(' + src.slice(start, i + 1) + ')');   // исходник наш, из репозитория
}

const fixes = JSON.parse(fs.readFileSync(path.join(root, 'tools/dialog-fixes.json'), 'utf8'));
const dialogs = grab('DIALOGS').map(d => {
  const o = { id: d.id, file: d.file, title: d.title, sub: d.sub,
    lines: d.lines.map(l => ({ no: l.no, ru: l.ru, en: l.en })) };
  return Object.assign(o, fixes[d.id] || {});
});
const body = dialogs.map(d => JSON.stringify(d)).join(',\n');
fs.writeFileSync(path.join(root, 'js/data/dialogs.js'),
  '// Сгенерировано tools/extract-data.mjs — не править руками.\nexport const DIALOGS = [\n' + body + '\n];\n');
console.log('dialogs:', dialogs.length, 'lines:', dialogs.reduce((n, d) => n + d.lines.length, 0));

// ── слова, глоссарий, формы (для «слово → карточка») ──
const words = grab('WORDS', 'let');
const extra = grab('WC_EXTRA'), gloss = grab('WC_GLOSS');
fs.writeFileSync(path.join(root, 'js/data/words.js'),
  '// Сгенерировано tools/extract-data.mjs — не править руками.\n' +
  '// WORDS — слова курса по урокам [{n: словарная форма, r: русский, en}]; WC_EXTRA — частые слова вне уроков [форма, ru, en, [формы]]; WC_GLOSS — [форма в тексте, словарная, ru, en].\n' +
  'export const WORDS = ' + JSON.stringify(words) + ';\nexport const WC_EXTRA = ' + JSON.stringify(extra) + ';\nexport const WC_GLOSS = ' + JSON.stringify(gloss) + ';\n');
function groups(name){
  const m = src.indexOf('const ' + name + ' = (');
  const end = src.indexOf('.map(function(s){return s.split("|");});', m);
  return (0, eval)(src.slice(m + ('const ' + name + ' = ').length, end + '.map(function(s){return s.split("|");})'.length));
}
const irr = grab('NOUN_IRR');
fs.writeFileSync(path.join(root, 'js/data/forms.js'),
  '// Сгенерировано tools/extract-data.mjs — таблицы форм глаголов, прилагательных, степеней, неправильных существительных.\n' +
  'export const VERB_GROUPS = ' + JSON.stringify(groups('VERB_GROUPS')) + ';\nexport const ADJ_GROUPS = ' + JSON.stringify(groups('ADJ_GROUPS')) +
  ';\nexport const DEG_GROUPS = ' + JSON.stringify(groups('DEG_GROUPS')) + ';\nexport const NOUN_IRR = ' + JSON.stringify(irr) + ';\n');
console.log('words lessons:', words.length, 'entries:', words.reduce((n, l) => n + l.length, 0), 'extra:', extra.length, 'gloss:', gloss.length);

// ── глоссарий слов диалогов (ручной, tools/dialog-gloss.txt) ──
const dg = fs.readFileSync(path.join(root, 'tools/dialog-gloss.txt'), 'utf8').split('\n')
  .filter(l => l.trim() && !l.startsWith('#')).map(l => l.split('|'))
  .filter(a => { if(a.length !== 4) throw new Error('bad gloss line: ' + a.join('|')); return true; });
fs.writeFileSync(path.join(root, 'js/data/gloss-dialogs.js'),
  '// Сгенерировано из tools/dialog-gloss.txt — не править руками. [форма в тексте, словарная форма, ru, en]. ЧЕРНОВИК: проверить носителем.\nexport const DIALOG_GLOSS = ' + JSON.stringify(dg) + ';\n');
console.log('dialog gloss:', dg.length);
