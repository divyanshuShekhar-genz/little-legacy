"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isClosedOrder = void 0;
exports.orderTotal = orderTotal;
exports.isPurchasable = isPurchasable;
exports.orderStatusChange = orderStatusChange;
function orderTotal(lines, deliveryCharge) {
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    return { subtotal, delivery: deliveryCharge, total: subtotal + deliveryCharge };
}
function isPurchasable(countryPrice) {
    return countryPrice !== null && countryPrice !== undefined;
}
const isClosedOrder = (status) => status === 'CANCELLED' || status === 'REFUNDED';
exports.isClosedOrder = isClosedOrder;
function orderStatusChange(from, to) {
    if (from === to)
        return { allowed: true, restock: false };
    if ((0, exports.isClosedOrder)(from))
        return { allowed: from === 'CANCELLED' && to === 'REFUNDED', restock: false };
    return { allowed: true, restock: (0, exports.isClosedOrder)(to) && (from === 'PAID' || from === 'PACKED') };
}
//# sourceMappingURL=commerce.js.map