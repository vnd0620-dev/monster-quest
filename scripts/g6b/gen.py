# 6학년 2학기 문제 은행 만들기: python3 scripts/g6b/gen.py  → shared/questions-g6b.js
# 단원 내용은 u_*.py 에 있습니다. 정답은 모두 계산으로 넣고, 오답은 실수 유형별 계산 값에서 고릅니다.
import json, os, sys, importlib
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
# 몬스터: 6-1과 같은 6종류를 단원 순서대로
MONS = [
    ('dragon', 0, ['용콩이', '비늘드라몬', '암흑바룡', '메가워드라몬']),
    ('octo', 180, ['문어콩', '옥토바이트', '크라케노이드', '심해거수몬']),
    ('griffin', 140, ['깃부리', '그리키드', '수호그리폰', '황금뇌수몬']),
    ('haetae', 300, ['뿔멍이', '해태치', '단죄해치몬', '신갑수호몬']),
    ('kirin', 90, ['불사슴', '화록몬', '염제기린몬', '천뇌신록몬']),
    ('unicorn', 260, ['뽀롱마', '오로라콘', '순백천마몬', '세인트페가몬']),
]

UNITS = ['u_fdiv', 'u_space', 'u_ddiv', 'u_prop', 'u_circ', 'u_solid']

def unit_js(mod_name, i):
    u = importlib.import_module(mod_name).build()
    art, hue, mons = MONS[i]
    return {'id': u['id'], 'name': u['name'], 'ready': True, 'dragon': mons[3], 'hue': hue, 'art': art, 'mons': mons,
            'standards': [{'code': c, 'text': t} for c, t in u['standards']], 'mistakes': u['mistakes'], 'areas': u['areas']}

def main():
    units = [unit_js(m, i) for i, m in enumerate(UNITS) if os.path.exists(os.path.join(HERE, m + '.py'))]
    subjects = [{'id': 'math6b', 'name': '수학', 'icon': '🔢', 'grade': 6, 'term': '2학기', 'units': units}]
    data = json.dumps(subjects, ensure_ascii=False, indent=1)
    js = ('// 6학년 2학기 수학 문제 은행 — 자동으로 만든 파일입니다. 직접 고치지 말고 scripts/g6b/ 의 단원 파일을 고친 뒤\n'
          '// python3 scripts/g6b/gen.py 로 다시 만드세요. (정답은 계산으로 넣었고, 오답 보기는 실수 유형별로 계산한 값입니다.)\n'
          '(function (root, factory) {\n'
          "  if (typeof module === 'object' && module.exports) module.exports = factory();\n"
          '  else root.MQQuestionsG6B = factory();\n'
          "})(typeof globalThis !== 'undefined' ? globalThis : this, function () {\n"
          "  'use strict';\n"
          f'  return {{ subjects: {data} }};\n'
          '});\n')
    with open(os.path.join(HERE, '..', '..', 'shared', 'questions-g6b.js'), 'w', encoding='utf-8') as f:
        f.write(js)
    n = sum(len(a['questions']) + len(a['twins']) for u in units for a in u['areas'])
    print('shared/questions-g6b.js', len(units), '단원', n, '문항')

if __name__ == '__main__':
    main()
