import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService, type Tx } from '../drafts/drafts.service';
import { assertRegion, currentArea } from '../../common/utils/region';
import type { SessionAdmin } from '../../common/types/session-admin';
import type { CreateSkillDto, SkillQueryDto, UpdateSkillDto } from './dto/skill.dto';

/**
 * Skills (guide §10; prototype Skill Personalisation). A skill belongs to one development area.
 * Activities are tagged with a skill (activity editor); questionnaire answers are mapped to skill
 * stages ("Map answers", QuestionsService); each skill has an expected score (%) per age.
 * No delete (decision 2026-10-13). The selection preview lives in SelectionPreviewService.
 */

export const SKILL_ENTITY = 'Skill';
const SECTION = 'Skill Personalisation';

interface SkillPayload {
  areaId: string;
  name: string;
  expected: { age: number; expectedScore: number }[];
}

const snapshot = async (tx: Tx, id: string) => {
  const s = await tx.skill.findUnique({ where: { id }, include: { expectations: { orderBy: { age: 'asc' } } } });
  return s && { id: s.id, areaId: s.areaId, name: s.name, expected: s.expectations.map((e) => ({ age: e.age, expectedScore: e.expectedScore })) };
};

/** Questions, offered activities or activity groups that use this skill. */
async function usage(db: Tx, skillId: string) {
  const [questions, activities, families] = await Promise.all([
    db.question.count({ where: { skillId } }),
    db.activity.count({ where: { skillId, withdrawnAt: null } }),
    db.activityFamily.count({ where: { skillId, archived: false } }),
  ]);
  return { questions, activities, families };
}

async function validate(db: Tx, p: SkillPayload, id: string | null) {
  const area = await currentArea(db, p.areaId).catch(() => {
    throw new BadRequestException('Choose a development area.');
  });
  const taken = await db.skill.findFirst({
    where: { areaId: p.areaId, name: { equals: p.name, mode: 'insensitive' }, ...(id ? { id: { not: id } } : {}) },
  });
  if (taken) throw new ConflictException('Use a unique skill name in this development area.');

  const ages = new Set((await db.ageGroup.findMany({ where: { regionId: area.regionId }, select: { age: true } })).map((g) => g.age));
  const sent = p.expected.map((e) => e.age);
  if (sent.some((a) => !ages.has(a))) throw new BadRequestException("Choose an age group. Add it first if it isn't listed.");
  if (new Set(sent).size !== sent.length) throw new BadRequestException('Set one expected score per age.');

  if (id) {
    const existing = await db.skill.findUnique({ where: { id } });
    if (existing && existing.areaId !== p.areaId) {
      const used = await usage(db, id);
      // Prototype message.
      if (used.questions + used.activities + used.families > 0) throw new BadRequestException('This skill is in use. Keep its area or remove its links first.');
    }
  }
  return area;
}

@Injectable()
export class SkillsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  onModuleInit() {
    this.drafts.register<SkillPayload>(SKILL_ENTITY, {
      snapshot,
      apply: async (tx, id, p) => {
        await validate(tx, p, id);
        const skillId = id
          ? (await tx.skill.update({ where: { id }, data: { areaId: p.areaId, name: p.name } })).id
          : (await tx.skill.create({ data: { areaId: p.areaId, name: p.name } })).id;
        await tx.skillExpectation.deleteMany({ where: { skillId } });
        await tx.skillExpectation.createMany({ data: p.expected.map((e) => ({ skillId, age: e.age, expectedScore: e.expectedScore })) });
        return skillId;
      },
    });
  }

  /** Any signed-in admin: the activity editor's "Primary skill" list needs it. */
  async list({ areaId, regionId }: SkillQueryDto) {
    if (areaId) await currentArea(this.prisma, areaId);
    else if (regionId) await assertRegion(this.prisma, regionId);
    else throw new BadRequestException('Choose a development area.');

    const skills = await this.prisma.skill.findMany({
      where: areaId ? { areaId } : { area: { regionId: regionId!, removedAt: null } },
      include: {
        area: { select: { id: true, name: true, position: true } },
        expectations: { orderBy: { age: 'asc' } },
        _count: { select: { questions: true, activities: { where: { withdrawnAt: null } } } },
      },
      orderBy: [{ area: { position: 'asc' } }, { name: 'asc' }],
    });
    return {
      skills: skills.map((s) => ({
        id: s.id,
        name: s.name,
        area: { id: s.area.id, name: s.area.name },
        expected: s.expectations.map((e) => ({ age: e.age, expectedScore: e.expectedScore })),
        counts: s._count,
      })),
    };
  }

  async create(admin: SessionAdmin, dto: CreateSkillDto) {
    const payload: SkillPayload = { areaId: dto.areaId, name: dto.name, expected: dto.expected.map((e) => ({ age: e.age, expectedScore: e.expectedScore })) };
    const area = await validate(this.prisma, payload, null);
    return this.drafts.saveOrDraft<SkillPayload>({ admin, mode: dto.mode, section: SECTION, entityType: SKILL_ENTITY, entityId: null, regionId: area.regionId, payload, label: `${area.name} · ${dto.name}` });
  }

  async update(admin: SessionAdmin, id: string, dto: UpdateSkillDto) {
    const current = await snapshot(this.prisma, id);
    if (!current) throw new NotFoundException('Skill not found');
    const payload: SkillPayload = {
      areaId: dto.areaId ?? current.areaId,
      name: dto.name ?? current.name,
      expected: dto.expected ? dto.expected.map((e) => ({ age: e.age, expectedScore: e.expectedScore })) : current.expected,
    };
    const area = await validate(this.prisma, payload, id);
    return this.drafts.saveOrDraft<SkillPayload>({ admin, mode: dto.mode, section: SECTION, entityType: SKILL_ENTITY, entityId: id, regionId: area.regionId, payload, label: `${area.name} · ${payload.name}` });
  }
}
