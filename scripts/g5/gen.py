# 5학년 문제 은행 만들기: python3 scripts/g5/gen.py  → shared/questions-g5.js
# 단원 내용은 u_*.py 에 있습니다. 정답은 모두 계산으로 넣고, 오답은 실수 유형별 계산 값에서 고릅니다.
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import importlib

TERM1 = ['u_mix', 'u_fac', 'u_corr', 'u_red', 'u_fadd', 'u_poly']
TERM2 = ['u_range', 'u_fmul', 'u_cong', 'u_dmul', 'u_cuboid', 'u_avg']
# 몬스터: 6학년과 같은 6종류를 단원 순서대로
MONS = [
    ('dragon', 0, ['용콩이', '비늘드라몬', '암흑바룡', '메가워드라몬']),
    ('octo', 180, ['문어콩', '옥토바이트', '크라케노이드', '심해거수몬']),
    ('griffin', 140, ['깃부리', '그리키드', '수호그리폰', '황금뇌수몬']),
    ('haetae', 300, ['뿔멍이', '해태치', '단죄해치몬', '신갑수호몬']),
    ('kirin', 90, ['불사슴', '화록몬', '염제기린몬', '천뇌신록몬']),
    ('unicorn', 260, ['뽀롱마', '오로라콘', '순백천마몬', '세인트페가몬']),
]

def unit_js(mod_name, i):
    mod = importlib.import_module(mod_name)
    u = mod.build()
    art, hue, mons = MONS[i]
    return {
        'id': u['id'], 'name': u['name'], 'ready': True, 'dragon': mons[3], 'hue': hue, 'art': art, 'mons': mons,
        'standards': [{'code': c, 'text': t} for c, t in u['standards']],
        'mistakes': u['mistakes'], 'areas': u['areas'],
    }

def main(only=None):
    subjects = []
    for sid, term, mods in (('math5a', '1학기', TERM1), ('math5b', '2학기', TERM2)):
        units = []
        for i, m in enumerate(mods):
            if only and m not in only:
                continue
            if not os.path.exists(os.path.join(HERE, m + '.py')):
                continue
            units.append(unit_js(m, i))
        subjects.append({'id': sid, 'name': '수학', 'icon': '🔢', 'grade': 5, 'term': term, 'units': units})
    data = json.dumps(subjects, ensure_ascii=False, indent=1)
    js = ('// 5학년 수학 문제 은행 — 자동으로 만든 파일입니다. 직접 고치지 말고 scripts/g5/ 의 단원 파일을 고친 뒤\n'
          '// python3 scripts/g5/gen.py 로 다시 만드세요. (정답은 계산으로 넣었고, 오답 보기는 실수 유형별로 계산한 값입니다.)\n'
          '(function (root, factory) {\n'
          "  if (typeof module === 'object' && module.exports) module.exports = factory();\n"
          '  else root.MQQuestionsG5 = factory();\n'
          "})(typeof globalThis !== 'undefined' ? globalThis : this, function () {\n"
          "  'use strict';\n"
          f'  return {{ subjects: {data} }};\n'
          '});\n')
    out = os.path.join(HERE, '..', '..', 'shared', 'questions-g5.js')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(js)
    n = sum(len(a['questions']) + len(a['twins']) for s in subjects for u in s['units'] for a in u['areas'])
    print('shared/questions-g5.js', sum(len(s['units']) for s in subjects), '단원', n, '문항')
    return subjects

if __name__ == '__main__':
    main()
