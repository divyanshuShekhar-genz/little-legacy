import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface FeedbackRow {
  id: string;
  childName: string;
  activity: string;
  /** Parent's answers from the activity review; null when not given. */
  difficulty: string | null;
  enjoyment: string | null;
  note: string | null;
  completedAt: string;
}

/**
 * Parent feedback (prototype workspace.js "Feedback"): one row per completed activity record
 * (independently or with help), newest first. "Could not complete" attempts are admin-only
 * outcomes, not reviews, so they're excluded — as in the prototype. Read only.
 */
@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<{ rows: FeedbackRow[] }> {
    const attempts = await this.prisma.activityAttempt.findMany({
      where: { outcome: { not: 'NOT_COMPLETED' } },
      include: { child: { select: { name: true } }, activity: { select: { title: true } }, feedback: true },
      orderBy: { createdAt: 'desc' },
    });
    return {
      rows: attempts.map((a) => ({
        id: a.id,
        childName: a.child.name,
        activity: a.activity.title,
        difficulty: a.feedback?.difficulty ?? null,
        enjoyment: a.feedback?.enjoyment ?? null,
        note: a.feedback?.note ?? null,
        completedAt: a.createdAt.toISOString(),
      })),
    };
  }
}
