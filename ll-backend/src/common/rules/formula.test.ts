import { describe, expect, it } from 'vitest';
import { checkFormula, parseFormula, withActivity } from './formula';

const calc = (src: string, values = {}) => parseFormula(src).evaluate(values);
const err = (src: string, values = {}) => {
  try {
    calc(src, values);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
};

describe('formula engine — arithmetic and precedence (prototype)', () => {
  it('the default and the prototype example', () => {
    expect(calc('questionnaire + activity', { questionnaire: 20, activity: 30 })).toBe(50);
    expect(calc('questionnaire * 0.3 + activity * 0.7', { questionnaire: 20, activity: 30 })).toBeCloseTo(27);
  });
  it('* / before + -, brackets first', () => {
    expect(calc('2 + 3 * 4')).toBe(14);
    expect(calc('(2 + 3) * 4')).toBe(20);
    expect(calc('20 - 6 / 2')).toBe(17);
  });
  it('^ is right-associative and binds tighter than *', () => {
    expect(calc('2 ^ 3 ^ 2')).toBe(512);
    expect(calc('3 * 2 ^ 2')).toBe(12);
  });
  it('unary minus binds tighter than ^, as in the prototype', () => {
    expect(calc('-2 ^ 2')).toBe(4);
    expect(calc('-(2 ^ 2) + 10')).toBe(6);
  });
  it('comparisons give 1 or 0 and come last', () => {
    expect(calc('questionnaire >= 20', { questionnaire: 20 })).toBe(1);
    expect(calc('1 + 1 == 2')).toBe(1);
    expect(calc('mastery != 0', { mastery: 0 })).toBe(0);
  });
  it('missing variables count as 0', () => {
    expect(calc('questionnaire + mastery', { questionnaire: 5 })).toBe(5);
  });
  it('decimals', () => {
    expect(calc('.5 + 0.25')).toBe(0.75);
  });
});

describe('formula engine — functions', () => {
  it('min / max take 2 or more values', () => {
    expect(calc('min(questionnaire, activity, 50)', { questionnaire: 70, activity: 60 })).toBe(50);
    expect(calc('max(1, 2)')).toBe(2);
    expect(err('min(1)')).toBe('min needs at least 2 values.');
  });
  it('abs, sqrt, round, pow', () => {
    expect(calc('abs(0 - 4)')).toBe(4);
    expect(calc('sqrt(16)')).toBe(4);
    expect(calc('round(2.5)')).toBe(3);
    expect(calc('pow(2, 5)')).toBe(32);
    expect(err('pow(2)')).toBe('pow needs exactly 2 values.');
  });
  it('if(c, a, b) runs only the chosen branch', () => {
    expect(calc('if(mastery > 0, questionnaire / mastery, 0)', { questionnaire: 10, mastery: 0 })).toBe(0);
    expect(calc('if(mastery > 0, questionnaire / mastery, 0)', { questionnaire: 10, mastery: 2 })).toBe(5);
    expect(err('if(1, 2)')).toBe('if needs 3 values: if(condition, then, otherwise).');
  });
});

describe('formula engine — errors and safety', () => {
  it('division by zero names the fix (prototype message)', () => {
    expect(err('questionnaire / mastery', { questionnaire: 5 })).toBe('Division by zero: use max(denominator, 1).');
    expect(calc('questionnaire / max(mastery, 1)', { questionnaire: 5 })).toBe(5);
  });
  it('the result must be finite and ≥ 0', () => {
    expect(err('0 - 1')).toBe('The formula must give a number of 0 or more.');
    expect(err('sqrt(0 - 1)')).toBe('The formula must give a number of 0 or more.');
  });
  it('unknown names are refused — nothing from JavaScript is reachable', () => {
    for (const name of ['constructor', 'process', 'eval', '__proto__', 'Math', 'toString', 'score']) {
      expect(err(`${name} + 1`)).toMatch(/^Unknown name/);
    }
    expect(err('constructor(1)')).toMatch(/^Unknown name/);
  });
  it('bad syntax gets a "near" message', () => {
    expect(err('questionnaire **')).toMatch(/^Check the formula near|^The formula ends too early/);
    expect(err('(1 + 2')).toMatch(/ends too early/);
    expect(err('1 + 2)')).toMatch(/^Check the formula near/);
    expect(err('1 ; 2')).toMatch(/^Check the formula near/);
    expect(err('max 1, 2')).toBe('Use max( … ) with brackets.');
  });
  it('empty, too long, too deeply nested', () => {
    expect(err('  ')).toBe('Enter a formula.');
    expect(err('1+'.repeat(600) + '1')).toBe('Keep the formula to 1000 characters or fewer.');
    expect(err('('.repeat(300) + '1' + ')'.repeat(300))).toBe('The formula is nested too deeply.');
  });
});

describe('save-time check (prototype: sample values AND all zeros)', () => {
  const zeros = { questionnaire: 0, activity: 0, mandatory: 0, regular: 0, mastery: 0, target: 0 };
  const sample = withActivity({ questionnaire: 20, mandatory: 15, regular: 10, mastery: 1, target: 40 });
  it('activity = mandatory + regular', () => {
    expect(sample.activity).toBe(25);
  });
  it('passes when both work', () => {
    expect(checkFormula('questionnaire + activity', [sample, zeros])).toBeNull();
  });
  it('fails when only all zeros breaks it', () => {
    expect(checkFormula('activity / mastery', [sample, zeros])).toBe('Division by zero: use max(denominator, 1).');
  });
});
