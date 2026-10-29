# 검토용: 단원 하나의 문항을 화면에 보여 줍니다.  python3 scripts/g4/show.py u_big
import os, sys, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
u = importlib.import_module(sys.argv[1]).build()
D = {1: '하', 2: '중', 3: '상'}
for a in u['areas']:
    print(f"\n## {a['id']} {a['name']} ({a['std']})")
    for q in a['questions']:
        print(f"{q['id']:>8} {D[q['diff']]} | {q['text']} | 답 {q['answer']} | " + ', '.join(f'{w}[{t}]' for w, t in zip(q['wrongs'], q['mis'])))
        if '-v' in sys.argv:
            print('           h1:', q['hint1'], '| h2:', q['hint2'], '| ex:', q['explain'], '| st:', q['step'])
    for t in a['twins']:
        print(f"{t['id']:>8} {D[t['diff']]} | {t['text']} | 답 {t['answers']}")
        if '-v' in sys.argv:
            print('           ', t['hints'])
