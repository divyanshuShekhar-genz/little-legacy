/**
 * Assessment-rule formula engine (guide §8; prototype activities-assessment.md "Formula engine").
 * A small tokenizer + recursive-descent parser + tree evaluator. NEVER eval / Function: only the
 * names below exist, so nothing from JavaScript is reachable.
 *
 * Precedence, highest first (as in the prototype):
 *   ( ) and unary ±   →   ^ (right-associative)   →   * /   →   + -   →   > < >= <= == != (1 or 0)
 * So -2^2 = (-2)^2 = 4, matching the prototype (decision 2026-10-08).
 */

export const FORMULA_VARIABLES = ['questionnaire', 'activity', 'mandatory', 'regular', 'mastery', 'target'] as const;
export type FormulaVariable = (typeof FORMULA_VARIABLES)[number];
export type FormulaValues = Partial<Record<FormulaVariable, number>>;

export const MAX_FORMULA_LENGTH = 1000;
const MAX_DEPTH = 200;

/** A formula problem, worded for staff. */
export class FormulaError extends Error {}

type Node =
  | { kind: 'num'; value: number }
  | { kind: 'var'; name: FormulaVariable }
  | { kind: 'neg'; arg: Node }
  | { kind: 'bin'; op: string; left: Node; right: Node }
  | { kind: 'call'; fn: string; args: Node[] };

const FUNCTIONS: Record<string, { min: number; max: number; usage: string }> = {
  min: { min: 2, max: Infinity, usage: 'min needs at least 2 values.' },
  max: { min: 2, max: Infinity, usage: 'max needs at least 2 values.' },
  abs: { min: 1, max: 1, usage: 'abs needs exactly 1 value.' },
  sqrt: { min: 1, max: 1, usage: 'sqrt needs exactly 1 value.' },
  round: { min: 1, max: 1, usage: 'round needs exactly 1 value.' },
  pow: { min: 2, max: 2, usage: 'pow needs exactly 2 values.' },
  if: { min: 3, max: 3, usage: 'if needs 3 values: if(condition, then, otherwise).' },
};
const COMPARISONS = ['>=', '<=', '==', '!=', '>', '<'];

interface Token {
  type: 'num' | 'name' | 'op';
  text: string;
  at: number;
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const num = /^(\d+(\.\d+)?|\.\d+)/.exec(src.slice(i));
    if (num) {
      tokens.push({ type: 'num', text: num[0], at: i });
      i += num[0].length;
      continue;
    }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
    if (name) {
      tokens.push({ type: 'name', text: name[0], at: i });
      i += name[0].length;
      continue;
    }
    const op = ['>=', '<=', '==', '!=', '+', '-', '*', '/', '^', '(', ')', ',', '>', '<'].find((o) => src.startsWith(o, i));
    if (!op) throw new FormulaError(`Check the formula near '${src.slice(i, i + 10)}'.`);
    tokens.push({ type: 'op', text: op, at: i });
    i += op.length;
  }
  return tokens;
}

class Parser {
  private pos = 0;
  private depth = 0;
  constructor(
    private readonly src: string,
    private readonly tokens: Token[],
  ) {}

  parse(): Node {
    const node = this.comparison();
    if (this.pos < this.tokens.length) this.fail();
    return node;
  }

  private peek() {
    return this.tokens[this.pos];
  }
  private takeOp(...ops: string[]) {
    const t = this.peek();
    if (t?.type === 'op' && ops.includes(t.text)) {
      this.pos++;
      return t.text;
    }
    return null;
  }
  private fail(): never {
    const t = this.peek();
    const near = t ? this.src.slice(Math.max(0, t.at - 8), t.at + 8).trim() : this.src.slice(-12).trim();
    throw new FormulaError(t ? `Check the formula near '${near}'.` : `The formula ends too early near '${near}'.`);
  }
  private nest<T>(fn: () => T): T {
    if (++this.depth > MAX_DEPTH) throw new FormulaError('The formula is nested too deeply.');
    try {
      return fn();
    } finally {
      this.depth--;
    }
  }

  private comparison(): Node {
    let left = this.additive();
    for (let op = this.takeOp(...COMPARISONS); op; op = this.takeOp(...COMPARISONS)) left = { kind: 'bin', op, left, right: this.additive() };
    return left;
  }
  private additive(): Node {
    let left = this.term();
    for (let op = this.takeOp('+', '-'); op; op = this.takeOp('+', '-')) left = { kind: 'bin', op, left, right: this.term() };
    return left;
  }
  private term(): Node {
    let left = this.power();
    for (let op = this.takeOp('*', '/'); op; op = this.takeOp('*', '/')) left = { kind: 'bin', op, left, right: this.power() };
    return left;
  }
  /** Right-associative: 2^3^2 = 2^(3^2). The base is a unary, so -2^2 = (-2)^2. */
  private power(): Node {
    const base = this.unary();
    if (this.takeOp('^')) return { kind: 'bin', op: '^', left: base, right: this.nest(() => this.power()) };
    return base;
  }
  private unary(): Node {
    const sign = this.takeOp('+', '-');
    if (sign) {
      const arg = this.nest(() => this.unary());
      return sign === '-' ? { kind: 'neg', arg } : arg;
    }
    return this.primary();
  }
  private primary(): Node {
    const t = this.peek();
    if (!t) this.fail();
    if (t.type === 'num') {
      this.pos++;
      return { kind: 'num', value: Number(t.text) };
    }
    if (this.takeOp('(')) {
      const inner = this.nest(() => this.comparison());
      if (!this.takeOp(')')) this.fail();
      return inner;
    }
    if (t.type === 'name') {
      this.pos++;
      const fn = FUNCTIONS[t.text];
      if (fn && Object.prototype.hasOwnProperty.call(FUNCTIONS, t.text)) {
        if (!this.takeOp('(')) throw new FormulaError(`Use ${t.text}( … ) with brackets.`);
        const args: Node[] = [];
        if (!this.takeOp(')')) {
          do args.push(this.nest(() => this.comparison()));
          while (this.takeOp(','));
          if (!this.takeOp(')')) this.fail();
        }
        if (args.length < fn.min || args.length > fn.max) throw new FormulaError(fn.usage);
        return { kind: 'call', fn: t.text, args };
      }
      if ((FORMULA_VARIABLES as readonly string[]).includes(t.text)) return { kind: 'var', name: t.text as FormulaVariable };
      throw new FormulaError(`Unknown name '${t.text}' in the formula. Use: ${FORMULA_VARIABLES.join(', ')}.`);
    }
    this.fail();
  }
}

const finite = (n: number) => {
  if (!Number.isFinite(n)) throw new FormulaError('The formula must give a number of 0 or more.');
  return n;
};

function evaluate(node: Node, values: FormulaValues): number {
  switch (node.kind) {
    case 'num':
      return node.value;
    case 'var':
      return values[node.name] ?? 0; // missing variables count as 0
    case 'neg':
      return -evaluate(node.arg, values);
    case 'call': {
      if (node.fn === 'if') {
        // Only the chosen branch runs, so if(x > 0, 1 / x, 0) is safe when x is 0.
        const [cond, then, otherwise] = node.args as [Node, Node, Node];
        return evaluate(evaluate(cond, values) !== 0 ? then : otherwise, values);
      }
      const args = node.args.map((a) => evaluate(a, values));
      const [a = 0, b = 0] = args;
      switch (node.fn) {
        case 'min': return finite(Math.min(...args));
        case 'max': return finite(Math.max(...args));
        case 'abs': return finite(Math.abs(a));
        case 'sqrt': return finite(Math.sqrt(a));
        case 'round': return finite(Math.round(a));
        case 'pow': return finite(a ** b);
      }
      throw new FormulaError('Check the formula.');
    }
    case 'bin': {
      const l = evaluate(node.left, values);
      const r = evaluate(node.right, values);
      switch (node.op) {
        case '+': return finite(l + r);
        case '-': return finite(l - r);
        case '*': return finite(l * r);
        case '/':
          if (r === 0) throw new FormulaError('Division by zero: use max(denominator, 1).');
          return finite(l / r);
        case '^': return finite(l ** r);
        case '>': return l > r ? 1 : 0;
        case '<': return l < r ? 1 : 0;
        case '>=': return l >= r ? 1 : 0;
        case '<=': return l <= r ? 1 : 0;
        case '==': return l === r ? 1 : 0;
        case '!=': return l !== r ? 1 : 0;
      }
      throw new FormulaError('Check the formula.');
    }
  }
}

export interface Formula {
  /** The area value for these inputs: a finite number ≥ 0, or a FormulaError. */
  evaluate(values: FormulaValues): number;
}

/** Parses once; throws FormulaError with a staff-facing message. */
export function parseFormula(src: string): Formula {
  const text = src.trim();
  if (!text) throw new FormulaError('Enter a formula.');
  if (text.length > MAX_FORMULA_LENGTH) throw new FormulaError(`Keep the formula to ${MAX_FORMULA_LENGTH} characters or fewer.`);
  const tree = new Parser(text, tokenize(text)).parse();
  return {
    evaluate(values) {
      const result = evaluate(tree, values);
      if (!Number.isFinite(result) || result < 0) throw new FormulaError('The formula must give a number of 0 or more.');
      return result;
    },
  };
}

/**
 * Save-time check (prototype): the formula must parse and give a valid result for every set of
 * values — the sample values AND all zeros. Returns the problem, or null when it's fine.
 */
export function checkFormula(src: string, valueSets: FormulaValues[]): string | null {
  try {
    const formula = parseFormula(src);
    for (const values of valueSets) formula.evaluate(values);
    return null;
  } catch (e) {
    if (e instanceof FormulaError) return e.message;
    throw e;
  }
}

/** The prototype's relation: activity = mandatory + regular. */
export function withActivity(values: FormulaValues): FormulaValues {
  return { ...values, activity: (values.mandatory ?? 0) + (values.regular ?? 0) };
}
