"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trim = exports.toJson = void 0;
const toJson = (value) => value === undefined || value === null ? undefined : JSON.parse(JSON.stringify(value));
exports.toJson = toJson;
const trim = ({ value }) => (typeof value === 'string' ? value.trim() : value);
exports.trim = trim;
//# sourceMappingURL=json.js.map