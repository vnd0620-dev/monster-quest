# 5-2 2단원 분수의 곱셈 [6수01-09]  — 선생님 연구회 문항(본 문항 6개씩)을 살리고 4개씩 보탬
# 적용 시 고려 사항: 분수의 곱셈은 계산 원리를 탐구하여 이해하는 수준에서 다룸. 기약분수로 나타낼 것을 요구하지 않으면 기약분수가 아닌 답도 인정.
import re
from fractions import Fraction as Fr
from lib import Bank, Q, T, area, lv, ieyo, eul, fstr

STD = [('[6수01-09]', '분수의 곱셈의 계산 원리를 탐구하고 그 계산을 할 수 있다.')]

MISTAKES = {
    'den': {'name': '자연수를 분모에 곱함', 'student': '(분수) × (자연수)는 분자에 자연수를 곱해요. 분모에 곱하면 오히려 작아져요.', 'teacher': '2/5 × 3 을 2/5 + 2/5 + 2/5 로 바꾸어 분자가 몇 배가 되는지 확인하게 해 주세요.'},
    'addn': {'name': '자연수를 분자에 더함', 'student': '곱셈인데 분자에 더했어요. 2/5 × 3 은 2/5 를 3번 더한 것이에요.', 'teacher': '곱셈을 같은 수를 여러 번 더하기로 바꾸는 활동을 해 주세요.'},
    'add': {'name': '곱하지 않고 더함', 'student': '× 를 + 로 계산했어요. 곱셈 기호를 다시 확인해요.', 'teacher': '분수의 곱셈 상황(몇 배, 몇 분의 몇)을 그림과 함께 다시 다뤄 주세요.'},
    'addfrac': {'name': '분자끼리, 분모끼리 더함', 'student': '분수의 곱셈은 분자끼리, 분모끼리 곱해요. 더하지 않아요.', 'teacher': '넓이 모델(가로 2/3, 세로 3/5)로 분자끼리·분모끼리 곱하는 까닭을 보여 주세요.'},
    'cross': {'name': '나눗셈처럼 뒤집어 곱함', 'student': '곱셈에서는 분수를 뒤집지 않아요. 분자끼리, 분모끼리 그대로 곱해요.', 'teacher': '분수의 나눗셈(6학년)과 혼동하지 않도록 곱셈의 의미를 다시 확인해 주세요.'},
    'mixpart': {'name': '대분수의 자연수 부분만 곱함', 'student': '대분수는 가분수로 바꾼 뒤 곱하거나, 자연수 부분과 분수 부분을 모두 곱해야 해요.', 'teacher': '1 1/2 × 2 를 1 × 2 와 1/2 × 2 로 나누어 계산하는 그림을 보여 주세요.'},
    'mixfrac': {'name': '자연수끼리, 분수끼리만 곱함', 'student': '대분수끼리 곱할 때 자연수끼리, 분수끼리만 곱하면 안 돼요. 가분수로 바꿔서 곱해요.', 'teacher': '넓이 그림으로 1 1/3 × 1 1/2 에 빠지는 부분이 생김을 보여 주세요.'},
    'conv': {'name': '대분수를 가분수로 잘못 바꿈', 'student': '대분수를 가분수로 바꿀 때 (자연수 × 분모 + 분자)/분모 예요.', 'teacher': '대분수 → 가분수 바꾸기를 따로 연습하게 해 주세요.'},
    'order': {'name': '계산 순서 실수', 'student': '곱셈을 먼저 하고 덧셈·뺄셈을 해요.', 'teacher': '혼합 계산의 순서를 분수에서도 똑같이 적용하게 해 주세요.'},
    'op': {'name': '문장을 식으로 잘못 세움', 'student': '"~의 몇 분의 몇"은 곱셈으로 나타내요. 문제의 상황을 다시 읽어 봐요.', 'teacher': '"□의 2/3" = □ × 2/3 임을 그림으로 확인하게 해 주세요.'},
    'calc': {'name': '계산 실수', 'student': '방법은 맞았지만 계산에서 실수했어요. 약분을 한 번 더 확인해요.', 'teacher': '약분을 먼저 하고 곱하는 방법을 보여 주세요.'},
    'guess': {'name': '개념 확인 필요', 'student': '개념 정리를 다시 읽고 오답노트를 풀어 봐요.', 'teacher': '보기를 고른 까닭을 직접 물어 개별 확인이 필요해요.'},
}

NUM = re.compile(r'\d+ \d+/\d+|\d+/\d+|\d+')
def val(t):
    if ' ' in t:
        w, f = t.split(' '); n, d = f.split('/'); return Fr(int(w)) + Fr(int(n), int(d))
    if '/' in t:
        n, d = t.split('/'); return Fr(int(n), int(d))
    return Fr(int(t))

def toks(expr):
    out = []
    for m in re.finditer(r'\d+ \d+/\d+|\d+/\d+|\d+|[×+−]', expr):
        out.append(m.group(0))
    return out

def mul_variant(kind):
    def f(x, y, tx, ty):
        if kind == 'ok': return x * y
        if kind == 'add': return x + y
        fx, fy = ('/' in tx), ('/' in ty)
        if kind == 'den':  # 자연수를 분모에 곱함
            if fx and not fy and ' ' not in tx: return Fr(x.numerator, x.denominator * int(y))
            if fy and not fx and ' ' not in ty: return Fr(y.numerator, y.denominator * int(x))
            return None
        if kind == 'addn':
            if fx and not fy and ' ' not in tx: return Fr(x.numerator + int(y), x.denominator)
            if fy and not fx and ' ' not in ty: return Fr(y.numerator + int(x), y.denominator)
            return None
        if kind == 'addfrac':
            if fx and fy and ' ' not in tx and ' ' not in ty: return Fr(x.numerator + y.numerator, x.denominator + y.denominator)
            return None
        if kind == 'cross':
            if fx and fy and ' ' not in tx and ' ' not in ty: return Fr(x.numerator * y.denominator, x.denominator * y.numerator)
            return None
        if kind == 'mixpart':  # 대분수 × (자연수 또는 분수): 자연수 부분만 곱하고 분수 부분은 그대로
            if ' ' in tx: w = int(tx.split(' ')[0]); return w * y + (x - w)
            if ' ' in ty: w = int(ty.split(' ')[0]); return w * x + (y - w)
            return None
        if kind == 'mixfrac':  # 대분수 × 대분수: 자연수끼리, 분수끼리
            if ' ' in tx and ' ' in ty:
                w1, w2 = int(tx.split(' ')[0]), int(ty.split(' ')[0]); return w1 * w2 + (x - w1) * (y - w2)
            return None
        return None
    return f

def evaluate(expr, kind='ok', order=False):
    t = toks(expr)
    vals = [val(t[0])]; txts = [t[0]]; ops = []
    for i in range(1, len(t), 2):
        ops.append(t[i]); vals.append(val(t[i + 1])); txts.append(t[i + 1])
    mul = mul_variant(kind)
    # × 먼저 (order=True 이면 앞에서부터)
    if not order:
        i = 0
        while i < len(ops):
            if ops[i] == '×':
                r = mul(vals[i], vals[i + 1], txts[i], txts[i + 1])
                if r is None: r = vals[i] * vals[i + 1]
                vals[i:i + 2] = [r]; txts[i:i + 2] = ['9/9' if r.denominator != 1 else str(r)]; ops.pop(i)
            else:
                i += 1
    while ops:
        op = ops.pop(0); a, c = vals[0], vals[1]
        r = a + c if op == '+' else a - c if op == '−' else (mul(a, c, txts[0], txts[1]) or a * c)
        vals[0:2] = [r]; txts[0:2] = ['9/9']
    return vals[0]

def build():
    b = Bank('fmul5')
    H1 = '(분수) × (자연수)는 분모는 그대로 두고 분자에 자연수를 곱해요. 약분할 수 있으면 약분해요.'
    H2 = '(자연수) × (분수)는 자연수와 분자를 곱하고 분모는 그대로 써요.'
    H3 = '(진분수) × (진분수)는 분자끼리, 분모끼리 곱해요. 곱하기 전에 약분하면 편리해요.'
    H4 = '대분수는 가분수로 바꾼 뒤 분자끼리, 분모끼리 곱해요.'

    def fq(qid, diff, expr, text=None, unit='', hint=H1, extra=()):
        ans = evaluate(expr)
        A = fstr(ans) + unit
        cands = []
        for k in ('den', 'addn', 'addfrac', 'cross', 'mixpart', 'mixfrac', 'add'):
            v = evaluate(expr, k)
            if v is not None and v != ans and v > 0:
                if k == 'den' and v.denominator > 60: continue  # 너무 엉뚱한 보기는 빼기
                cands.append((fstr(v) + unit, {'add': 'add'}.get(k, k)))
        if '+' in expr or '−' in expr:
            v = evaluate(expr, 'ok', order=True)
            if v != ans and v > 0: cands.append((fstr(v) + unit, 'order'))
        cands += list(extra)
        steps = (Fr(1), Fr(2)) if (ans.denominator == 1 and unit.strip() in ('개', '명')) else (Fr(1, 2), Fr(1, ans.denominator) if ans.denominator > 1 else Fr(1), Fr(1))
        for dv in steps:
            cands.append((fstr(ans + dv) + unit, 'calc'))
        # 대분수를 가분수로 바꾼 계산 과정
        parts = toks(expr)
        conv = ' '.join(fstr(val(x), mixed=False) if ' ' in x else x for x in parts)
        show = f'{expr} = {conv}' if conv != expr else expr
        explain = f'{show} = {fstr(ans)} → 답은 {ieyo(A)}.'
        t = text or f'{expr} = ?'
        step = '첫 단계: ' + ('대분수를 가분수로 바꿔요. ' + ', '.join(f'{x} = {fstr(val(x), mixed=False)}' for x in parts if ' ' in x) if any(' ' in x for x in parts) else '분자끼리 곱할 수, 분모끼리 곱할 수를 정해요')
        return Q(b, qid, diff, t, A, cands, hint, '곱하기 전에 약분할 수 있는지 먼저 봐요.' if '×' in expr else hint, explain, step, {'expr': expr})

    def ft(tid, diff, expr, text=None, unit='', hint=H1):
        ans = evaluate(expr)
        ansl = [fstr(ans)]
        if ans.denominator != 1 and ans > 1: ansl.append(fstr(ans, mixed=False))
        if unit: ansl.append(fstr(ans) + unit)
        lab = '(숫자만)' if ans.denominator == 1 else '(분수로)'
        t = (f'{text} {lab}') if text else f'다음을 계산해 보세요. (기약분수 또는 대분수로)  {expr}'
        return T(b, tid, diff, t, ansl, hint, '분자끼리, 분모끼리 곱해요. 약분을 먼저 하면 편리해요.', f'정답은 {ieyo(fstr(ans) + unit)}.', {'expr': expr})

    A1 = area('fn', '(분수)×(자연수)', '[6수01-09]',
        '(분수) × (자연수)는 분수를 자연수만큼 여러 번 더한 것과 같아요. 분모는 그대로, 분자에 자연수를 곱해요. 예: 2/5 × 3 = (2 × 3)/5 = 6/5 = 1 1/5',
        lv('(분수)×(자연수)의 계산 원리를 덧셈과 연결하여 설명하고, 약분을 이용해 간편하게 계산하며 생활 문제에 활용할 수 있다.',
           '(분수)×(자연수)를 계산할 수 있다.',
           '안내에 따라 분수를 여러 번 더하는 방법으로 (분수)×(자연수)를 계산할 수 있다.'),
        lv('아주 잘했어요! 곱하기 전에 약분하는 방법과 곱한 뒤 약분하는 방법을 비교해 설명해 보세요.',
           '잘하고 있어요. 혼합 계산과 생활 문제에 도전해 봐요.',
           '2/5 × 3 은 2/5 + 2/5 + 2/5 예요! 분자만 3배가 돼요.'),
        lv('약분 시점에 따른 계산 방법 비교 활동으로 확장해 주세요.',
           '혼합 계산, 문장제를 보충해 주세요.',
           '분수 막대를 여러 번 이어 붙이는 활동으로 의미를 다시 다뤄 주세요.'),
        [fq('fn-1', 1, '2/5 × 3'), fq('fn-2', 1, '3/4 × 2'), fq('fn-3', 1, '5/6 × 4'),
         fq('fn-4', 2, '2/3 × 4 + 1/3'), fq('fn-5', 2, '5/6 × 3 − 1/2'), fq('fn-6', 2, '7/12 × 8'), fq('fn-7', 2, '4/9 × 6'),
         fq('fn-8', 3, '3/4 × 6', '리본 한 조각의 길이는 3/4 m입니다. 같은 길이의 리본 6조각을 겹치지 않게 이어 붙였습니다. 이어 붙인 리본의 전체 길이는 몇 m일까요?', ' m'),
         fq('fn-9', 3, '2/3 × 9 − 1 1/2', '물병 한 개에 물이 2/3 L씩 들어 있습니다. 같은 물병 9개에 들어 있는 물을 모두 모은 뒤 1 1/2 L를 사용했습니다. 남은 물은 몇 L일까요?', ' L'),
         fq('fn-10', 3, '5/8 × 12', '한 사람이 하루에 우유를 5/8 L씩 마십니다. 12명이 하루 동안 마시는 우유는 모두 몇 L일까요?', ' L')],
        [ft('fn-t1', 1, '3/7 × 2'), ft('fn-t2', 1, '1/6 × 5'), ft('fn-t3', 1, '2/9 × 3'),
         ft('fn-t4', 2, '5/12 × 4'), ft('fn-t5', 2, '3/10 × 15'), ft('fn-t6', 2, '7/8 × 6'),
         ft('fn-t7', 3, '4/5 × 3', '케이크 한 개를 만드는 데 설탕이 4/5 kg 필요합니다. 케이크 3개를 만들려면 설탕이 몇 kg 필요할까요?', ' kg'),
         ft('fn-t8', 3, '5/6 × 9', '한 바퀴가 5/6 km인 산책로를 9바퀴 걸었습니다. 걸은 거리는 몇 km일까요?', ' km')])

    A2 = area('nf', '(자연수)×(분수)', '[6수01-09]',
        '(자연수) × (분수)는 자연수의 "몇 분의 몇"을 구하는 것이에요. 자연수와 분자를 곱하고 분모는 그대로 써요. 예: 4 × 2/3 = (4 × 2)/3 = 8/3 = 2 2/3',
        lv('(자연수)×(분수)의 의미를 "자연수의 몇 분의 몇"으로 설명하고, 곱하는 분수의 크기에 따라 결과가 커지거나 작아짐을 이해하여 문제를 해결할 수 있다.',
           '(자연수)×(분수)를 계산할 수 있다.',
           '안내에 따라 그림으로 자연수의 몇 분의 몇을 구할 수 있다.'),
        lv('훌륭해요! 4 × 2/3 이 4보다 작은 까닭을 그림으로 설명해 보세요.',
           '잘하고 있어요. "전체의 몇 분의 몇" 생활 문제에 도전해 봐요.',
           '4 × 2/3 은 4를 3묶음으로 나눈 것 중 2묶음이에요. 그림으로 그려 봐요.'),
        lv('곱의 크기 어림(1보다 작은 수를 곱하면 작아짐) 탐구로 확장해 주세요.',
           '"~의 몇 분의 몇" 문장제를 보충해 주세요.',
           '구체물을 똑같이 나누어 일부를 세는 활동부터 권합니다.'),
        [fq('nf-1', 1, '4 × 2/3', hint=H2), fq('nf-2', 1, '5 × 3/4', hint=H2), fq('nf-3', 1, '6 × 1/4', hint=H2),
         fq('nf-4', 2, '6 × 2/5 + 3/5', hint=H2), fq('nf-5', 2, '8 × 3/4 − 1 1/2', hint=H2), fq('nf-6', 2, '9 × 5/6', hint=H2), fq('nf-7', 2, '10 × 3/8', hint=H2),
         fq('nf-8', 3, '24 × 3/4', '학교에서 학생 24명에게 한 사람당 우유 3/4 L씩 나누어 주려고 합니다. 필요한 우유는 모두 몇 L일까요?', ' L', hint=H2),
         fq('nf-9', 3, '15 − 30 × 2/5', '한 반 학생 30명이 체험 활동에서 한 사람당 찰흙 2/5 kg씩 사용했습니다. 준비한 찰흙이 15 kg이었다면 남은 찰흙은 몇 kg일까요?', ' kg', hint=H2, extra=[('12 kg', 'op')]),
         fq('nf-10', 3, '36 × 5/9', '사탕 36개 중에서 전체의 5/9를 동생에게 주었습니다. 동생에게 준 사탕은 몇 개일까요?', '개', hint=H2, extra=[('16개', 'op'), ('4개', 'op')])],
        [ft('nf-t1', 1, '3 × 2/7', hint=H2), ft('nf-t2', 1, '5 × 1/3', hint=H2), ft('nf-t3', 1, '2 × 4/9', hint=H2),
         ft('nf-t4', 2, '12 × 3/8', hint=H2), ft('nf-t5', 2, '7 × 5/14', hint=H2), ft('nf-t6', 2, '20 × 3/4', hint=H2),
         ft('nf-t7', 3, '40 × 3/5', '우리 반 학생 40명 중 3/5이 줄넘기를 좋아합니다. 줄넘기를 좋아하는 학생은 몇 명일까요?', '명', hint=H2),
         ft('nf-t8', 3, '18 × 2/3', '길이가 18 m인 줄의 2/3를 잘라 썼습니다. 잘라 쓴 줄은 몇 m일까요?', ' m', hint=H2)])

    A3 = area('pp', '진분수의 곱셈', '[6수01-09]',
        '(진분수) × (진분수)는 분자끼리, 분모끼리 곱해요. 곱하기 전에 약분하면 계산이 쉬워져요. 예: 2/3 × 3/5 = (2 × 3)/(3 × 5) = 6/15 = 2/5',
        lv('진분수의 곱셈 원리를 넓이 모델로 설명하고, 약분을 이용해 간편하게 계산하며 세 분수의 곱셈과 생활 문제에 활용할 수 있다.',
           '진분수끼리의 곱셈을 할 수 있다.',
           '안내에 따라 분자끼리, 분모끼리 곱하여 진분수의 곱셈을 할 수 있다.'),
        lv('멋져요! 1/2 × 1/3 을 넓이 그림으로 그려 왜 1/6 인지 설명해 보세요.',
           '잘하고 있어요. 세 분수의 곱셈, "~의 몇 분의 몇" 문제에 도전해 봐요.',
           '분자는 분자끼리, 분모는 분모끼리 곱해요! 더하지 않아요.'),
        lv('넓이 모델로 공식의 의미를 설명하는 활동으로 확장해 주세요.',
           '약분하며 곱하기, 세 분수의 곱셈을 보충해 주세요.',
           '모눈종이에 가로·세로를 나누어 색칠하는 넓이 모델 활동을 권합니다.'),
        [fq('pp-1', 1, '2/3 × 3/5', hint=H3), fq('pp-2', 1, '3/4 × 2/7', hint=H3), fq('pp-3', 1, '1/2 × 1/3', hint=H3),
         fq('pp-4', 2, '2/3 × 3/4 × 1/2', hint=H3), fq('pp-5', 2, '3/5 × 5/6 + 1/4', hint=H3), fq('pp-6', 2, '4/9 × 3/8', hint=H3), fq('pp-7', 2, '5/6 × 9/10', hint=H3),
         fq('pp-8', 3, '3/4 × 2/3', '길이가 3/4 m인 리본에서 전체 길이의 2/3만큼을 잘라 사용했습니다. 사용한 리본의 길이는 몇 m일까요?', ' m', hint=H3),
         fq('pp-9', 3, '5/6 × 3/5', '물통에 물이 5/6 L 들어 있습니다. 그중 3/5을 화분에 주었습니다. 화분에 준 물의 양은 몇 L일까요?', ' L', hint=H3),
         fq('pp-10', 3, '7/8 × 4/7', '밭 전체의 7/8에 채소를 심었고, 채소를 심은 부분의 4/7에 배추를 심었습니다. 배추를 심은 부분은 밭 전체의 얼마일까요?', hint=H3)],
        [ft('pp-t1', 1, '1/4 × 1/5', hint=H3), ft('pp-t2', 1, '2/5 × 3/7', hint=H3), ft('pp-t3', 1, '3/8 × 2/3', hint=H3),
         ft('pp-t4', 2, '5/9 × 3/10', hint=H3), ft('pp-t5', 2, '4/7 × 7/12', hint=H3), ft('pp-t6', 2, '1/2 × 2/3 × 3/4', hint=H3),
         ft('pp-t7', 3, '4/5 × 3/8', '주스 4/5 L의 3/8을 마셨습니다. 마신 주스는 몇 L일까요?', ' L', hint=H3),
         ft('pp-t8', 3, '9/10 × 5/6', '꽃밭 전체의 9/10에 꽃을 심었고, 그중 5/6이 장미입니다. 장미를 심은 부분은 꽃밭 전체의 얼마일까요?', hint=H3)])

    A4 = area('mm', '대분수의 곱셈', '[6수01-09]',
        '대분수의 곱셈은 대분수를 가분수로 바꾼 뒤 분자끼리, 분모끼리 곱해요. 예: 1 1/3 × 1 1/2 = 4/3 × 3/2 = 12/6 = 2',
        lv('대분수의 곱셈을 가분수로 바꾸는 방법과 분배하는 방법으로 계산하고 그 원리를 설명하며 넓이 등 생활 문제에 활용할 수 있다.',
           '대분수를 가분수로 바꾸어 대분수의 곱셈을 할 수 있다.',
           '안내에 따라 대분수를 가분수로 바꾸고 곱셈을 할 수 있다.'),
        lv('최고예요! 1 1/2 × 2 를 두 가지 방법(가분수로, 자연수·분수 따로)으로 계산해 비교해 보세요.',
           '잘하고 있어요. 대분수가 들어간 넓이 문제에 도전해 봐요.',
           '대분수는 먼저 가분수로! 1 1/2 = 3/2 처럼 바꾼 뒤 곱해요.'),
        lv('두 가지 계산 방법 비교 설명 활동으로 확장해 주세요.',
           '대분수 × 대분수, 넓이 문제를 보충해 주세요.',
           '대분수 ↔ 가분수 바꾸기를 먼저 충분히 연습하게 해 주세요.'),
        [fq('mm-1', 1, '1 1/2 × 2', hint=H4), fq('mm-2', 1, '1 1/3 × 1 1/2', hint=H4), fq('mm-3', 1, '2 1/4 × 4', hint=H4),
         fq('mm-4', 2, '1 1/2 × 2 1/3 + 1/2', hint=H4), fq('mm-5', 2, '2 1/4 × 1 1/3 − 1/2', hint=H4), fq('mm-6', 2, '3 1/3 × 1 1/5', hint=H4), fq('mm-7', 2, '1 3/5 × 2 1/2', hint=H4),
         fq('mm-8', 3, '2 1/2 × 1 1/5', '직사각형 모양의 화단은 가로가 2 1/2 m, 세로가 1 1/5 m입니다. 이 화단의 넓이는 몇 m²일까요?', ' m²', hint=H4),
         fq('mm-9', 3, '1 1/4 × 2 2/5', '가로가 1 1/4 m, 세로가 2 2/5 m인 직사각형 모양 판자의 넓이는 몇 m²일까요?', ' m²', hint=H4),
         fq('mm-10', 3, '2 2/3 × 1 1/8', '한 시간에 2 2/3 km를 걷는 사람이 같은 빠르기로 1 1/8시간 동안 걸었습니다. 걸은 거리는 몇 km일까요?', ' km', hint=H4)],
        [ft('mm-t1', 1, '1 1/4 × 2', hint=H4), ft('mm-t2', 1, '2 1/3 × 3', hint=H4), ft('mm-t3', 1, '1 1/2 × 1 1/3', hint=H4),
         ft('mm-t4', 2, '1 2/3 × 1 4/5', hint=H4), ft('mm-t5', 2, '2 1/2 × 1 3/5', hint=H4), ft('mm-t6', 2, '3 1/2 × 2 2/7', hint=H4),
         ft('mm-t7', 3, '1 3/4 × 2 2/3', '가로가 1 3/4 m, 세로가 2 2/3 m인 직사각형 모양 돗자리의 넓이는 몇 m²일까요?', ' m²', hint=H4),
         ft('mm-t8', 3, '4 1/2 × 1 1/3', '한 병에 4 1/2 L씩 든 물의 1 1/3배는 몇 L일까요?', ' L', hint=H4)])

    return {'id': 'fmul5', 'name': '2. 분수의 곱셈', 'standards': STD, 'mistakes': MISTAKES, 'areas': [A1, A2, A3, A4]}
