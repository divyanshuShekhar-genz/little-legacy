/**
 * Demo parent checklist — development only: the screen's sample items (docs/prototype/content-commerce.md
 * → Parent Checklist), published in the default regional learning category. Other categories stay
 * empty, as a new category does. Skipped if that category already has items.
 */
import type { PrismaClient } from '@prisma/client';

const ITEMS = [
  { week: 1, position: 1, title: 'Prepare a comfortable activity space', description: 'Choose a safe, clear space and gather the materials you need.' },
  { week: 1, position: 2, title: 'Choose a regular activity time', description: 'Pick a calm time of day that suits your family and keep it for the week.' },
  { week: 2, position: 1, title: 'Check your child’s questions', description: 'Review the questionnaire answers so this week’s activities fit your child.' },
  { week: 3, position: 1, title: 'Share a little moment', description: 'Post a favourite moment from this week to the community.' },
];

export async function seedDemoChecklist(prisma: PrismaClient) {
  const region = await prisma.learningRegion.findFirst({ where: { isDefault: true } });
  if (!region || (await prisma.checklistItem.count({ where: { regionId: region.id } }))) return;
  await prisma.checklistItem.createMany({ data: ITEMS.map((i) => ({ ...i, regionId: region.id, status: 'PUBLISHED' as const })) });
  console.log(`✔ Demo parent checklist: ${ITEMS.length} items in ${region.name}`);
}
