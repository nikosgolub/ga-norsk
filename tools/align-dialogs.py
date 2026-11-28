#!/usr/bin/env python3
"""Выравнивание слов расшифровки whisper (tools/whisper-raw/NNnor.json) на слова реплик из js/data/dialogs.js.
Пишет audio/NNnor.json: {"d": длительность, "l": [{"s":начало,"e":конец,"w":[[слово,начало,конец],…]}]}.
Слова реплики берём из dialogs.js (без «Имя:» — говорящих в аудио нет), время — из расшифровки.
Запуск: python3 tools/align-dialogs.py   (расшифровка: tools/transcribe.py small 01nor 02nor …)"""
import json, re, os, sys, difflib

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
src = open(os.path.join(ROOT, 'js/data/dialogs.js'), encoding='utf8').read()
DIALOGS = [json.loads(l.rstrip(',')) for l in src.splitlines() if l.startswith('{"id"')]

def norm(w): return re.sub(r'[^\wæøåÆØÅ]', '', w.lower())
def speaker_strip(s):
    m = re.match(r'^([^:]{1,24}):\s*(.*)$', s)
    return m.group(2) if m else s

report = []
for d in DIALOGS:
    raw = json.load(open(os.path.join(ROOT, 'tools/whisper-raw', d['id'] + '.json'), encoding='utf8'))
    W = [w for w in raw['words'] if norm(w['w'])]
    wt = [norm(w['w']) for w in W]
    lines, flat = [], []                       # flat: (line_idx, word_idx, display, norm)
    for li, l in enumerate(d['lines']):
        ws = speaker_strip(l['no']).split()
        lines.append(ws)
        for wi, w in enumerate(ws):
            if norm(w): flat.append((li, wi, w, norm(w)))
    lt = [f[3] for f in flat]
    sm = difflib.SequenceMatcher(None, lt, wt, autojunk=False)
    times = [None] * len(flat)
    for a, b, n in sm.get_matching_blocks():
        for k in range(n): times[a + k] = (W[b + k]['s'], W[b + k]['e'])
    # слова, не нашедшие точной пары: попытка нечёткого совпадения внутри «окна» между соседними найденными
    i = 0
    while i < len(flat):
        if times[i] is not None: i += 1; continue
        j = i
        while j < len(flat) and times[j] is None: j += 1
        lo = times[i - 1][1] if i > 0 else 0.0
        hi = times[j][0] if j < len(flat) else raw['dur']
        cand = [w for w in W if w['s'] >= lo - 0.05 and w['e'] <= hi + 0.05 and not any(t and abs(t[0] - w['s']) < 1e-6 for t in times)]
        n = j - i
        if len(cand) == n:
            for k in range(n): times[i + k] = (cand[k]['s'], cand[k]['e'])
        else:                                   # равномерно по промежутку
            step = (hi - lo) / (n + 1)
            for k in range(n): times[i + k] = (round(lo + step * (k + 0.5), 2), round(lo + step * (k + 1), 2))
        i = j
    exact = sum(1 for _ in range(1)) and sum(n for _, _, n in sm.get_matching_blocks())
    out = {'d': round(raw['dur'], 2), 'l': []}
    low = []
    for li, ws in enumerate(lines):
        items = [(f, times[fi]) for fi, f in enumerate(flat) if f[0] == li]
        wl = [[f[2], round(t[0], 2), round(t[1], 2)] for f, t in items]
        if not wl: out['l'].append({'s': 0, 'e': 0, 'w': []}); continue
        out['l'].append({'s': wl[0][1], 'e': wl[-1][2], 'w': wl})
    # монотонность: конец слова не раньше начала, начало реплики не раньше конца прошлой
    prev = 0
    for l in out['l']:
        if l['s'] < prev - 0.001: low.append('order')
        prev = max(prev, l['e'])
    cov = exact / len(flat)
    report.append((d['id'], len(flat), round(cov * 100), low))
    json.dump(out, open(os.path.join(ROOT, 'audio', d['id'] + '.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('id     words exact% issues')
for r in report: print(r[0], str(r[1]).rjust(5), str(r[2]).rjust(5), r[3] or '')
