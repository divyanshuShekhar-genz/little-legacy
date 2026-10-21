"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canPublish = exports.hasAnySection = exports.isSuperAdmin = void 0;
exports.toSessionAdmin = toSessionAdmin;
function toSessionAdmin({ passwordHash: _omit, ...admin }) {
    return admin;
}
const isSuperAdmin = (admin) => admin.role === 'SUPER_ADMIN';
exports.isSuperAdmin = isSuperAdmin;
const hasAnySection = (admin, sections) => (0, exports.isSuperAdmin)(admin) || sections.some((s) => admin.permissions.includes(s));
exports.hasAnySection = hasAnySection;
const canPublish = (admin) => (0, exports.isSuperAdmin)(admin) || admin.directPublish;
exports.canPublish = canPublish;
//# sourceMappingURL=session-admin.js.map