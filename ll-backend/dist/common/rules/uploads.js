"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_UPLOAD_BYTES = exports.UPLOAD_RULES = exports.UPLOAD_KINDS = void 0;
exports.uploadKindFor = uploadKindFor;
exports.UPLOAD_KINDS = ['IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT'];
const MB = 1024 * 1024;
exports.UPLOAD_RULES = {
    IMAGE: { mimeTypes: ['image/png', 'image/jpeg', 'image/webp'], maxBytes: 5 * MB, label: 'PNG, JPG or WebP, up to 5 MB' },
    AUDIO: {
        mimeTypes: ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/vnd.wave'],
        maxBytes: 20 * MB,
        label: 'MP3, M4A, OGG or WAV, up to 20 MB',
    },
    VIDEO: { mimeTypes: ['video/mp4', 'video/webm'], maxBytes: 100 * MB, label: 'MP4 or WebM, up to 100 MB' },
    DOCUMENT: { mimeTypes: ['application/pdf'], maxBytes: 10 * MB, label: 'PDF, up to 10 MB' },
};
exports.MAX_UPLOAD_BYTES = Math.max(...Object.values(exports.UPLOAD_RULES).map((r) => r.maxBytes));
function uploadKindFor(mimeType) {
    return exports.UPLOAD_KINDS.find((k) => exports.UPLOAD_RULES[k].mimeTypes.includes(mimeType)) ?? null;
}
//# sourceMappingURL=uploads.js.map