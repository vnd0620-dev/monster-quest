# 5학년 문제 은행 생성기 공통 도구
# - 정답은 모두 계산해서 넣습니다 (손으로 적은 답이 틀릴 일이 없게).
# - 오답 보기는 '실수 유형'마다 따로 계산한 값에서 고릅니다. 정답과 같거나 크기가 같은 값, 겹치는 값은 버립니다.
# - 보기 후보가 3개보다 적으면 오류를 내서, 사람이 후보를 더 적도록 합니다.
import re
from fractions import Fraction as Fr

# ───── 수 쓰기 ─────
def fstr(x, mixed=True):
    """분수 값을 화면 글자로: 4 → '4', 3/4 → '3/4', 7/4 → '1 3/4' (mixed=False면 '7/4')"""
    x = Fr(x)
    if x.denominator == 1:
        return str(x.numerator)
    if x < 0:
        raise ValueError('음수')
    if mixed and x > 1:
        w = x.numerator // x.denominator
        r = x - w
        return f'{w} {r.numerator}/{r.denominator}'
    return f'{x.numerator}/{x.denominator}'

def dstr(x):
    """소수 값을 글자로 (끝의 0은 뺌)"""
    x = Fr(x)
    s = f'{float(x):.6f}'.rstrip('0').rstrip('.')
    if Fr(s) != x:
        raise ValueError(f'소수로 정확히 쓸 수 없음: {x}')
    return s

def raw(n, d):
    return f'{n}/{d}'

# 엔진의 numVal 과 같은 규칙으로 값 읽기 (뒤 단위는 무시)
NUM = re.compile(r'^(\d+)(?: (\d+)/(\d+)|/(\d+)|(\.\d+))?(?: ?[a-zA-Z가-힣²³%]*)?$')
def numval(s):
    m = NUM.match(re.sub(r'\s+', ' ', str(s).strip()))
    if not m:
        return None
    if m.group(2) is not None:
        return int(m.group(1)) + Fr(int(m.group(2)), int(m.group(3))) if int(m.group(3)) else None
    if m.group(4) is not None:
        return Fr(int(m.group(1)), int(m.group(4))) if int(m.group(4)) else None
    return Fr(m.group(1) + (m.group(5) or ''))

# ───── 보기 고르기 ─────
class NotEnough(Exception):
    pass

def pick(answer, cands, qid='', same_ok=False):
    """cands: [(보기 글자, 실수 유형)] 순서대로 쓸 수 있는 것 3개"""
    av = numval(answer)
    out, seen = [], {answer}
    seen_v = {av} if av is not None else set()
    for c in cands:
        if c is None:
            continue
        s, tag = c
        if s is None or s in seen:
            continue
        v = numval(s)
        if v is not None and (v == av if same_ok else v in seen_v):
            continue
        out.append((s, tag))
        seen.add(s)
        if v is not None:
            seen_v.add(v)
        if len(out) == 3:
            return out
    raise NotEnough(f'{qid}: 오답 후보 부족 {out} (정답 {answer})')

# ───── 식 계산 (혼합 계산) ─────
TOK = re.compile(r'\s*(\d+|[()+\-×÷])')
def tokens(expr):
    expr = expr.replace('−', '-')
    out, i = [], 0
    while i < len(expr):
        m = TOK.match(expr, i)
        if not m:
            if expr[i:].strip() == '':
                break
            raise ValueError('식 읽기 실패: ' + expr)
        out.append(m.group(1))
        i = m.end()
    return out

PREC = {'+': 1, '-': 1, '×': 2, '÷': 2}
def _apply(a, op, b):
    if op == '+': return a + b
    if op == '-': return a - b
    if op == '×': return a * b
    if b == 0: raise ZeroDivisionError
    return a / b

def parse(tok):
    """괄호 단위로 나눈 나무: ('n', 값) | ('p', [항목들]) — 항목은 수/괄호와 연산 기호가 번갈아 나옴"""
    def seq(i):
        items = []
        while i < len(tok) and tok[i] != ')':
            t = tok[i]
            if t == '(':
                sub, i = seq(i + 1)
                items.append(('p', sub))
                i += 1  # ')'
            elif t in PREC:
                items.append(('op', t)); i += 1
            else:
                items.append(('n', Fr(int(t)))); i += 1
        return items, i
    items, _ = seq(0)
    return items

def text_of(items):
    out = []
    for k, v in items:
        if k == 'n': out.append(str(v))
        elif k == 'op': out.append({'-': '−'}.get(v, v))
        else: out.append('(' + text_of(v) + ')')
    return ' '.join(out).replace('( ', '(').replace(' )', ')')

def evaluate(items, mode='ok', trace=None):
    """mode: ok(바른 순서) · order(앞에서부터 차례로) · paren(괄호 무시) · rtl(같은 급은 뒤에서부터) · addfirst(덧셈·뺄셈 먼저)"""
    if mode == 'paren':
        flat = []
        def fl(xs):
            for k, v in xs:
                if k == 'p': fl(v)
                else: flat.append((k, v))
        fl(items)
        items = flat
        mode = 'ok'
    vals, ops, texts = [], [], []
    for k, v in items:
        if k == 'n':
            vals.append(v); texts.append(str(v))
        elif k == 'p':
            vals.append(evaluate(v, mode, trace)); texts.append('(' + text_of(v) + ')')
        else:
            ops.append(v)
    # 남은 연산 순서 정하기
    while ops:
        if mode == 'order':
            i = 0
        else:
            if mode == 'addfirst':
                lv = [3 - PREC[o] for o in ops]
            else:
                lv = [PREC[o] for o in ops]
            top = max(lv)
            idx = [j for j, x in enumerate(lv) if x == top]
            i = idx[-1] if mode == 'rtl' else idx[0]
        a, b, op = vals[i], vals[i + 1], ops[i]
        r = _apply(a, op, b)
        if trace is not None and mode == 'ok':
            trace.append((f"{fmtv(a)} {({'-': '−'}).get(op, op)} {fmtv(b)}", r))
        vals[i:i + 2] = [r]
        ops.pop(i)
    return vals[0]

def fmtv(x):
    return str(x.numerator) if x.denominator == 1 else f'{x.numerator}/{x.denominator}'

def calc(expr, mode='ok', trace=None):
    return evaluate(parse(tokens(expr)), mode, trace)

def nice_int(x):
    return x is not None and x.denominator == 1 and x >= 0

def safe(expr, mode):
    try:
        v = calc(expr, mode)
    except ZeroDivisionError:
        return None
    if v.denominator != 1 or v < 0:
        return None
    return v

# ───── 문항 만들기 ─────
class Bank:
    def __init__(self, unit_id):
        self.unit_id = unit_id
        self.texts = set()

    def check_text(self, qid, text):
        key = re.sub(r'\s', '', text)
        if key in self.texts:
            raise ValueError(f'{qid}: 같은 문제 글이 이미 있음 — {text}')
        self.texts.add(key)

def Q(bank, qid, diff, text, answer, cands, hint1, hint2, explain, step, meta=None, same_ok=False):
    bank.check_text(qid, text)
    if isinstance(meta, str) and meta.startswith('첫 단계'):
        # 공통 힌트 + 문항 힌트 + 2차 힌트 + 해설 + 첫 단계 로 5개를 준 경우: 문항 힌트를 1차 힌트로 씀
        hint1, hint2, explain, step, meta = hint2, explain, step, meta, None
    assert meta is None or isinstance(meta, dict), f'{qid}: 인자 순서 확인 (meta={meta!r})'
    ws = pick(answer, cands, qid, same_ok)
    if not step.startswith('첫 단계'):
        step = '첫 단계: ' + step
    text, hint1, hint2, explain, step, answer = map(fix_josa, (text, hint1, hint2, explain, step, answer))
    return {'id': qid, 'diff': diff, 'text': text, 'answer': answer, 'wrongs': [fix_josa(w) for w, _ in ws], 'mis': [t for _, t in ws],
            'hint1': hint1, 'hint2': hint2, 'explain': explain, 'step': step, 'meta': meta}

def T(bank, tid, diff, text, answers, h1, h2, h3, meta=None):
    bank.check_text(tid, text)
    assert meta is None or isinstance(meta, dict), f'{tid}: 인자 순서 확인 (meta={meta!r})'
    if isinstance(answers, str):
        answers = [answers]
    return {'id': tid, 'diff': diff, 'text': fix_josa(text), 'answers': answers, 'hints': [fix_josa(h1), fix_josa(h2), fix_josa(h3)], 'meta': meta}

def area(aid, name, std, concept, criteria, student, teacher, questions, twins):
    return {'id': aid, 'name': name, 'std': std, 'concept': concept, 'criteria': criteria, 'student': student, 'teacher': teacher,
            'questions': questions, 'twins': twins}

def lv(high, mid, low):
    return {'high': high, 'mid': mid, 'low': low}

# ───── 조사 (받침 따라 이에요/예요, 을/를, 이/가, 은/는, 과/와) ─────
_UNIT_B = {'kg': True, 'g': True, 'cm': False, 'm': False, 'km': False, 'L': False, 'mL': False, 'cm²': False, 'm²': False, 'km²': False,
           'cm³': False, 'm³': False, '°': False, '%': False}
def has_batchim(s):
    s = str(s).strip()
    for u in sorted(_UNIT_B, key=len, reverse=True):
        if s.endswith(u) and not re.search(r'[가-힣]$', s):
            return _UNIT_B[u]
    if re.search(r'[가-힣]$', s):
        c = ord(s[-1]) - 0xAC00
        return c % 28 != 0
    m = re.search(r'(\d+)\s*$', s)
    if m:
        n = m.group(1)
        if '/' in s[-len(n) - 1:-len(n)] or re.search(r'(\d+)/\d+\s*$', s):
            n = re.search(r'(\d+)/\d+\s*$', s).group(1)
        d = n.rstrip('0')
        if d == '' or len(d) < len(n):
            return True  # 영, 십, 백, 천, 만
        return d[-1] in '13678'
    if s.endswith(')'):
        return has_batchim(s[:-1])
    return False

def ieyo(s): return f'{s}{"이에요" if has_batchim(s) else "예요"}'
def eul(s): return f'{s}{"을" if has_batchim(s) else "를"}'
def iga(s): return f'{s}{"이" if has_batchim(s) else "가"}'
def eun(s): return f'{s}{"은" if has_batchim(s) else "는"}'
def gwa(s): return f'{s}{"과" if has_batchim(s) else "와"}'

def _final_jong(s):
    """마지막 글자 받침 번호 (0 = 받침 없음, 8 = ㄹ). 숫자는 읽는 소리로."""
    s = str(s).strip()
    if re.search(r'[가-힣]$', s):
        return (ord(s[-1]) - 0xAC00) % 28
    m = re.search(r'(\d+)\s*$', s)
    if m:
        n = m.group(1)
        fm = re.search(r'(\d+)/\d+\s*$', s)
        if fm: n = fm.group(1)
        d = n.rstrip('0')
        if d == '' or len(d) < len(n):
            return {1: 17, 2: 1, 3: 4, 4: 4}.get(len(n) - len(d), 4)  # 십(ㅂ) 백(ㄱ) 천(ㄴ) 만(ㄴ)
        return {'1': 8, '2': 0, '3': 16, '4': 0, '5': 0, '6': 1, '7': 8, '8': 8, '9': 0}[d[-1]]
    return 1 if has_batchim(s) else 0

def ro(s):
    j = _final_jong(s)
    return f'{s}{"으로" if j not in (0, 8) else "로"}'

# ───── 숫자 뒤 조사 자동 바로잡기 (문항을 만들 때 모든 글에 적용) ─────
_JOSA_RE = re.compile(r'(\d+(?:/\d+)?|cm²|m²|km²|cm³|m³|cm|km|mL|kg|m|L|g)(이에요|예요|으로|로|이|가|을|를|은|는|과|와)(?=[\s.,)!?·]|$)')
_PAIR = {'이에요': '예요', '예요': '이에요', '이': '가', '가': '이', '을': '를', '를': '을', '은': '는', '는': '은', '과': '와', '와': '과'}
_NEED_B = {'이에요', '이', '을', '은', '과'}
def fix_josa(t):
    if not isinstance(t, str):
        return t
    t = re.sub(r'(\d) (이에요|예요)(?=[\s.,)!?]|$)', r'\1\2', t)
    t = re.sub(r'(\d) (은|는|이|가|을|를|과|와)(?= )', r'\1\2', t)
    def rep(m):
        w, j = m.group(1), m.group(2)
        if j in ('으로', '로'):
            right = '으로' if _final_jong(w) not in (0, 8) else '로'
            return w + right
        b = has_batchim(w)
        right = j if ((j in _NEED_B) == b) else _PAIR[j]
        return w + right
    return _JOSA_RE.sub(rep, t)
