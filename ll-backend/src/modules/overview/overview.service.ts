import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Overview counters and the "Children by learning level" chart (guide §4). */
@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [childProfiles, activities, communityQueue, openEnquiries, childLevels] = await Promise.all([
      this.prisma.child.count(),
      this.prisma.activity.count({ where: { withdrawnAt: null } }),
      this.prisma.communityPost.count({ where: { status: 'AWAITING_MODERATION' } }),
      this.prisma.enquiry.count({ where: { status: { not: 'RESOLVED' } } }),
      this.prisma.childAreaLevel.groupBy({ by: ['childId'], _max: { level: true } }),
    ]);

    // A child's learning level = their highest earned area level; children without one are Level 1.
    const counts = new Map<number, number>();
    for (const row of childLevels) {
      const level = Math.max(1, row._max.level ?? 1);
      counts.set(level, (counts.get(level) ?? 0) + 1);
    }
    counts.set(1, (counts.get(1) ?? 0) + (childProfiles - childLevels.length));
    const maxLevel = Math.max(3, ...counts.keys());
    const childrenByLevel = Array.from({ length: maxLevel }, (_, i) => ({ level: i + 1, count: counts.get(i + 1) ?? 0 }));

    return { childProfiles, activities, communityQueue, openEnquiries, childrenByLevel };
  }
}
