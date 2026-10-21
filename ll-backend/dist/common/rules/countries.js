"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCountryCode = isCountryCode;
exports.isCurrencyCode = isCurrencyCode;
exports.parseCountryCodes = parseCountryCodes;
exports.resolveRegionForCountry = resolveRegionForCountry;
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const NOT_COUNTRIES = new Set(['EU', 'EZ', 'UN', 'QO', 'ZZ']);
const CURRENCIES = new Set(Intl.supportedValuesOf('currency'));
function isCountryCode(code) {
    if (!/^[A-Z]{2}$/.test(code) || NOT_COUNTRIES.has(code))
        return false;
    const name = regionNames.of(code);
    return name !== undefined && name !== code && name !== 'Unknown Region';
}
function isCurrencyCode(code) {
    return /^[A-Z]{3}$/.test(code) && CURRENCIES.has(code);
}
function parseCountryCodes(input) {
    const parts = (Array.isArray(input) ? input : [input])
        .flatMap((s) => s.split(/[\s,]+/))
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
    const codes = [...new Set(parts)];
    return { codes: codes.filter(isCountryCode), invalid: codes.filter((c) => !isCountryCode(c)) };
}
function resolveRegionForCountry(countryRegionId, regions) {
    const own = countryRegionId ? regions.find((r) => r.id === countryRegionId) : undefined;
    if (own?.active)
        return own;
    return regions.find((r) => r.isDefault) ?? null;
}
//# sourceMappingURL=countries.js.map