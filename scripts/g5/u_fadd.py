# 5-1 5단원 분수의 덧셈과 뺄셈 [6수01-08]
# 적용 시 고려 사항: 기약분수로 나타낼 것을 요구하지 않으면 기약분수가 아닌 답도 인정 → 추가 문제(주관식)는 크기가 같으면 정답
from fractions import Fraction as Fr
from math import gcd
from lib import Bank, Q, T, area, lv, ro, ieyo, eul, gwa, fstr, raw

STD = [('[6수01-08]', '분모가 다른 분수의 덧셈과 뺄셈의 계산 원리를 탐구하고 그 계산을 할 수 있다.')]

MISTAKES = {
    'addall': {'name': '분모끼리, 분자끼리 더함', 'student': '분모끼리 더하면 안 돼요. 통분해서 분모를 같게 한 뒤 분자끼리만 더해요.', 'teacher': '1/2 + 1/3 = 2/5 가 1/2 보다 작아지는 모순을 그림으로 보여 주고, 통분 후 분자만 더하는 까닭을 설명해 주세요.'},
    'suball': {'name': '분모끼리, 분자끼리 뺌', 'student': '분모끼리 빼면 안 돼요. 통분한 뒤 분자끼리만 빼요.', 'teacher': '분모끼리 빼면 조각의 크기가 바뀐다는 점을 분수 막대로 보여 주세요.'},
    'numnot': {'name': '통분할 때 분자를 바꾸지 않음', 'student': '분모만 공통분모로 바꾸고 분자는 그대로 두었어요. 분모에 곱한 수를 분자에도 곱해요.', 'teacher': '통분 단계를 따로 써서 분자도 바뀌었는지 확인하게 해 주세요.'},
    'mulden': {'name': '분모를 곱하고 분자는 그대로 계산', 'student': '분모의 곱을 공통분모로 쓸 때도 분자에 다른 분모를 곱해야 해요.', 'teacher': '분모의 곱으로 통분할 때 분자에 곱하는 수를 화살표로 표시하게 해 주세요.'},
    'carry': {'name': '받아올림을 하지 않음', 'student': '분수 부분의 합이 1보다 크면 자연수 부분으로 1을 받아올려요.', 'teacher': '가분수가 된 분수 부분을 대분수로 바꾸어 자연수 부분에 더하는 과정을 단계별로 보여 주세요.'},
    'borrow': {'name': '받아내림 실수', 'student': '빼는 분수가 더 클 때는 자연수 부분에서 1을 받아내려 분수로 바꾼 뒤 빼요.', 'teacher': '1 = □/□ 로 바꾸는 받아내림을 분수 막대로 보여 주고, 자연수에서 1을 뺐는지 확인하게 해 주세요.'},
    'swap': {'name': '큰 분수에서 작은 분수를 거꾸로 뺌', 'student': '분수 부분에서 작은 수에서 큰 수를 뺄 수 없다고 순서를 바꿨어요. 받아내림을 해요.', 'teacher': '분수 부분을 거꾸로 빼면 답이 커지는 모순을 어림으로 확인하게 해 주세요.'},
    'whole': {'name': '자연수 부분 계산 실수', 'student': '자연수 부분끼리의 계산을 다시 확인해요.', 'teacher': '자연수 부분과 분수 부분을 나누어 쓰는 계산 틀을 제공해 주세요.'},
    'op': {'name': '덧셈과 뺄셈을 바꿈', 'student': '문제에서 더해야 하는지 빼야 하는지 다시 읽어 봐요.', 'teacher': '문장의 "남은", "모두", "더 많이" 같은 말과 연산을 연결해 정리해 주세요.'},
    'calc': {'name': '계산 실수', 'student': '통분은 맞았지만 분자 계산에서 실수했어요.', 'teacher': '통분한 분자를 따로 적고 더하거나 빼게 해 주세요.'},
    'guess': {'name': '개념 확인 필요', 'student': '개념 정리를 다시 읽고 오답노트를 풀어 봐요.', 'teacher': '보기를 고른 까닭을 직접 물어 개별 확인이 필요해요.'},
}

def lcm(a, b): return a * b // gcd(a, b)
def F(s):
    s = s.strip()
    if ' ' in s:
        w, f = s.split(' ')
        n, d = f.split('/')
        return int(w) + Fr(int(n), int(d))
    if '/' in s:
        n, d = s.split('/')
        return Fr(int(n), int(d))
    return Fr(int(s))

def build():
    b = Bank('fadd5')
    H_ADD = '분모가 다르면 먼저 통분한 뒤, 분모는 그대로 두고 분자끼리 더해요.'
    H_SUB = '분모가 다르면 먼저 통분한 뒤, 분모는 그대로 두고 분자끼리 빼요.'
    H_MA = '자연수는 자연수끼리, 분수는 통분하여 분수끼리 더해요. 분수 부분이 1보다 크면 받아올려요.'
    H_MS = '자연수는 자연수끼리, 분수는 통분하여 분수끼리 빼요. 분수끼리 뺄 수 없으면 자연수에서 1을 받아내려요.'

    def prop(qid, diff, x, y, op='+', word=None, unit=''):
        a, c = F(x), F(y)
        (n1, d1), (n2, d2) = (a.numerator, a.denominator), (c.numerator, c.denominator)
        L = lcm(d1, d2); m1, m2 = n1 * L // d1, n2 * L // d2
        ans = a + c if op == '+' else a - c
        assert ans > 0
        A = fstr(ans) + unit
        cands = []
        if op == '+':
            cands.append((fstr(Fr(n1 + n2, d1 + d2)) + unit, 'addall'))
            if (n1 + n2) != (m1 + m2): cands.append((fstr(Fr(n1 + n2, L)) + unit, 'numnot'))
            if L != d1 * d2: cands.append((fstr(Fr(n1 + n2, d1 * d2)) + unit, 'mulden'))
            cands.append((fstr(a - c) + unit if a > c else None, 'op'))
            cands.append((fstr(ans + Fr(1, L)) + unit, 'calc'))
        else:
            if d1 > d2 and n1 >= n2 and n1 - n2 > 0: cands.append((fstr(Fr(n1 - n2, d1 - d2)) + unit, 'suball'))
            if m1 - m2 != n1 - n2 and n1 > n2: cands.append((fstr(Fr(n1 - n2, L)) + unit, 'numnot'))
            cands.append((fstr(a + c) + unit, 'op'))
            if L != d1 * d2 and n1 > n2: cands.append((fstr(Fr(n1 - n2, d1 * d2)) + unit, 'mulden'))
            cands.append((fstr(ans + Fr(1, L)) + unit, 'calc'))
            cands.append((fstr(ans - Fr(1, L)) + unit if ans > Fr(1, L) else None, 'calc'))
        cands = [c_ for c_ in cands if c_[0] and not c_[0].startswith(unit + '0') and c_[0] != unit]
        sym = '+' if op == '+' else '−'
        expr = f'{x} {sym} {y}'
        text = word or f'{expr} = ?'
        hint2 = f'{d1}과(와) {d2}의 공통분모 {ro(str(L))} 통분: {raw(m1, L)} {sym} {raw(m2, L)}'.replace('과(와)', '과' if str(d1)[-1] in '013678' else '와')
        res = Fr(m1 + m2 if op == '+' else m1 - m2, L)
        explain = f'{expr} = {raw(m1, L)} {sym} {raw(m2, L)} = {raw(m1 + m2 if op == "+" else m1 - m2, L)}' + (f' = {fstr(ans)}' if fstr(ans) != raw(res.numerator * (L // res.denominator), L) else '') + f' → 답은 {ieyo(A)}.'
        return Q(b, qid, diff, text, A, cands, H_ADD if op == '+' else H_SUB, hint2, explain, f'첫 단계: 두 분모 {d1}, {d2}의 공배수를 공통분모로 정해요', {'expr': expr})

    def mixed(qid, diff, x, y, op='+', word=None, unit=''):
        a, c = F(x), F(y)
        w1, f1 = int(a), a - int(a); w2, f2 = int(c), c - int(c)
        L = lcm(f1.denominator if f1 else 1, f2.denominator if f2 else 1)
        ans = a + c if op == '+' else a - c
        assert ans > 0
        A = fstr(ans) + unit
        cands = []
        if op == '+':
            fs = f1 + f2
            if fs >= 1: cands.append((fstr(w1 + w2 + fs - 1) + unit, 'carry'))
            n1, d1, n2, d2 = f1.numerator, f1.denominator, f2.numerator, f2.denominator
            cands.append((fstr(w1 + w2 + Fr(n1 + n2, d1 + d2)) + unit, 'addall'))
            if L != d1 or L != d2: cands.append((fstr(w1 + w2 + Fr(n1 + n2, L)) + unit, 'numnot'))
            cands.append((fstr(ans + 1) + unit, 'whole'))
            cands.append((fstr(ans + Fr(1, L)) + unit, 'calc'))
        else:
            if f1 < f2:
                cands.append((fstr(w1 - w2 + f2 - f1) + unit, 'swap'))
                cands.append((fstr(ans + 1) + unit, 'borrow'))
            cands.append((fstr(a + c) + unit, 'op'))
            n1, d1, n2, d2 = f1.numerator, f1.denominator, f2.numerator, f2.denominator
            if n1 > n2 and d1 > d2: cands.append((fstr(w1 - w2 + Fr(n1 - n2, d1 - d2)) + unit, 'suball'))
            cands.append((fstr(ans + Fr(1, L)) + unit, 'calc'))
            if ans > 1: cands.append((fstr(ans - 1) + unit, 'whole'))
        sym = '+' if op == '+' else '−'
        expr = f'{x} {sym} {y}'
        text = word or f'{expr} = ?'
        m1, m2 = f1 * L, f2 * L
        if op == '+':
            hint2 = f'자연수끼리: {w1} + {w2}, 분수끼리: {raw(int(m1), L)} + {raw(int(m2), L)}'
            explain = f'{w1} + {w2} = {w1 + w2}, {raw(int(m1), L)} + {raw(int(m2), L)} = {raw(int(m1 + m2), L)}' + (' (1보다 크므로 받아올림)' if f1 + f2 >= 1 else '') + f' → 답은 {ieyo(A)}.'
        else:
            if f1 >= f2:
                hint2 = f'자연수끼리: {w1} − {w2}, 분수끼리: {raw(int(m1), L)} − {raw(int(m2), L)}'
                explain = f'{w1} − {w2} = {w1 - w2}, {raw(int(m1), L)} − {raw(int(m2), L)} = {raw(int(m1 - m2), L)} → 답은 {ieyo(A)}.'
            else:
                hint2 = f'분수끼리 뺄 수 없어요. {w1} {raw(int(m1), L)} 을 {w1 - 1} {raw(int(m1) + L, L)} 로 바꿔 봐요.'
                explain = f'{w1} {raw(int(m1), L)} = {w1 - 1} {raw(int(m1) + L, L)} → {w1 - 1} − {w2} = {w1 - 1 - w2}, {raw(int(m1) + L, L)} − {raw(int(m2), L)} = {raw(int(m1) + L - int(m2), L)} → 답은 {ieyo(A)}.'
        return Q(b, qid, diff, text, A, cands, H_MA if op == '+' else H_MS, hint2, explain,
                 '첫 단계: 자연수 부분과 분수 부분을 나누고, 분수 부분을 통분해요', {'expr': expr})

    def tw(tid, diff, x, y, op='+', word=None, unit=''):
        a, c = F(x), F(y); ans = a + c if op == '+' else a - c
        sym = '+' if op == '+' else '−'
        L = lcm(a.denominator, c.denominator)
        text = (word + ' (분수로)') if word else f'{x} {sym} {y} 를 계산해 보세요. (대분수 또는 분수로)'.replace(' 를', '')
        h = [('분모를 통분해요.' if a.denominator != c.denominator else '분모가 같아요.') + (' 자연수 부분과 분수 부분을 나누어 계산해요.' if (a > 1 or c > 1) else ''), f'공통분모 {ro(str(L))} 통분해요.', f'정답은 {ieyo(fstr(ans) + unit)}.']
        answers = [fstr(ans)]
        if ans > 1 and ans.denominator != 1: answers.append(fstr(ans, mixed=False))
        if unit: answers.append(fstr(ans) + unit)
        return T(b, tid, diff, text if word else f'다음을 계산해 보세요. (대분수 또는 분수로)  {x} {sym} {y}', answers, *h, {'expr': f'{x} {sym} {y}'})

    A1 = area('pa', '진분수의 덧셈', '[6수01-08]',
        '분모가 다른 진분수의 덧셈은 통분한 뒤 분자끼리 더해요. 계산 결과가 가분수이면 대분수로 나타내요. 예: 1/2 + 1/3 = 3/6 + 2/6 = 5/6',
        lv('분모가 다른 진분수의 덧셈 원리를 그림과 식으로 설명하고, 계산 결과를 기약분수나 대분수로 나타내어 생활 문제를 해결할 수 있다.',
           '분모가 다른 진분수의 덧셈을 통분하여 계산할 수 있다.',
           '안내에 따라 공통분모로 바꾼 뒤 진분수의 덧셈을 할 수 있다.'),
        lv('아주 잘했어요! 분모의 곱과 최소공배수로 통분했을 때 계산이 어떻게 다른지 비교해 보세요.',
           '잘하고 있어요. 결과가 1보다 큰 덧셈과 생활 문제에 도전해 봐요.',
           '분모끼리는 더하지 않아요! 통분 → 분자끼리 더하기 순서로 연습해 봐요.'),
        lv('공통분모 선택 전략을 비교하고 설명하는 활동으로 확장해 주세요.',
           '결과가 가분수인 덧셈, 문장제를 보충해 주세요.',
           '분수 막대로 1/2 + 1/3 을 직접 모아 보는 활동을 권합니다.'),
        [prop('pa-1', 1, '1/2', '1/3'), prop('pa-2', 1, '1/4', '1/2'), prop('pa-3', 1, '2/5', '1/3'),
         prop('pa-4', 2, '3/4', '5/6'), prop('pa-5', 2, '5/8', '1/6'), prop('pa-6', 2, '2/3', '4/9'), prop('pa-7', 2, '7/10', '3/4'),
         prop('pa-8', 3, '2/3', '1/6', word='리본 2/3 m와 1/6 m를 겹치지 않게 이어 붙였습니다. 이은 리본의 길이는 몇 m일까요?', unit=' m'),
         prop('pa-9', 3, '3/4', '2/5', word='물을 아침에 3/4 L, 저녁에 2/5 L 마셨습니다. 하루 동안 마신 물은 모두 몇 L일까요?', unit=' L'),
         prop('pa-10', 3, '5/12', '3/8', word='밭의 5/12에는 감자를, 3/8에는 고구마를 심었습니다. 감자와 고구마를 심은 부분은 밭 전체의 얼마일까요?')],
        [tw('pa-t1', 1, '1/3', '1/6'), tw('pa-t2', 1, '1/2', '2/5'), tw('pa-t3', 1, '3/8', '1/4'),
         tw('pa-t4', 2, '4/5', '2/3'), tw('pa-t5', 2, '5/6', '3/4'), tw('pa-t6', 2, '3/10', '2/15'),
         tw('pa-t7', 3, '3/5', '1/4', word='주스를 형은 3/5 L, 동생은 1/4 L 마셨습니다. 두 사람이 마신 주스는 모두 몇 L일까요?', unit=' L'),
         tw('pa-t8', 3, '5/6', '4/9', word='끈 5/6 m와 4/9 m를 겹치지 않게 이었습니다. 이은 끈의 길이는 몇 m일까요?', unit=' m')])

    A2 = area('ps', '진분수의 뺄셈', '[6수01-08]',
        '분모가 다른 진분수의 뺄셈은 통분한 뒤 분자끼리 빼요. 예: 3/4 − 1/3 = 9/12 − 4/12 = 5/12',
        lv('분모가 다른 진분수의 뺄셈 원리를 설명하고, 생활 문제에서 차를 구하는 식을 세워 해결할 수 있다.',
           '분모가 다른 진분수의 뺄셈을 통분하여 계산할 수 있다.',
           '안내에 따라 공통분모로 바꾼 뒤 진분수의 뺄셈을 할 수 있다.'),
        lv('훌륭해요! 뺄셈 결과를 덧셈으로 검산하는 방법을 친구에게 설명해 보세요.',
           '잘하고 있어요. "얼마나 더 많은가?" 같은 문장 문제에 도전해 봐요.',
           '분모끼리는 빼지 않아요! 통분 → 분자끼리 빼기 순서로 연습해 봐요.'),
        lv('뺄셈과 덧셈의 관계를 이용한 검산 활동으로 확장해 주세요.',
           '두 양의 차를 구하는 문장제를 보충해 주세요.',
           '분수 막대로 큰 분수에서 작은 분수만큼 덜어 내는 활동을 권합니다.'),
        [prop('ps-1', 1, '3/4', '1/2', op='-'), prop('ps-2', 1, '5/6', '1/3', op='-'), prop('ps-3', 1, '1/2', '1/5', op='-'),
         prop('ps-4', 2, '7/8', '1/6', op='-'), prop('ps-5', 2, '5/6', '3/8', op='-'), prop('ps-6', 2, '4/5', '2/3', op='-'), prop('ps-7', 2, '9/10', '5/12', op='-'),
         prop('ps-8', 3, '3/4', '1/3', op='-', word='물 3/4 L 중에서 1/3 L를 마셨습니다. 남은 물은 몇 L일까요?', unit=' L'),
         prop('ps-9', 3, '7/8', '2/3', op='-', word='리본 7/8 m에서 2/3 m를 잘라 썼습니다. 남은 리본은 몇 m일까요?', unit=' m'),
         prop('ps-10', 3, '5/6', '7/10', op='-', word='민지는 책을 전체의 5/6만큼, 준호는 7/10만큼 읽었습니다. 민지는 준호보다 전체의 얼마만큼 더 읽었을까요?')],
        [tw('ps-t1', 1, '2/3', '1/6', op='-'), tw('ps-t2', 1, '3/5', '1/2', op='-'), tw('ps-t3', 1, '5/8', '1/4', op='-'),
         tw('ps-t4', 2, '5/6', '4/9', op='-'), tw('ps-t5', 2, '7/12', '3/8', op='-'), tw('ps-t6', 2, '3/4', '3/10', op='-'),
         tw('ps-t7', 3, '4/5', '1/4', op='-', word='우유 4/5 L 중에서 1/4 L를 마셨습니다. 남은 우유는 몇 L일까요?', unit=' L'),
         tw('ps-t8', 3, '8/9', '5/6', op='-', word='빨간 끈은 8/9 m, 파란 끈은 5/6 m입니다. 빨간 끈은 파란 끈보다 몇 m 더 길까요?', unit=' m')])

    A3 = area('ma', '대분수의 덧셈', '[6수01-08]',
        '대분수의 덧셈은 자연수끼리, 분수끼리 더해요. 분수끼리의 합이 1보다 크면 자연수로 받아올려요. 예: 1 3/4 + 2 2/3 = 3 + 17/12 = 4 5/12',
        lv('분모가 다른 대분수의 덧셈을 여러 가지 방법(자연수·분수 따로, 가분수로 바꾸기)으로 계산하고 그 방법을 설명할 수 있다.',
           '분모가 다른 대분수의 덧셈을 받아올림을 포함하여 계산할 수 있다.',
           '안내에 따라 받아올림이 없는 대분수의 덧셈을 할 수 있다.'),
        lv('멋져요! 자연수·분수 따로 더하기와 가분수로 바꿔 더하기를 비교해 어느 쪽이 편한지 말해 보세요.',
           '잘하고 있어요. 받아올림이 있는 대분수 덧셈을 더 연습해 봐요.',
           '자연수끼리, 분수끼리 나누어 더해요. 분수끼리의 합이 1보다 크면 1을 자연수로 옮겨요.'),
        lv('두 가지 계산 방법을 비교 설명하는 활동으로 확장해 주세요.',
           '받아올림이 있는 대분수의 덧셈을 보충해 주세요.',
           '자연수 칸·분수 칸으로 나뉜 계산 틀을 쓰게 해 주세요.'),
        [mixed('ma-1', 1, '1 1/2', '1 1/4'), mixed('ma-2', 1, '2 1/3', '1 1/6'), mixed('ma-3', 1, '3 1/5', '1 1/2'),
         mixed('ma-4', 2, '1 3/4', '2 2/3'), mixed('ma-5', 2, '2 5/6', '1 1/4'), mixed('ma-6', 2, '3 2/5', '2 7/10'), mixed('ma-7', 2, '1 5/8', '3 1/2'),
         mixed('ma-8', 3, '1 1/2', '2 3/4', word='리본 1 1/2 m와 2 3/4 m를 겹치지 않게 이어 붙였습니다. 이은 리본은 몇 m일까요?', unit=' m'),
         mixed('ma-9', 3, '2 2/3', '1 5/9', word='물통에 물이 2 2/3 L 있었습니다. 여기에 1 5/9 L를 더 부었습니다. 물통의 물은 모두 몇 L일까요?', unit=' L'),
         mixed('ma-10', 3, '1 3/5', '2 3/4', word='현수는 어제 1 3/5시간, 오늘 2 3/4시간 운동했습니다. 이틀 동안 운동한 시간은 모두 몇 시간일까요?', unit='시간')],
        [tw('ma-t1', 1, '1 1/3', '2 1/2'), tw('ma-t2', 1, '2 1/4', '1 1/8'), tw('ma-t3', 1, '1 2/5', '1 1/10'),
         tw('ma-t4', 2, '2 3/4', '1 5/6'), tw('ma-t5', 2, '1 4/5', '2 1/2'), tw('ma-t6', 2, '3 5/8', '1 7/12'),
         tw('ma-t7', 3, '2 1/2', '1 2/3', word='고구마를 어제 2 1/2 kg, 오늘 1 2/3 kg 캤습니다. 이틀 동안 캔 고구마는 몇 kg일까요?', unit=' kg'),
         tw('ma-t8', 3, '1 3/4', '1 7/10', word='페인트를 벽에 1 3/4 L, 문에 1 7/10 L 썼습니다. 쓴 페인트는 모두 몇 L일까요?', unit=' L')])

    A4 = area('ms', '대분수의 뺄셈', '[6수01-08]',
        '대분수의 뺄셈은 자연수끼리, 분수끼리 빼요. 분수끼리 뺄 수 없으면 자연수에서 1을 받아내려 분수로 바꾼 뒤 빼요. 예: 4 1/4 − 2 2/3 = 3 15/12 − 2 8/12 = 1 7/12',
        lv('분모가 다른 대분수의 뺄셈을 받아내림을 포함하여 여러 가지 방법으로 계산하고 그 방법을 설명할 수 있다.',
           '분모가 다른 대분수의 뺄셈을 받아내림을 포함하여 계산할 수 있다.',
           '안내에 따라 받아내림이 없는 대분수의 뺄셈을 할 수 있다.'),
        lv('최고예요! 받아내림이 왜 필요한지 분수 막대 그림으로 설명해 보세요.',
           '잘하고 있어요. 받아내림이 있는 대분수 뺄셈을 더 연습해 봐요.',
           '분수끼리 뺄 수 없으면 자연수에서 1을 빌려 와요. 1 = 12/12 처럼 바꿔 봐요.'),
        lv('받아내림 과정을 그림과 식으로 설명하는 활동으로 확장해 주세요.',
           '받아내림이 있는 대분수 뺄셈과 문장제를 보충해 주세요.',
           '1을 분수로 바꾸는 연습(1 = 4/4, 1 = 12/12)부터 다시 다뤄 주세요.'),
        [mixed('ms-1', 1, '2 1/2', '1 1/4', op='-'), mixed('ms-2', 1, '3 2/3', '1 1/6', op='-'), mixed('ms-3', 1, '4 3/4', '2 1/3', op='-'),
         mixed('ms-4', 2, '4 1/4', '2 2/3', op='-'), mixed('ms-5', 2, '3 1/6', '1 3/4', op='-'), mixed('ms-6', 2, '5 2/5', '2 1/2', op='-'), mixed('ms-7', 2, '6 1/3', '3 5/9', op='-'),
         mixed('ms-8', 3, '3 1/2', '1 3/4', op='-', word='리본 3 1/2 m에서 1 3/4 m를 잘라 썼습니다. 남은 리본은 몇 m일까요?', unit=' m'),
         mixed('ms-9', 3, '4 1/3', '2 5/6', op='-', word='물 4 1/3 L 중에서 2 5/6 L를 썼습니다. 남은 물은 몇 L일까요?', unit=' L'),
         mixed('ms-10', 3, '5 1/4', '2 7/10', op='-', word='쌀이 5 1/4 kg 있었습니다. 그중 2 7/10 kg으로 떡을 만들었습니다. 남은 쌀은 몇 kg일까요?', unit=' kg')],
        [tw('ms-t1', 1, '3 3/4', '1 1/2', op='-'), tw('ms-t2', 1, '2 5/6', '1 1/3', op='-'), tw('ms-t3', 1, '4 4/5', '2 1/2', op='-'),
         tw('ms-t4', 2, '3 1/3', '1 3/4', op='-'), tw('ms-t5', 2, '5 1/6', '2 4/9', op='-'), tw('ms-t6', 2, '4 3/8', '1 5/6', op='-'),
         tw('ms-t7', 3, '6 1/2', '3 4/5', op='-', word='밀가루 6 1/2 kg 중에서 3 4/5 kg을 썼습니다. 남은 밀가루는 몇 kg일까요?', unit=' kg'),
         tw('ms-t8', 3, '4 1/5', '1 2/3', op='-', word='우유 4 1/5 L 중에서 1 2/3 L를 마셨습니다. 남은 우유는 몇 L일까요?', unit=' L')])

    return {'id': 'fadd5', 'name': '5. 분수의 덧셈과 뺄셈', 'standards': STD, 'mistakes': MISTAKES, 'areas': [A1, A2, A3, A4]}
