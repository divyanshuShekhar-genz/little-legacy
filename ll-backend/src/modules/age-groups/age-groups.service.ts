import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService, type Tx } from '../drafts/drafts.service';
import { assertRegion } from '../../common/utils/region';
import type { SessionAdmin } from '../../common/types/session-admin';
import type { CreateAgeGroupDto } from './dto/age-group.dto';

/**
 * Supported completed-year ages, per regional learning category (guide §4, §6; prototype
 * "Add age group"). There is no upper age limit. No delete, as in the prototype: questions and
 * activities are prepared for an age, and children's content is picked by it.
 */

export const AGE_GROUP_ENTITY = 'AgeGroup';
const SECTION = 'Developmental Milestones';

interface AgeGroupPayload {
  regionId: string;
  age: number;
}

const snapshot = (tx: Tx, id: string) => tx.ageGroup.findUnique({ where: { id }, select: { id: true, regionId: true, age: true } });

async function assertAgeFree(db: Tx, regionId: string, age: number) {
  if (await db.ageGroup.findUnique({ where: { regionId_age: { regionId, age } } })) throw new ConflictException('That age group already exists.');
}

@Injectable()
export class AgeGroupsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  onModuleInit() {
    this.drafts.register<AgeGroupPayload>(AGE_GROUP_ENTITY, {
      snapshot,
      apply: async (tx, _id, payload) => {
        await assertRegion(tx, payload.regionId);
        await assertAgeFree(tx, payload.regionId, payload.age);
        return (await tx.ageGroup.create({ data: payload })).id;
      },
    });
  }

  async list(regionId: string) {
    await assertRegion(this.prisma, regionId);
    const ageGroups = await this.prisma.ageGroup.findMany({ where: { regionId }, select: { id: true, age: true }, orderBy: { age: 'asc' } });
    return { ageGroups };
  }

  async create(admin: SessionAdmin, dto: CreateAgeGroupDto) {
    await assertRegion(this.prisma, dto.regionId);
    await assertAgeFree(this.prisma, dto.regionId, dto.age);
    return this.drafts.saveOrDraft<AgeGroupPayload>({
      admin,
      mode: dto.mode,
      section: SECTION,
      entityType: AGE_GROUP_ENTITY,
      entityId: null,
      regionId: dto.regionId,
      payload: { regionId: dto.regionId, age: dto.age },
      label: `Age group ${dto.age} years`,
    });
  }
}
