import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ListActivityReviewsQueryDto } from './dto/list-activity-reviews.query.dto';

export interface ActivityReviewRow {
  id: string;
  completedAt: string;
  childName: string;
  parentEmail: string;
  activity: string;
  repeat: number;
  /** Always 100: every row is a completed record (the prototype shows 100% too). */
  completionPercent: number;
  difficulty: string | null;
  enjoyment: string | null;
  note: string | null;
  /** Active time in Independent mode, pauses excluded; null = "Not recorded". */
  elapsedSeconds: number | null;
}

/**
 * Activity Reviews (guide §4; prototype folder-alignment.js + activity-timing.js). Completed
 * activity records with parent feedback — records, not an approval queue. READ ONLY.
 * Same records as Feedback: "Could not complete" attempts are admin-only outcomes, not reviews.
 *
 * There is no import endpoint: attempts are written by the parent-app API, never from an
 * admin's file upload (that would let staff award earned scores). See API_REQUESTS #1 notes.
 */
@Injectable()
export class ActivityReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ difficulty }: ListActivityReviewsQueryDto): Promise<{ rows: ActivityReviewRow[] }> {
    const attempts = await this.prisma.activityAttempt.findMany({
      where: { outcome: { not: 'NOT_COMPLETED' }, ...(difficulty ? { feedback: { difficulty } } : {}) },
      include: {
        child: { select: { name: true, parent: { select: { email: true } } } },
        activity: { select: { title: true } },
        feedback: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      rows: attempts.map((a) => ({
        id: a.id,
        completedAt: a.createdAt.toISOString(),
        childName: a.child.name,
        parentEmail: a.child.parent.email,
        activity: a.activity.title,
        repeat: a.repeat,
        completionPercent: 100,
        difficulty: a.feedback?.difficulty ?? null,
        enjoyment: a.feedback?.enjoyment ?? null,
        note: a.feedback?.note ?? null,
        elapsedSeconds: a.elapsedSeconds,
      })),
    };
  }
}
