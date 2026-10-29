# 4학년 문제 은행 공통 도구 (5학년 lib.py, 6-2 common.py를 함께 씀)
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'g6b'))
sys.path.insert(1, os.path.join(HERE, '..', 'g5'))
from common import Bank, Q, T, area, lv, F, D, ev, safe_ev, ieyo, eul, iga, eun, gwa, ro, num, fix_josa  # noqa: F401

DIG = '영일이삼사오육칠팔구'
def _four(n):
    """0~9999 읽기 (일은 천·백·십 앞에서 생략)"""
    out = ''
    for v, name in ((1000, '천'), (100, '백'), (10, '십'), (1, '')):
        d = n // v % 10
        if d == 0: continue
        out += ('' if (d == 1 and name) else DIG[d]) + name
    return out
def kor(n):
    """수를 한글로 읽기: 47052 → 사만 칠천오십이, 10000 → 만, 300000000 → 삼억"""
    if n == 0: return '영'
    parts = []
    for unit, name in ((10 ** 12, '조'), (10 ** 8, '억'), (10 ** 4, '만'), (1, '')):
        g = n // unit % 10000
        if g == 0: continue
        s = _four(g)
        if name == '만' and g == 1 and not parts: s = ''  # 만 (일만 아님)
        parts.append(s + name)
    return ' '.join(p for p in parts if p)
def mixed(n):
    """수를 '4억 2000만' 처럼 쓰기"""
    parts = []
    for unit, name in ((10 ** 12, '조'), (10 ** 8, '억'), (10 ** 4, '만'), (1, '')):
        g = n // unit % 10000
        if g: parts.append(f'{g}{name}')
    return ' '.join(parts) if parts else '0'

def maker(b, H):
    """area 하나에서 쓰는 짧은 문항 함수: q(id, 난이도, 문제, 정답, 오답[(글, 유형)], 힌트2, 해설, 첫 단계, meta)"""
    def q(qid, d, text, ans, wrongs, h2, ex, step, meta=None, h1=None):
        return Q(b, qid, d, text, ans, wrongs, h1 or H, h2, ex, step, meta)
    def t(tid, d, text, ans, h2, h3=None, meta=None, h1=None):
        ans = ans if isinstance(ans, list) else [ans]
        return T(b, tid, d, text, ans, h1 or H, h2, h3 or f'정답은 {ieyo(ans[-1])}.', meta)
    return q, t
