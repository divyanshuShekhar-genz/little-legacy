"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toParentQuestion = toParentQuestion;
function toParentQuestion(q) {
    return { id: q.id, text: q.text, options: q.options.map((o) => ({ id: o.id, label: o.label })) };
}
//# sourceMappingURL=questions.js.map