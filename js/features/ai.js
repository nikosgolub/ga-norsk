// Вызов ИИ через Cloudflare Worker (ключ хранится на сервере). Протокол как в старом приложении: POST {prompt, json} → {text}.
import { L } from '../core/i18n.js';
export const AI_URL = 'https://ro-ai.nikosgolub.workers.dev';
const err = reason => L(
  { quota: 'Дневной лимит запросов к ИИ исчерпан. Попробуй завтра.', net: 'Нет связи с ИИ. Проверь интернет.', other: 'ИИ сейчас не отвечает. Попробуй позже.' }[reason] || 'ИИ сейчас не отвечает. Попробуй позже.',
  { quota: "Today's AI limit is used up. Try again tomorrow.", net: 'No connection to the AI. Check your internet.', other: 'The AI is not responding. Try again later.' }[reason] || 'The AI is not responding. Try again later.');

export async function aiAsk(prompt, json = false){
  let res;
  try{ res = await fetch(AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, json: !!json, stream: false }) }); }
  catch(e){ throw new Error(err('net')); }
  if(!res.ok){ let reason = 'other'; try{ const j = await res.json(); if(j && j.reason) reason = j.reason; }catch(e){} throw new Error(err(reason)); }
  const txt = ((await res.json()).text || '').trim();
  if(!txt) throw new Error(err('other'));
  try{ return json ? JSON.parse(txt.replace(/^```json|```$/g, '').trim()) : txt; }catch(e){ throw new Error(err('other')); }
}
