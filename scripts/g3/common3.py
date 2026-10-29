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
    def q(qid, d, text, ans, wrongs, h2, ex, step, meta=None, h1=None, same_ok=False):
        return Q(b, qid, d, text, ans, wrongs, h1 or H, h2, ex, step, meta, same_ok)
    def t(tid, d, text, ans, h2, h3=None, meta=None, h1=None):
        ans = ans if isinstance(ans, list) else [ans]
        return T(b, tid, d, text, ans, h1 or H, h2, h3 or f'정답은 {ieyo(ans[-1])}.', meta)
    return q, t

# ───── 3학년 계산 실수 값 ─────
def digs(n, k): return [n // 10 ** i % 10 for i in range(k)]
def undigs(ds): return sum(d * 10 ** i for i, d in enumerate(ds))
def add_nocarry(a, b):
    k = max(len(str(a)), len(str(b))); return undigs([(x + y) % 10 for x, y in zip(digs(a, k), digs(b, k))])
def sub_swap(a, b):
    k = len(str(a)); return undigs([abs(x - y) for x, y in zip(digs(a, k), digs(b, k))])
def sub_nodec(a, b):
    """받아내림을 했지만 윗자리에서 1을 빼지 않음"""
    k = len(str(a)); out = []
    for x, y in zip(digs(a, k), digs(b, k)): out.append(x - y + 10 if x < y else x - y)
    return undigs(out)
def mul_nocarry(a, m):
    """올림을 하지 않음: 아랫자리는 곱의 일의 자리만, 맨 윗자리는 곱을 그대로 씀 (예: 47×6 → 242)"""
    ds = digs(a, len(str(a))); top = len(ds) - 1
    return sum((d * m) % 10 * 10 ** i for i, d in enumerate(ds[:-1])) + ds[-1] * m * 10 ** top
def mul_carryskip(a, m):
    """자리마다 곱을 이어 씀 (예: 46×3 → 12|18 → 1218)"""
    return int(''.join(str(x * m) for x in reversed(digs(a, len(str(a))))))
def uniq(xs):
    out = []
    for x in xs:
        if x is not None and x not in out: out.append(x)
    return out
