# 생성된 글에서 숫자 뒤 조사가 받침과 맞는지 검사 (python3 scripts/g4/josa_check.py)
import json, re, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'g5'))
from lib import has_batchim, _final_jong
src = open(os.path.join(os.path.dirname(__file__), '..', '..', 'shared', 'questions-g4.js'), encoding='utf-8').read()
data = json.loads(src[src.index('subjects: ') + 10: src.rindex('};')].strip())
PAIRS = {'이에요': True, '예요': False, '이': True, '가': False, '을': True, '를': False, '은': True, '는': False, '과': True, '와': False}
bad = 0
def chk(where, t):
    global bad
    for m in re.finditer(r'(\d+(?:/\d+)?|[a-zA-Z²³]+)(이에요|예요|으로|로|이|가|을|를|은|는|과|와)(?=[\s.,)!?]|$)', t):
        word, j = m.group(1), m.group(2)
        if re.fullmatch(r'[a-zA-Z²³]+', word) and word not in ('cm', 'm', 'L', 'kg', 'g', 'km', 'mL', 'cm²', 'm²', 'km²', 'cm³', 'm³'): continue
        if j in ('으로', '로'):
            ok = (j == '으로') == (_final_jong(word) not in (0, 8))
        else:
            ok = PAIRS[j] == has_batchim(word)
        if not ok:
            bad += 1; print(where, '|', t[max(0, m.start() - 15): m.end() + 5])
for s in data:
    for u in s['units']:
        for a in u['areas']:
            for q in a['questions']:
                for k in ('text', 'hint1', 'hint2', 'explain', 'step'): chk(q['id'] + ':' + k, q[k])
            for t in a['twins']:
                chk(t['id'], t['text'])
                for h in t['hints']: chk(t['id'] + ':h', h)
print('조사 확인 필요:', bad)
