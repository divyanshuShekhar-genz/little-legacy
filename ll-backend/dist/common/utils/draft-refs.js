"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectRefs = collectRefs;
const CUID = /^c[a-z0-9]{20,30}$/;
const COUNTRY = /^[A-Z]{2}$/;
const COUNTRY_KEYS = new Set(['countryCode', 'countryCodes', 'code']);
function collectRefs(values, refs = { ids: new Set(), countryCodes: new Set() }) {
    const visit = (value, key) => {
        if (typeof value === 'string') {
            if (CUID.test(value))
                refs.ids.add(value);
            else if (key && COUNTRY_KEYS.has(key) && COUNTRY.test(value))
                refs.countryCodes.add(value);
            return;
        }
        if (Array.isArray(value)) {
            value.forEach((v) => visit(v, key));
            return;
        }
        if (value && typeof value === 'object') {
            for (const [k, v] of Object.entries(value)) {
                if (CUID.test(k))
                    refs.ids.add(k);
                visit(v, k);
            }
        }
    };
    values.forEach((v) => visit(v, null));
    return refs;
}
//# sourceMappingURL=draft-refs.js.map