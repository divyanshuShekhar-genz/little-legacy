"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sameSnapshot = sameSnapshot;
function sameSnapshot(a, b) {
    return canonical(a) === canonical(b);
}
function canonical(value) {
    const sort = (v) => {
        if (Array.isArray(v))
            return v.map(sort);
        if (v && typeof v === 'object') {
            return Object.fromEntries(Object.keys(v)
                .sort()
                .map((k) => [k, sort(v[k])]));
        }
        return v;
    };
    return JSON.stringify(sort(JSON.parse(JSON.stringify(value ?? null))));
}
//# sourceMappingURL=snapshot.js.map