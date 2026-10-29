# 3학년 문제 은행 만들기: python3 scripts/g3/gen.py  → shared/questions-g3.js
# 단원 내용은 u_*.py 에 있습니다. 정답은 모두 계산으로 넣고, 오답은 실수 유형별 계산 값에서 고릅니다.
import json, os, sys, importlib, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(1, os.path.join(HERE, '..', 'g6b'))
# 몬스터: 6-1과 같은 6종류를 단원 순서대로
MONS = [
    ('dragon', 0, ['용콩이', '비늘드라몬', '암흑바룡', '메가워드라몬']),
    ('octo', 180, ['문어콩', '옥토바이트', '크라케노이드', '심해거수몬']),
    ('griffin', 140, ['깃부리', '그리키드', '수호그리폰', '황금뇌수몬']),
    ('haetae', 300, ['뿔멍이', '해태치', '단죄해치몬', '신갑수호몬']),
    ('kirin', 90, ['불사슴', '화록몬', '염제기린몬', '천뇌신록몬']),
    ('unicorn', 260, ['뽀롱마', '오로라콘', '순백천마몬', '세인트페가몬']),
]

TERM1 = ['u_as3', 'u_plane3', 'u_div3a', 'u_mul3a', 'u_lt3', 'u_fd3']
TERM2 = ['u_mul3b', 'u_div3b', 'u_circ3', 'u_frac3', 'u_cw3', 'u_pic3']

def unit_js(mod_name, i):
    # g5 폴더에도 같은 이름(u_fadd, u_poly)이 있어서 파일 경로로 직접 읽음
    spec = importlib.util.spec_from_file_location('g3_' + mod_name, os.path.join(HERE, mod_name + '.py'))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    u = m.build()
    art, hue, mons = MONS[i]
    return {'id': u['id'], 'name': u['name'], 'ready': True, 'dragon': mons[3], 'hue': hue, 'art': art, 'mons': mons,
            'standards': [{'code': c, 'text': t} for c, t in u['standards']], 'mistakes': u['mistakes'], 'areas': u['areas']}

def main():
    subjects = []
    for sid, term, mods in (('math3a', '1학기', TERM1), ('math3b', '2학기', TERM2)):
        units = [unit_js(m, i) for i, m in enumerate(mods) if os.path.exists(os.path.join(HERE, m + '.py'))]
        subjects.append({'id': sid, 'name': '수학', 'icon': '🔢', 'grade': 3, 'term': term, 'units': units})
    data = json.dumps(subjects, ensure_ascii=False, indent=1)
    js = ('// 3학년 수학 문제 은행 — 자동으로 만든 파일입니다. 직접 고치지 말고 scripts/g3/ 의 단원 파일을 고친 뒤\n'
          '// python3 scripts/g3/gen.py 로 다시 만드세요. (정답은 계산으로 넣었고, 오답 보기는 실수 유형별로 계산한 값입니다.)\n'
          '(function (root, factory) {\n'
          "  if (typeof module === 'object' && module.exports) module.exports = factory();\n"
          '  else root.MQQuestionsG3 = factory();\n'
          "})(typeof globalThis !== 'undefined' ? globalThis : this, function () {\n"
          "  'use strict';\n"
          f'  return {{ subjects: {data} }};\n'
          '});\n')
    with open(os.path.join(HERE, '..', '..', 'shared', 'questions-g3.js'), 'w', encoding='utf-8') as f:
        f.write(js)
    n = sum(len(a['questions']) + len(a['twins']) for s_ in subjects for u in s_['units'] for a in u['areas'])
    print('shared/questions-g3.js', sum(len(s_['units']) for s_ in subjects), '단원', n, '문항')

if __name__ == '__main__':
    main()
