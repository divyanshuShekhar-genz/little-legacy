import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService, type Tx } from '../drafts/drafts.service';
import { assertRegion, currentArea } from '../../common/utils/region';
import { hasAnySection, type SessionAdmin } from '../../common/types/session-admin';
import { SKILL_STAGES, type QuestionDifficulty, type SkillStage } from '../../common/rules';
import type { CreateQuestionDto, DeleteQuestionDto, QuestionQueryDto, SkillMapDto, UpdateQuestionDto } from './dto/question.dto';

/**
 * Questionnaire questions (guide §6; prototype Questionnaires & Levels, and the area editor's
 * "Questionnaire for this area"). MCQs per area, per age (or all ages).
 *
 * ADMIN-ONLY data: difficulty, answer marks and skill links never reach parents — the parent app
 * must use toParentQuestion() (common/rules/questions.ts).
 *
 * Children's submissions store copies of each answer (text, marks) and their area scores, so
 * editing or deleting a question never changes what a child earned (decision 2026-10-08): delete is
 * a real delete, but an area keeps at least one question ("Keep at least one MCQ").
 */

export const QUESTION_ENTITY = 'Question';
/** "Map answers": the question's skill + a stage per option (Skill Personalisation, guide §10). */
export const SKILL_MAP_ENTITY = 'QuestionSkillMap';

interface SkillMapPayload {
  skillId: string | null;
  /** Every option of the question → its stage (null = Unknown). */
  stages: Record<string, SkillStage | null>;
}

const skillMapSnapshot = async (tx: Tx, id: string) => {
  const q = await tx.question.findUnique({ where: { id }, include: { options: { orderBy: { position: 'asc' } } } });
  return q && { id: q.id, skillId: q.skillId, options: q.options.map((o) => ({ id: o.id, skillStage: o.skillStage })) };
};

/** The skill must be in the question's area; every key must be one of the question's options. */
async function validateSkillMap(db: Tx, questionId: string, p: SkillMapPayload) {
  const q = await db.question.findUnique({ where: { id: questionId }, include: { options: true, area: true } });
  if (!q || q.area.removedAt) throw new NotFoundException('Question not found');
  if (p.skillId) {
    const skill = await db.skill.findUnique({ where: { id: p.skillId } });
    if (!skill || skill.areaId !== q.areaId) throw new BadRequestException('Choose a skill from this development area.');
  }
  if (Object.keys(p.stages).some((id) => !q.options.some((o) => o.id === id))) throw new BadRequestException('Choose answer options from this question.');
  if (Object.values(p.stages).some((s) => s !== null && !(SKILL_STAGES as readonly string[]).includes(s))) {
    throw new BadRequestException('Choose Unknown, Starting, Practising or Confident for each answer.');
  }
  return q;
}
const SECTION = 'Questionnaires';
/** Questionnaires & Levels, or the area editor on the Milestones hub. */
export const QUESTION_SECTIONS = ['questionnairesLevels', 'developmentalMilestones'] as const;

interface QuestionFields {
  areaId: string;
  text: string;
  difficulty: QuestionDifficulty;
  age: number | null;
  /** In order. `id` = an existing option, updated in place so its skill mapping survives. */
  options: { id: string | null; label: string; marks: number }[];
}
type QuestionPayload = { delete: true } | ({ delete?: false } & QuestionFields);

const snapshot = async (tx: Tx, id: string) => {
  const q = await tx.question.findUnique({ where: { id }, include: { options: { orderBy: { position: 'asc' } } } });
  if (!q) return null;
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

/** Area current; age empty or one of the region's age groups; option ids belong to this question. */
async function validate(db: Tx, p: QuestionFields, questionId: string | null) {
  const area = await currentArea(db, p.areaId).catch(() => {
    throw new BadRequestException('Choose a development area.');
  });
  if (p.age !== null && !(await db.ageGroup.findUnique({ where: { regionId_age: { regionId: area.regionId, age: p.age } } }))) {
    throw new BadRequestException("Choose an age group. Add it first if it isn't listed.");
  }
  const ids = p.options.map((o) => o.id).filter((id): id is string => Boolean(id));
  if (ids.length) {
    const own = questionId ? await db.questionOption.count({ where: { questionId, id: { in: ids } } }) : 0;
    if (own !== new Set(ids).size || ids.length !== new Set(ids).size) throw new BadRequestException('Choose answer options from this question.');
  }
  return area;
}

async function assertNotLast(db: Tx, areaId: string) {
  if ((await db.question.count({ where: { areaId } })) <= 1) throw new BadRequestException('Keep at least one question in this development area.');
}

@Injectable()
export class QuestionsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  onModuleInit() {
    this.drafts.register<SkillMapPayload>(SKILL_MAP_ENTITY, {
      snapshot: skillMapSnapshot,
      apply: async (tx, id, p) => {
        if (!id) throw new NotFoundException('Question not found');
        const q = await validateSkillMap(tx, id, p);
        await tx.question.update({ where: { id }, data: { skillId: p.skillId } });
        for (const option of q.options) {
          // "Not mapped" clears every stage; otherwise left-out options are Unknown.
          await tx.questionOption.update({ where: { id: option.id }, data: { skillStage: p.skillId ? (p.stages[option.id] ?? null) : null } });
        }
        return id;
      },
    });

    this.drafts.register<QuestionPayload>(QUESTION_ENTITY, {
      snapshot,
      apply: async (tx, id, payload) => {
        if (payload.delete) {
          const question = id ? await tx.question.findUnique({ where: { id } }) : null;
          if (!question) throw new NotFoundException('Question not found');
          await assertNotLast(tx, question.areaId);
          await tx.question.delete({ where: { id: question.id } }); // options cascade
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
        const keep = payload.options.map((o) => o.id).filter((x): x is string => Boolean(x));
        await tx.questionOption.deleteMany({ where: { questionId: id, id: { notIn: keep } } });
        for (const [position, o] of payload.options.entries()) {
          if (o.id) await tx.questionOption.update({ where: { id: o.id }, data: { position, label: o.label, marks: o.marks } });
          else await tx.questionOption.create({ data: { questionId: id, position, label: o.label, marks: o.marks } });
        }
        return id;
      },
    });
  }

  private assertCanManage(admin: SessionAdmin) {
    if (!hasAnySection(admin, QUESTION_SECTIONS)) throw new ForbiddenException('You do not have access to this section');
  }

  /** Any signed-in admin (this is the admin API; parents never call it). */
  async list({ areaId, regionId, age }: QuestionQueryDto) {
    if (areaId) await currentArea(this.prisma, areaId);
    else if (regionId) await assertRegion(this.prisma, regionId);
    else throw new BadRequestException('Choose a development area.');
    const questions = await this.prisma.question.findMany({
      where: {
        ...(areaId ? { areaId } : { area: { regionId: regionId!, removedAt: null } }),
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

  private fields(areaId: string, dto: UpdateQuestionDto): QuestionFields {
    return {
      areaId,
      text: dto.text,
      difficulty: dto.difficulty,
      age: dto.age ?? null,
      options: dto.options.map((o) => ({ id: o.id ?? null, label: o.label, marks: o.marks })),
    };
  }

  private label = (text: string) => (text.length > 60 ? `${text.slice(0, 57)}…` : text);

  async create(admin: SessionAdmin, dto: CreateQuestionDto) {
    this.assertCanManage(admin);
    const payload = this.fields(dto.areaId, dto);
    if (payload.options.some((o) => o.id)) throw new BadRequestException('Choose answer options from this question.');
    const area = await validate(this.prisma, payload, null);
    return this.drafts.saveOrDraft<QuestionPayload>({ admin, mode: dto.mode, section: SECTION, entityType: QUESTION_ENTITY, entityId: null, regionId: area.regionId, payload, label: `${area.name} · ${this.label(dto.text)}` });
  }

  async update(admin: SessionAdmin, id: string, dto: UpdateQuestionDto) {
    this.assertCanManage(admin);
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    const payload = this.fields(question.areaId, dto); // a question can't move to another area
    const area = await validate(this.prisma, payload, id);
    return this.drafts.saveOrDraft<QuestionPayload>({ admin, mode: dto.mode, section: SECTION, entityType: QUESTION_ENTITY, entityId: id, regionId: area.regionId, payload, label: `${area.name} · ${this.label(dto.text)}` });
  }

  /** "Map answers". Needs Skill Personalisation (decision 2026-10-13). */
  async saveSkillMap(admin: SessionAdmin, id: string, dto: SkillMapDto) {
    const payload: SkillMapPayload = { skillId: dto.skillId ?? null, stages: dto.stages };
    const q = await validateSkillMap(this.prisma, id, payload);
    return this.drafts.saveOrDraft<SkillMapPayload>({ admin, mode: dto.mode, section: 'Skill Personalisation', entityType: SKILL_MAP_ENTITY, entityId: id, regionId: q.area.regionId, payload, label: `Mapped answers: ${this.label(q.text)}` });
  }

  async remove(admin: SessionAdmin, id: string, dto: DeleteQuestionDto) {
    this.assertCanManage(admin);
    const question = await this.prisma.question.findUnique({ where: { id }, include: { area: true } });
    if (!question || question.area.removedAt) throw new NotFoundException('Question not found');
    await assertNotLast(this.prisma, question.areaId);
    return this.drafts.saveOrDraft<QuestionPayload>({ admin, mode: dto.mode, section: SECTION, entityType: QUESTION_ENTITY, entityId: id, regionId: question.area.regionId, payload: { delete: true }, label: `Removed ${question.area.name} · ${this.label(question.text)}` });
  }
}
