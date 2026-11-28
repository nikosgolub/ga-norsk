// Генерирует js/data/dialogs.js из старого index.html (ветка main).
// Запуск: git show main:index.html > /tmp/legacy.html && node tools/extract-data.mjs /tmp/legacy.html
// Старые метки t (целые секунды «на глаз») не переносим — тайминги берём из audio/NNnor.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = fs.readFileSync(process.argv[2], 'utf8');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function grab(name){
  const m = src.indexOf('const ' + name + ' = ');
  if(m < 0) throw new Error('not found: ' + name);
  const start = src.indexOf('[', m);
  let depth = 0, inStr = false, esc = false, i = start;
  for(; i < src.length; i++){
    const c = src[i];
    if(inStr){ if(esc) esc = false; else if(c === '\\') esc = true; else if(c === '"') inStr = false; continue; }
    if(c === '"') inStr = true;
    else if(c === '[') depth++;
    else if(c === ']'){ depth--; if(depth === 0) break; }
  }
  return JSON.parse(src.slice(start, i + 1));
}

const dialogs = grab('DIALOGS').map(d => ({
  id: d.id, file: d.file, title: d.title, sub: d.sub,
  lines: d.lines.map(l => ({ no: l.no, ru: l.ru, en: l.en }))
}));
const body = dialogs.map(d => JSON.stringify(d)).join(',\n');
fs.writeFileSync(path.join(root, 'js/data/dialogs.js'),
  '// Сгенерировано tools/extract-data.mjs — не править руками.\nexport const DIALOGS = [\n' + body + '\n];\n');
console.log('dialogs:', dialogs.length, 'lines:', dialogs.reduce((n, d) => n + d.lines.length, 0));
