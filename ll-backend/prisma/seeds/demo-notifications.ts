/**
 * Demo audience data — development only, so every Notifications filter and the reminders panel
 * have something to match (API_REQUESTS #23). Each part is skipped if it already exists.
 * - Plans: Aria on Plus, Maya on Premium (Rishi stays Free).
 * - Library: Meera read a Nature story and played a Bedtime rhyme; Priya favourited a Nature story.
 * - Reminders: the prototype's daily mandatory-activity reminders (the daily job isn't built yet).
 */
import type { PrismaClient } from '@prisma/client';

export async function seedDemoNotifications(prisma: PrismaClient) {
  const children = await prisma.child.findMany({ where: { name: { in: ['Aria', 'Maya', 'Rishi'] } }, include: { parent: true } });
  const child = (name: string) => children.find((c) => c.name === name);
  const started = new Date('2026-10-01T00:00:00Z');

  for (const [name, plan, amount] of [['Aria', 'PLUS', 199], ['Maya', 'PREMIUM', 499]] as const) {
    const c = child(name);
    if (!c || (await prisma.childSubscription.count({ where: { childId: c.id } }))) continue;
    await prisma.childSubscription.create({ data: { childId: c.id, plan, countryCode: 'IN', currency: 'INR', amountPaid: amount, startsAt: started } });
  }

  const category = (kind: 'STORY' | 'RHYME', name: string) => prisma.libraryCategory.findUnique({ where: { kind_name: { kind, name } } });
  const meera = child('Aria')?.parent;
  if (meera && !(await prisma.libraryEngagement.count({ where: { parentId: meera.id } }))) {
    for (const c of [await category('STORY', 'Nature'), await category('RHYME', 'Bedtime')]) {
      if (c) await prisma.libraryEngagement.create({ data: { parentId: meera.id, categoryId: c.id } });
    }
  }
  const priya = child('Maya')?.parent;
  const nature = await category('STORY', 'Nature');
  const story = nature && (await prisma.libraryItem.findFirst({ where: { kind: 'STORY', categoryId: nature.id }, orderBy: { createdAt: 'asc' } }));
  if (priya && story && !(await prisma.favorite.count({ where: { parentId: priya.id } }))) {
    await prisma.favorite.create({ data: { parentId: priya.id, itemId: story.id } });
  }

  if (!(await prisma.notification.count({ where: { type: 'MANDATORY_REMINDER' } }))) {
    const sentAt = new Date('2026-10-13T08:00:00Z');
    for (const [name, areaNames] of [['Rishi', ['Cognitive', 'Social']], ['Maya', ['Physical']]] as const) {
      const c = child(name);
      if (!c) continue;
      const areas = await prisma.developmentArea.findMany({ where: { regionId: c.regionId, name: { in: [...areaNames] } }, select: { id: true, name: true } });
      await prisma.notification.create({
        data: {
          parentId: c.parentId,
          type: 'MANDATORY_REMINDER',
          title: `${c.name}'s activities this week`,
          body: `A gentle reminder: ${c.name} still has activities to try in ${areas.map((a) => a.name).join(' and ')}.`,
          channels: ['EMAIL', 'IN_APP'],
          data: { childId: c.id, childName: c.name, areaIds: areas.map((a) => a.id), areas: areas.map((a) => a.name) },
          createdAt: sentAt,
        },
      });
    }
  }
  console.log('✔ Demo audience: plans for Aria and Maya, library engagement for Meera and Priya, 2 reminders');
}
