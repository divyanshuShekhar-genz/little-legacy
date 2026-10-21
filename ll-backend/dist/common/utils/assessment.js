"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.areaScoresSchema = exports.questionnaireAnswersSchema = exports.assessmentRulesSchema = void 0;
exports.defaultRules = defaultRules;
const zod_1 = require("zod");
exports.assessmentRulesSchema = zod_1.z.object({
    areas: zod_1.z.array(zod_1.z.object({
        areaId: zod_1.z.string(),
        name: zod_1.z.string(),
        formula: zod_1.z.string(),
        weight: zod_1.z.number().min(0),
        questionWeights: zod_1.z.object({ EASY: zod_1.z.number().min(0), MEDIUM: zod_1.z.number().min(0), HARD: zod_1.z.number().min(0) }),
    })),
    mandatory: zod_1.z.record(zod_1.z.record(zod_1.z.array(zod_1.z.string()))),
    requiredCounts: zod_1.z.record(zod_1.z.record(zod_1.z.number().int().min(0))),
});
exports.questionnaireAnswersSchema = zod_1.z.array(zod_1.z.object({
    questionId: zod_1.z.string(),
    question: zod_1.z.string(),
    areaId: zod_1.z.string(),
    area: zod_1.z.string(),
    answer: zod_1.z.string(),
    marks: zod_1.z.number(),
}));
exports.areaScoresSchema = zod_1.z.record(zod_1.z.number());
function defaultRules(areas) {
    return {
        areas: areas.map((a) => ({
            areaId: a.id,
            name: a.name,
            formula: 'questionnaire + activity',
            weight: 1,
            questionWeights: { EASY: 1, MEDIUM: 1, HARD: 1 },
        })),
        mandatory: {},
        requiredCounts: {},
    };
}
//# sourceMappingURL=assessment.js.map