# 6-2 문제 은행 공통 도구 (5학년 lib.py를 함께 씀)
# 식은 분수(3/4), 대분수(1 1/2), 소수(0.25), 자연수, 괄호, + − × ÷ 를 읽습니다.
# 오답 보기는 '실수 유형'마다 식을 다르게 계산한 값입니다 (mode).
import os, re, sys
from fractions import Fraction as Fr
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'g5'))
from lib import Bank, Q, T, area, lv, fstr, dstr, numval, ieyo, eul, iga, eun, gwa, ro, fix_josa, NotEnough  # noqa: F401

TOK = re.compile(r'\s*(\d+ \d+/\d+|\d+/\d+|\d+\.\d+|\d+|[()+\-−×÷])')
def toks(expr):
    out, i = [], 0
    while i < len(expr):
        m = TOK.match(expr, i)
        if not m:
            if expr[i:].strip() == '': break
            raise ValueError('식 읽기 실패: ' + expr)
        out.append(m.group(1).replace('-', '−')); i = m.end()
    return out

def num(t):
    m = re.match(r'^(\d+) (\d+)/(\d+)$', t)
    if m: return int(m.group(1)) + Fr(int(m.group(2)), int(m.group(3)))
    m = re.match(r'^(\d+)/(\d+)$', t)
    if m: return Fr(int(m.group(1)), int(m.group(2)))
    return Fr(t)

class Num:
    """수와 그 글자 (대분수·분모 정보를 실수 계산에 쓰려고)"""
    def __init__(self, t): self.t = t; self.v = num(t)

def div(a, b, mode, at, bt):
    """a ÷ b 를 실수 유형(mode)대로 계산. at, bt: 글자 (없으면 None)"""
    if mode == 'ok': return a / b
    if mode == 'noflip': return a * b                      # 나누는 수를 뒤집지 않고 곱함
    if mode == 'flipa': return b / a                       # 나누어지는 수를 뒤집음 (몫의 역수)
    if mode == 'keepden':                                  # 분자끼리만 나누고 분모는 그대로 둠
        if at and bt and '/' in at and '/' in bt and a.denominator == b.denominator and ' ' not in at:
            return Fr(a.numerator, b.numerator) / a.denominator
        return None
    if mode == 'mixpart':                                  # 대분수의 분수 부분만 나눔
        if at and ' ' in at:
            w = int(at.split(' ')[0]); return w + (a - w) / b
        return None
    if mode == 'x10': return a / b * 10                    # 몫의 소수점 위치
    if mode == 'd10': return a / b / 10
    if mode == 'd100': return a / b / 100
    if mode == 'x100': return a / b * 100
    if mode == 'mul': return a * b
    return a / b

def ev(expr, mode='ok', order=False, first_only=True):
    """식 값. mode는 ÷에만 적용 (first_only면 첫 ÷만). order=True면 괄호·우선순위 무시하고 앞에서부터."""
    t = toks(expr)
    pos = [0]; used = [False]
    def apply(a, op, b, at, bt):
        if op == '+': return a + b
        if op == '−': return a - b
        if op == '×': return a * b
        m = mode if (not first_only or not used[0]) else 'ok'
        used[0] = True
        r = div(a, b, m, at, bt)
        if r is None: raise ValueError('mode 불가')
        return r
    def atom():
        tk = t[pos[0]]; pos[0] += 1
        if tk == '(':
            v = expr_(); pos[0] += 1; return v, None
        return num(tk), tk
    def term():
        v, vt = atom()
        while pos[0] < len(t) and t[pos[0]] in ('×', '÷') and not order:
            op = t[pos[0]]; pos[0] += 1
            w, wt = atom(); v = apply(v, op, w, vt, wt); vt = None
        return v, vt
    def expr_():
        if order:
            v, vt = atom()
            while pos[0] < len(t) and t[pos[0]] != ')':
                op = t[pos[0]]; pos[0] += 1
                w, wt = atom(); v = apply(v, op, w, vt, wt); vt = None
            return v
        v, vt = term()
        while pos[0] < len(t) and t[pos[0]] in ('+', '−'):
            op = t[pos[0]]; pos[0] += 1
            w, wt = term(); v = apply(v, op, w, vt, wt)
        return v
    v = expr_()
    return v

def safe_ev(expr, mode, **k):
    try:
        v = ev(expr, mode, **k)
    except (ValueError, ZeroDivisionError):
        return None
    return v if v is not None and v > 0 else None

def F(x, mixed=True):
    return fstr(x, mixed)

def D(x):
    try: return dstr(x)
    except ValueError: return None
