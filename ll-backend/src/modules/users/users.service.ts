import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { completedYears } from '../../common/rules';
import type { ListUsersQueryDto } from './dto/list-users.query.dto';

export interface RegisteredUserRow {
  parentId: string;
  parentName: string;
  email: string;
  childId: string | null;
  childName: string | null;
  /** Completed years; null when DOB is not collected. */
  age: number | null;
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
        where: contains ? { OR: [{ name: contains }, { email: contains }, { children: { some: { name: contains } } }] } : undefined,
        include: { children: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ageGroup.findMany({ distinct: ['age'], select: { age: true }, orderBy: { age: 'asc' } }),
    ]);

    const now = new Date();
    let rows: RegisteredUserRow[] = parents.flatMap((p): RegisteredUserRow[] => {
      const base = { parentId: p.id, parentName: p.name, email: p.email, registeredAt: p.createdAt.toISOString() };
      if (p.children.length === 0) return [{ ...base, childId: null, childName: null, age: null }];
      return p.children.map((c) => ({ ...base, childId: c.id, childName: c.name, age: c.dob ? completedYears(c.dob, now) : null }));
    });
    if (age !== undefined) rows = rows.filter((r) => r.age === age);

    const ages = [...new Set([...ageGroups.map((a) => a.age), ...rows.flatMap((r) => (r.age === null ? [] : [r.age]))])].sort((a, b) => a - b);
    return { rows, ages };
  }
}
