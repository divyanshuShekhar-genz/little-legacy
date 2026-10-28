"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_DEVELOPMENT_AREAS = exports.RESTRICTION_TYPE_KEYS = exports.RESTRICTION_TYPES = exports.NOTIFICATION_CHANNELS = exports.ORDER_STATUSES = exports.ENQUIRY_STATUSES = exports.COMMUNITY_POST_STATUSES = exports.CONTENT_STATUSES = exports.PROGRESSION_OUTCOMES = exports.COMPLETION_OUTCOMES = exports.QUESTION_DIFFICULTIES = exports.PLAN_RANK = exports.CHILD_GENDERS = exports.PLAN_TIERS = exports.PERMISSION_SECTIONS = exports.ADMIN_ROLES = void 0;
exports.ADMIN_ROLES = ['SUPER_ADMIN', 'SUB_ADMIN'];
exports.PERMISSION_SECTIONS = [
    'overview',
    'users',
    'childLearning',
    'community',
    'feedback',
    'activityReviews',
    'enquiries',
    'developmentalMilestones',
    'questionnairesLevels',
    'activities',
    'activityProgression',
    'assessmentRules',
    'skillPersonalisation',
    'stories',
    'rhymes',
    'appContent',
    'parentChecklist',
    'subscriptions',
    'memories',
    'shopOrders',
    'notifications',
];
exports.PLAN_TIERS = ['FREE', 'PLUS', 'PREMIUM'];
exports.CHILD_GENDERS = ['GIRL', 'BOY'];
exports.PLAN_RANK = { FREE: 0, PLUS: 1, PREMIUM: 2 };
exports.QUESTION_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];
exports.COMPLETION_OUTCOMES = ['INDEPENDENT', 'WITH_HELP', 'NOT_COMPLETED'];
exports.PROGRESSION_OUTCOMES = ['STRONG', 'DEVELOPING', 'NEEDS_SUPPORT'];
exports.CONTENT_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'WITHDRAWN'];
exports.COMMUNITY_POST_STATUSES = [
    'AWAITING_MODERATION',
    'DRAFT',
    'PUBLISHED',
    'REJECTED',
    'EXPIRED',
];
exports.ENQUIRY_STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED'];
exports.ORDER_STATUSES = ['PAID', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
exports.NOTIFICATION_CHANNELS = ['EMAIL', 'IN_APP'];
exports.RESTRICTION_TYPES = {
    ACTIVITIES_SECTION: { label: 'Activities section', scope: 'section', section: 'developmentalMilestones' },
    ACTIVITY: { label: 'Activity', scope: 'item', section: 'developmentalMilestones' },
    LEVEL: { label: 'Level', scope: 'item', section: 'developmentalMilestones' },
    STORIES: { label: 'Stories', scope: 'section', section: 'stories' },
    RHYMES: { label: 'Rhymes', scope: 'section', section: 'rhymes' },
    COMMUNITY: { label: 'Community', scope: 'section', section: 'community' },
    ECOMMERCE: { label: 'Ecommerce', scope: 'section', section: 'shopOrders' },
};
exports.RESTRICTION_TYPE_KEYS = Object.keys(exports.RESTRICTION_TYPES);
exports.DEFAULT_DEVELOPMENT_AREAS = ['Cognitive', 'Physical', 'Emotional', 'Social', 'Creative'];
//# sourceMappingURL=domain.js.map