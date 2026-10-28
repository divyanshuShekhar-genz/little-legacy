import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { blocksChildren, completedYears, dobChange, estimateDob, profileGaps } from '../../common/rules';
import { PrismaService } from '../../prisma/prisma.service';
import { loadParentAccount, childSelect, toParentChild } from '../common/parent-views';
import { parseDay, today } from '../common/fields';
import type { SessionParent } from '../common/session-parent';
import type { ChildAgeDto, CreateChildDto, UpdateChildDto } from './dto/app-child.dto';

type Db = Prisma.TransactionClient;

export const CHILD_NOT_FOUND = 'Child not found.';
const NOT_AVAILABLE = "Sorry, this isn't available in your country yet.";
const DOB = "Enter your child's date of birth.";
const AGE = "Enter your child's age in years and months.";

/** Another family's child is "not found", never "forbidden": its existence isn't confirmed. */
export async function ownedChild(db: Db, parentId: string, childId: string) {
  const child = await db.child.findFirst({ where: { id: childId, parentId }, select: childSelect });
  if (!child) throw new NotFoundException(CHILD_NOT_FOUND);
  return child;
}

/**
 * The date of birth to store, from what the parent sent. A category that collects the DOB takes a
 * real date; one that doesn't takes years + months (Q24), stored as an estimated date.
 */
function birthDate(collectDob: boolean, dto: { dob?: string; age?: ChildAgeDto }): { dob: Date; estimated: boolean } {
  if (collectDob) {
    if (dto.dob === undefined) throw new BadRequestException(DOB);
    const dob = parseDay(dto.dob);
    if (!dob) throw new BadRequestException(DOB);
    if (dob > today()) throw new BadRequestException("The date of birth can't be in the future.");
    return { dob, estimated: false };
  }
  if (!dto.age) throw new BadRequestException(AGE);
  return { dob: estimateDob(dto.age, today()), estimated: true };
}

/** Child profiles of the signed-in parent (docs/PARENT_API.md → Children). */
@Injectable()
export class AppChildrenService {
  constructor(private readonly prisma: PrismaService) {}

  async list(parent: SessionParent) {
    const rows = await this.prisma.child.findMany({ where: { parentId: parent.id }, orderBy: { createdAt: 'asc' }, select: childSelect });
    const now = new Date();
    return { children: rows.map((c) => toParentChild(c, now)) };
  }

  async get(parent: SessionParent, id: string) {
    return { child: toParentChild(await ownedChild(this.prisma, parent.id, id)) };
  }

  /**
   * "Add a little one". The category comes from the parent's country and is fixed for good
   * (guide §5); no category there → refused (CR2). The 7-day trial for the first child is Phase 6.
   */
  async create(parent: SessionParent, dto: CreateChildDto) {
    const row = await this.prisma.parent.findUniqueOrThrow({ where: { id: parent.id }, select: { countryCode: true, dob: true, phone: true, termsAcceptedAt: true } });
    const blocking = blocksChildren(profileGaps(row));
    if (blocking.includes('country')) throw new BadRequestException('Choose your country first.');
    if (blocking.includes('terms')) throw new BadRequestException('Please accept the terms and conditions and privacy policy first.');

    const category = (await loadParentAccount(this.prisma, parent.id)).childCategory;
    if (!category) throw new BadRequestException(NOT_AVAILABLE);
    const { dob, estimated } = birthDate(category.collectDob, dto);

    const child = await this.prisma.child.create({
      data: { parentId: parent.id, name: dto.name, gender: dto.gender ?? null, dob, dobEstimated: estimated, regionId: category.id },
      select: childSelect,
    });
    return { child: toParentChild(child) };
  }

  async update(parent: SessionParent, id: string, dto: UpdateChildDto) {
    const child = await ownedChild(this.prisma, parent.id, id);
    const data: Prisma.ChildUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.gender !== undefined) data.gender = dto.gender;

    if (dto.dob !== undefined || dto.age !== undefined) {
      const collectDob = child.region.childFieldSettings[0]?.collected ?? true;
      const next = birthDate(collectDob, dto);
      const same = child.dob?.getTime() === next.dob.getTime() && child.dobEstimated === next.estimated;
      if (!same) {
        const change = dobChange(child, next.estimated);
        if (!change.allowed) throw new BadRequestException('You can only correct the date of birth once.');
        data.dob = next.dob;
        data.dobEstimated = next.estimated;
        if (change.countsAsCorrection) data.dobCorrectedAt = new Date();
        // Guide §7: a correction that changes the completed-year age starts the new flow today
        // (for a child whose weekly cycle has started; Phase 3 starts it).
        const now = new Date();
        if (child.dob && completedYears(child.dob, now) !== completedYears(next.dob, now)) {
          const { cycleStartedAt } = await this.prisma.child.findUniqueOrThrow({ where: { id: child.id }, select: { cycleStartedAt: true } });
          if (cycleStartedAt) data.cycleStartedAt = now;
        }
      }
    }

    const updated = await this.prisma.child.update({ where: { id: child.id }, data, select: childSelect });
    return { child: toParentChild(updated) };
  }

  /** Removes the child and all their learning records. */
  async remove(parent: SessionParent, id: string) {
    const child = await ownedChild(this.prisma, parent.id, id);
    await this.prisma.child.delete({ where: { id: child.id } });
    return { status: 'deleted' as const };
  }
}
