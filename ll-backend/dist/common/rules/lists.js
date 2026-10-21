"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visibleCommunityPosts = visibleCommunityPosts;
exports.visibleChecklist = visibleChecklist;
function visibleCommunityPosts(posts, regularLimit) {
    const pinned = posts.filter((p) => p.pinned);
    const regular = posts
        .filter((p) => !p.pinned)
        .sort((a, b) => b.approvedAt.getTime() - a.approvedAt.getTime())
        .slice(0, regularLimit);
    return [...pinned, ...regular];
}
function visibleChecklist(items, limit) {
    const fresh = items.filter((i) => !i.pending);
    const pending = items.filter((i) => i.pending).sort((a, b) => b.week - a.week);
    return [...fresh, ...pending].slice(0, limit);
}
//# sourceMappingURL=lists.js.map