"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionsService = exports.QUESTION_SECTIONS = exports.SKILL_MAP_ENTITY = exports.QUESTION_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
const region_1 = require("../../common/utils/region");
const session_admin_1 = require("../../common/types/session-admin");
const rules_1 = require("../../common/rules");
exports.QUESTION_ENTITY = 'Question';
exports.SKILL_MAP_ENTITY = 'QuestionSkillMap';
const skillMapSnapshot = async (tx, id) => {
    const q = await tx.question.findUnique({ where: { id }, include: { options: { orderBy: { position: 'asc' } } } });
    return q && { id: q.id, skillId: q.skillId, options: q.options.map((o) => ({ id: o.id, skillStage: o.skillStage })) };
};
async function validateSkillMap(db, questionId, p) {
    const q = await db.question.findUnique({ where: { id: questionId }, include: { options: true, area: true } });
    if (!q || q.area.removedAt)
        throw new common_1.NotFoundException('Question not found');
    if (p.skillId) {
        const skill = await db.skill.findUnique({ where: { id: p.skillId } });
        if (!skill || skill.areaId !== q.areaId)
            throw new common_1.BadRequestException('Choose a skill from this development area.');
    }
    if (Object.keys(p.stages).some((id) => !q.options.some((o) => o.id === id)))
        throw new common_1.BadRequestException('Choose answer options from this question.');
    if (Object.values(p.stages).some((s) => s !== null && !rules_1.SKILL_STAGES.includes(s))) {
        throw new common_1.BadRequestException('Choose Unknown, Starting, Practising or Confident for each answer.');
    }
    return q;
}
const SECTION = 'Questionnaires';
exports.QUESTION_SECTIONS = ['questionnairesLevels', 'developmentalMilestones'];
const snapshot = async (tx, id) => {
    const q = await tx.question.findUnique({ where: { id }, include: { options: { orderBy: { position: 'asc' } } } });
    if (!q)
        return null;
    return {
        id: q.id,
        areaId: q.areaId,
        text: q.text,
        difficulty: q.difficulty,
        age: q.age,
        position: q.position,
        skillId: q.skillId,
        options: q.options.map((o) => ({ id: o.id, label: o.label, marks: Number(o.marks), skillStage: o.skillStage })),
    };
};
async function validate(db, p, questionId) {
    const area = await (0, region_1.currentArea)(db, p.areaId).catch(() => {
        throw new common_1.BadRequestException('Choose a development area.');
    });
    if (p.age !== null && !(await db.ageGroup.findUnique({ where: { regionId_age: { regionId: area.regionId, age: p.age } } }))) {
        throw new common_1.BadRequestException("Choose an age group. Add it first if it isn't listed.");
    }
    const ids = p.options.map((o) => o.id).filter((id) => Boolean(id));
    if (ids.length) {
        const own = questionId ? await db.questionOption.count({ where: { questionId, id: { in: ids } } }) : 0;
        if (own !== new Set(ids).size || ids.length !== new Set(ids).size)
            throw new common_1.BadRequestException('Choose answer options from this question.');
    }
    return area;
}
async function assertNotLast(db, areaId) {
    if ((await db.question.count({ where: { areaId } })) <= 1)
        throw new common_1.BadRequestException('Keep at least one question in this development area.');
}
let QuestionsService = class QuestionsService {
    constructor(prisma, drafts) {
        this.prisma = prisma;
        this.drafts = drafts;
        this.label = (text) => (text.length > 60 ? `${text.slice(0, 57)}…` : text);
    }
    onModuleInit() {
        this.drafts.register(exports.SKILL_MAP_ENTITY, {
            snapshot: skillMapSnapshot,
            apply: async (tx, id, p) => {
                if (!id)
                    throw new common_1.NotFoundException('Question not found');
                const q = await validateSkillMap(tx, id, p);
                await tx.question.update({ where: { id }, data: { skillId: p.skillId } });
                for (const option of q.options) {
                    await tx.questionOption.update({ where: { id: option.id }, data: { skillStage: p.skillId ? (p.stages[option.id] ?? null) : null } });
                }
                return id;
            },
        });
        this.drafts.register(exports.QUESTION_ENTITY, {
            snapshot,
            apply: async (tx, id, payload) => {
                if (payload.delete) {
                    const question = id ? await tx.question.findUnique({ where: { id } }) : null;
                    if (!question)
                        throw new common_1.NotFoundException('Question not found');
                    await assertNotLast(tx, question.areaId);
                    await tx.question.delete({ where: { id: question.id } });
                    return question.id;
                }
                await validate(tx, payload, id);
                const data = { text: payload.text, difficulty: payload.difficulty, age: payload.age };
                if (!id) {
                    const last = await tx.question.aggregate({ where: { areaId: payload.areaId }, _max: { position: true } });
                    const created = await tx.question.create({
                        data: {
                            ...data,
                            areaId: payload.areaId,
                            position: (last._max.position ?? -1) + 1,
                            options: { create: payload.options.map((o, position) => ({ position, label: o.label, marks: o.marks })) },
                        },
                    });
                    return created.id;
                }
                await tx.question.update({ where: { id }, data });
                const keep = payload.options.map((o) => o.id).filter((x) => Boolean(x));
                await tx.questionOption.deleteMany({ where: { questionId: id, id: { notIn: keep } } });
                for (const [position, o] of payload.options.entries()) {
                    if (o.id)
                        await tx.questionOption.update({ where: { id: o.id }, data: { position, label: o.label, marks: o.marks } });
                    else
                        await tx.questionOption.create({ data: { questionId: id, position, label: o.label, marks: o.marks } });
                }
                return id;
            },
        });
    }
    assertCanManage(admin) {
        if (!(0, session_admin_1.hasAnySection)(admin, exports.QUESTION_SECTIONS))
            throw new common_1.ForbiddenException('You do not have access to this section');
    }
    async list({ areaId, regionId, age }) {
        if (areaId)
            await (0, region_1.currentArea)(this.prisma, areaId);
        else if (regionId)
            await (0, region_1.assertRegion)(this.prisma, regionId);
        else
            throw new common_1.BadRequestException('Choose a development area.');
        const questions = await this.prisma.question.findMany({
            where: {
                ...(areaId ? { areaId } : { area: { regionId: regionId, removedAt: null } }),
                ...(age !== undefined ? { OR: [{ age }, { age: null }] } : {}),
            },
            include: {
                area: { select: { id: true, name: true, position: true } },
                skill: { select: { id: true, name: true } },
                options: { orderBy: { position: 'asc' } },
            },
            orderBy: [{ area: { position: 'asc' } }, { position: 'asc' }],
        });
        return {
            questions: questions.map((q) => ({
                id: q.id,
                area: { id: q.area.id, name: q.area.name },
                text: q.text,
                difficulty: q.difficulty,
                age: q.age,
                position: q.position,
                skill: q.skill,
                options: q.options.map((o) => ({ id: o.id, label: o.label, marks: Number(o.marks), skillStage: o.skillStage })),
            })),
        };
    }
    fields(areaId, dto) {
        return {
            areaId,
            text: dto.text,
            difficulty: dto.difficulty,
            age: dto.age ?? null,
            options: dto.options.map((o) => ({ id: o.id ?? null, label: o.label, marks: o.marks })),
        };
    }
    async create(admin, dto) {
        this.assertCanManage(admin);
        const payload = this.fields(dto.areaId, dto);
        if (payload.options.some((o) => o.id))
            throw new common_1.BadRequestException('Choose answer options from this question.');
        const area = await validate(this.prisma, payload, null);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.QUESTION_ENTITY, entityId: null, regionId: area.regionId, payload, label: `${area.name} · ${this.label(dto.text)}` });
    }
    async update(admin, id, dto) {
        this.assertCanManage(admin);
        const question = await this.prisma.question.findUnique({ where: { id } });
        if (!question)
            throw new common_1.NotFoundException('Question not found');
        const payload = this.fields(question.areaId, dto);
        const area = await validate(this.prisma, payload, id);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.QUESTION_ENTITY, entityId: id, regionId: area.regionId, payload, label: `${area.name} · ${this.label(dto.text)}` });
    }
    async saveSkillMap(admin, id, dto) {
        const payload = { skillId: dto.skillId ?? null, stages: dto.stages };
        const q = await validateSkillMap(this.prisma, id, payload);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: 'Skill Personalisation', entityType: exports.SKILL_MAP_ENTITY, entityId: id, regionId: q.area.regionId, payload, label: `Mapped answers: ${this.label(q.text)}` });
    }
    async remove(admin, id, dto) {
        this.assertCanManage(admin);
        const question = await this.prisma.question.findUnique({ where: { id }, include: { area: true } });
        if (!question || question.area.removedAt)
            throw new common_1.NotFoundException('Question not found');
        await assertNotLast(this.prisma, question.areaId);
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.QUESTION_ENTITY, entityId: id, regionId: question.area.regionId, payload: { delete: true }, label: `Removed ${question.area.name} · ${this.label(question.text)}` });
    }
};
exports.QuestionsService = QuestionsService;
exports.QuestionsService = QuestionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService])
], QuestionsService);
//# sourceMappingURL=questions.service.js.map