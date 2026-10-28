import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ageOn } from '../../common/rules';
import type { ListUsersQueryDto } from './dto/list-users.query.dto';

export interface RegisteredUserRow {
  parentId: string;
  parentName: string;
  email: string;
  childId: string | null;
  childName: string | null;
  /** Completed years; null when there's no date of birth. */
  age: number | null;
  /** The months on top of `age` (0–11), for "4 y 8 m" (Q24); null with `age`. */
  ageMonths: number | null;
  /** True when the date of birth was worked out from an age the parent entered (Q24); null without a child. */
  dobEstimated: boolean | null;
  registeredAt: string;
}

/**
 * Registered Users (guide §4). Read only — admins cannot edit a child's personal details.
 * One row per child; a parent without children gets one row.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ search, age }: ListUsersQueryDto) {
    const contains = search ? { contains: search, mode: 'insensitive' as const } : undefined;
    const [parents, ageGroups] = await Promise.all([
      this.prisma.parent.findMany({
        // Deleted accounts (parent app) aren't users any more; their orders keep "Deleted account".
        where: { deletedAt: null, ...(contains ? { OR: [{ name: contains }, { email: contains }, { children: { some: { name: contains } } }] } : {}) },
        include: { children: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ageGroup.findMany({ distinct: ['age'], select: { age: true }, orderBy: { age: 'asc' } }),
    ]);

    const now = new Date();
    let rows: RegisteredUserRow[] = parents.flatMap((p): RegisteredUserRow[] => {
      const base = { parentId: p.id, parentName: p.name, email: p.email, registeredAt: p.createdAt.toISOString() };
      if (p.children.length === 0) return [{ ...base, childId: null, childName: null, age: null, ageMonths: null, dobEstimated: null }];
      return p.children.map((c) => {
        const a = c.dob ? ageOn(c.dob, now) : null;
        return { ...base, childId: c.id, childName: c.name, age: a?.years ?? null, ageMonths: a?.months ?? null, dobEstimated: c.dobEstimated };
      });
    });
    if (age !== undefined) rows = rows.filter((r) => r.age === age);

    const ages = [...new Set([...ageGroups.map((a) => a.age), ...rows.flatMap((r) => (r.age === null ? [] : [r.age]))])].sort((a, b) => a - b);
    return { rows, ages };
  }
}
