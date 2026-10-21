"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormulaError = exports.MAX_FORMULA_LENGTH = exports.FORMULA_VARIABLES = void 0;
exports.parseFormula = parseFormula;
exports.checkFormula = checkFormula;
exports.withActivity = withActivity;
exports.FORMULA_VARIABLES = ['questionnaire', 'activity', 'mandatory', 'regular', 'mastery', 'target'];
exports.MAX_FORMULA_LENGTH = 1000;
const MAX_DEPTH = 200;
class FormulaError extends Error {
}
exports.FormulaError = FormulaError;
const FUNCTIONS = {
    min: { min: 2, max: Infinity, usage: 'min needs at least 2 values.' },
    max: { min: 2, max: Infinity, usage: 'max needs at least 2 values.' },
    abs: { min: 1, max: 1, usage: 'abs needs exactly 1 value.' },
    sqrt: { min: 1, max: 1, usage: 'sqrt needs exactly 1 value.' },
    round: { min: 1, max: 1, usage: 'round needs exactly 1 value.' },
    pow: { min: 2, max: 2, usage: 'pow needs exactly 2 values.' },
    if: { min: 3, max: 3, usage: 'if needs 3 values: if(condition, then, otherwise).' },
};
const COMPARISONS = ['>=', '<=', '==', '!=', '>', '<'];
function tokenize(src) {
    const tokens = [];
    let i = 0;
    while (i < src.length) {
        const ch = src[i];
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
        if (!op)
            throw new FormulaError(`Check the formula near '${src.slice(i, i + 10)}'.`);
        tokens.push({ type: 'op', text: op, at: i });
        i += op.length;
    }
    return tokens;
}
class Parser {
    constructor(src, tokens) {
        this.src = src;
        this.tokens = tokens;
        this.pos = 0;
        this.depth = 0;
    }
    parse() {
        const node = this.comparison();
        if (this.pos < this.tokens.length)
            this.fail();
        return node;
    }
    peek() {
        return this.tokens[this.pos];
    }
    takeOp(...ops) {
        const t = this.peek();
        if (t?.type === 'op' && ops.includes(t.text)) {
            this.pos++;
            return t.text;
        }
        return null;
    }
    fail() {
        const t = this.peek();
        const near = t ? this.src.slice(Math.max(0, t.at - 8), t.at + 8).trim() : this.src.slice(-12).trim();
        throw new FormulaError(t ? `Check the formula near '${near}'.` : `The formula ends too early near '${near}'.`);
    }
    nest(fn) {
        if (++this.depth > MAX_DEPTH)
            throw new FormulaError('The formula is nested too deeply.');
        try {
            return fn();
        }
        finally {
            this.depth--;
        }
    }
    comparison() {
        let left = this.additive();
        for (let op = this.takeOp(...COMPARISONS); op; op = this.takeOp(...COMPARISONS))
            left = { kind: 'bin', op, left, right: this.additive() };
        return left;
    }
    additive() {
        let left = this.term();
        for (let op = this.takeOp('+', '-'); op; op = this.takeOp('+', '-'))
            left = { kind: 'bin', op, left, right: this.term() };
        return left;
    }
    term() {
        let left = this.power();
        for (let op = this.takeOp('*', '/'); op; op = this.takeOp('*', '/'))
            left = { kind: 'bin', op, left, right: this.power() };
        return left;
    }
    power() {
        const base = this.unary();
        if (this.takeOp('^'))
            return { kind: 'bin', op: '^', left: base, right: this.nest(() => this.power()) };
        return base;
    }
    unary() {
        const sign = this.takeOp('+', '-');
        if (sign) {
            const arg = this.nest(() => this.unary());
            return sign === '-' ? { kind: 'neg', arg } : arg;
        }
        return this.primary();
    }
    primary() {
        const t = this.peek();
        if (!t)
            this.fail();
        if (t.type === 'num') {
            this.pos++;
            return { kind: 'num', value: Number(t.text) };
        }
        if (this.takeOp('(')) {
            const inner = this.nest(() => this.comparison());
            if (!this.takeOp(')'))
                this.fail();
            return inner;
        }
        if (t.type === 'name') {
            this.pos++;
            const fn = FUNCTIONS[t.text];
            if (fn && Object.prototype.hasOwnProperty.call(FUNCTIONS, t.text)) {
                if (!this.takeOp('('))
                    throw new FormulaError(`Use ${t.text}( … ) with brackets.`);
                const args = [];
                if (!this.takeOp(')')) {
                    do
                        args.push(this.nest(() => this.comparison()));
                    while (this.takeOp(','));
                    if (!this.takeOp(')'))
                        this.fail();
                }
                if (args.length < fn.min || args.length > fn.max)
                    throw new FormulaError(fn.usage);
                return { kind: 'call', fn: t.text, args };
            }
            if (exports.FORMULA_VARIABLES.includes(t.text))
                return { kind: 'var', name: t.text };
            throw new FormulaError(`Unknown name '${t.text}' in the formula. Use: ${exports.FORMULA_VARIABLES.join(', ')}.`);
        }
        this.fail();
    }
}
const finite = (n) => {
    if (!Number.isFinite(n))
        throw new FormulaError('The formula must give a number of 0 or more.');
    return n;
};
function evaluate(node, values) {
    switch (node.kind) {
        case 'num':
            return node.value;
        case 'var':
            return values[node.name] ?? 0;
        case 'neg':
            return -evaluate(node.arg, values);
        case 'call': {
            if (node.fn === 'if') {
                const [cond, then, otherwise] = node.args;
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
                    if (r === 0)
                        throw new FormulaError('Division by zero: use max(denominator, 1).');
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
function parseFormula(src) {
    const text = src.trim();
    if (!text)
        throw new FormulaError('Enter a formula.');
    if (text.length > exports.MAX_FORMULA_LENGTH)
        throw new FormulaError(`Keep the formula to ${exports.MAX_FORMULA_LENGTH} characters or fewer.`);
    const tree = new Parser(text, tokenize(text)).parse();
    return {
        evaluate(values) {
            const result = evaluate(tree, values);
            if (!Number.isFinite(result) || result < 0)
                throw new FormulaError('The formula must give a number of 0 or more.');
            return result;
        },
    };
}
function checkFormula(src, valueSets) {
    try {
        const formula = parseFormula(src);
        for (const values of valueSets)
            formula.evaluate(values);
        return null;
    }
    catch (e) {
        if (e instanceof FormulaError)
            return e.message;
        throw e;
    }
}
function withActivity(values) {
    return { ...values, activity: (values.mandatory ?? 0) + (values.regular ?? 0) };
}
//# sourceMappingURL=formula.js.map