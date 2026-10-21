/**
 * Demo seed — development-only test data, mirroring the client prototype's sample records:
 * three Sub Admins (for permission / draft testing), three families (@example.com, which can
 * never belong to a real person) and their learning records (demo-learning.ts).
 * Refuses to run in production. Run after the base seed.
 */
import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { REGION_NAMES } from './base';
import { seedDemoLearning } from './demo-learning';
import { seedDemoLibrary } from './demo-library';
import { seedDemoCommerce, seedDemoOrders } from './demo-commerce';
import { seedDemoNotifications } from './demo-notifications';
import { seedDemoChecklist } from './demo-checklist';
import { seedDemoAppContentVersion } from './app-content';

const DEMO_PASSWORD = 'ChangeMe123!';

export async function seedDemo(prisma: PrismaClient) {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo data must not be seeded in production.');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const subAdmins = [
    { name: 'Aditi · Content', email: 'aditi@littlelegacy.dev', permissions: ['developmentalMilestones', 'activities', 'stories'] },
    { name: 'Neha · Parent Support', email: 'neha@littlelegacy.dev', permissions: ['community', 'enquiries'] },
    { name: 'Rohan · Orders', email: 'rohan@littlelegacy.dev', permissions: ['shopOrders'] },
  ];
  for (const a of subAdmins) {
    await prisma.adminUser.upsert({ where: { email: a.email }, update: {}, create: { ...a, passwordHash } });
  }

  const region = await prisma.learningRegion.findUniqueOrThrow({ where: { name: REGION_NAMES.indiaSriLanka } });
  const families = [
    { parent: 'Meera', child: 'Aria', dob: '2022-05-10' },
    { parent: 'Kunal', child: 'Rishi', dob: '2023-02-02' },
    { parent: 'Priya', child: 'Maya', dob: '2021-07-21' },
  ];
  for (const f of families) {
    const email = `${f.parent.toLowerCase()}@example.com`;
    if (await prisma.parent.findUnique({ where: { email } })) continue;
    await prisma.parent.create({
      data: {
        name: f.parent,
        email,
        countryCode: 'IN',
        createdAt: new Date('2026-09-14T10:00:00Z'),
        children: { create: { name: f.child, dob: new Date(f.dob), regionId: region.id } },
      },
    });
  }

  await seedDemoLearning(prisma);
  await seedDemoCommunity(prisma);
  await seedDemoEnquiries(prisma);
  await seedDemoLibrary(prisma);
  await seedDemoCommerce(prisma);
  await seedDemoOrders(prisma);
  await seedDemoNotifications(prisma);
  await seedDemoChecklist(prisma);
  await seedDemoAppContentVersion(prisma);

  console.log(`✔ Demo data. Sub Admins: ${subAdmins.map((a) => a.email).join(', ')} / ${DEMO_PASSWORD}`);
}

/** The prototype's community content: one parent message awaiting moderation, two team posts. */
async function seedDemoCommunity(prisma: PrismaClient) {
  if (await prisma.communityPost.count()) return;
  const meera = await prisma.parent.findUnique({ where: { email: 'meera@example.com' } });
  if (meera) {
    await prisma.communityPost.create({
      data: {
        authorType: 'PARENT',
        parentId: meera.id,
        message: 'We tried ice painting today. Aria loved mixing the colours!',
        status: 'AWAITING_MODERATION',
        createdAt: new Date('2026-09-20T15:00:00Z'),
      },
    });
  }
  const approvedAt = new Date('2026-09-14T10:00:00Z');
  for (const { title, message } of [
    { title: 'A little celebration', message: 'Small wins deserve a little celebration. What did your little one discover today?' },
    { title: 'An ordinary afternoon', message: 'A few crayons and a shared story can turn an ordinary afternoon into something special.' },
  ]) {
    await prisma.communityPost.create({ data: { authorType: 'TEAM', title, message, status: 'PUBLISHED', approvedAt, createdAt: approvedAt } });
  }
  console.log('✔ Demo community: 1 parent message awaiting moderation, 2 team posts');
}

/** The prototype's one enquiry, from Priya. */
async function seedDemoEnquiries(prisma: PrismaClient) {
  if (await prisma.enquiry.count()) return;
  const priya = await prisma.parent.findUnique({ where: { email: 'priya@example.com' } });
  if (!priya) return;
  await prisma.enquiry.create({
    data: { parentId: priya.id, message: 'Where can I find the instructions for the discovery kit?', createdAt: new Date('2026-09-21T09:30:00Z') },
  });
  console.log('✔ Demo enquiries: 1 new enquiry');
}
