/**
 * Demo library — development only: the client prototype's 10 stories and 5 rhymes
 * (parent-content-seed.js), each published with one chapter and one page so the Stories and
 * Rhymes screens have content. Rhymes carry their four-line verse as lyrics and on page 1, as in
 * the prototype. No images or music (those are uploads). Skipped if any story or rhyme exists.
 */
import type { PrismaClient } from '@prisma/client';

const STORIES: [string, string][] = [
  ["The little seed", "Nature"],
  ["A kind little moment", "Kindness"],
  ["The colour cloud", "Feelings"],
  ["My brave little step", "Adventure"],
  ["Together we shine", "Kindness"],
  ["The moon's goodnight", "Bedtime"],
  ["Where did my giggle go?", "Feelings"],
  ["Pip and the puddle", "Adventure"],
  ["A pocketful of wonders", "Nature"],
  ["The sleepy little fox", "Bedtime"],
];

const RHYMES: [string, string, string][] = [
  ["Little raindrops", "Nature", "Little raindrops tap the ground,\nTiny puddles all around.\nLeaves are dancing, flowers sway,\nClouds have come outside to play."],
  ["A helping hand", "Kindness", "A helping hand, a friendly smile,\nCan brighten up a little while.\nA toy to share, a turn to lend,\nA little kindness makes a friend."],
  ["Feelings come and go", "Feelings", "Happy sunshine, rainy blue,\nEvery feeling visits you.\nTake a breath and let it flow,\nLike the clouds, they come and go."],
  ["Off we go", "Adventure", "Over a hill and under a tree,\nWhat little wonders can we see?\nA winding path, a sky so wide,\nAdventure waits just right outside."],
  ["Sleepy little star", "Bedtime", "Sleepy little star so bright,\nKeep us company tonight.\nDreams are sailing soft and slow,\nOff to gentle sleep we go."],
];

export async function seedDemoLibrary(prisma: PrismaClient) {
  if (await prisma.libraryItem.count()) return;
  const categories = await prisma.libraryCategory.findMany();
  const categoryId = (kind: 'STORY' | 'RHYME', name: string) => categories.find((c) => c.kind === kind && c.name === name)!.id;

  for (const [title, category] of STORIES) {
    await prisma.libraryItem.create({
      data: {
        kind: 'STORY',
        title,
        categoryId: categoryId('STORY', category),
        status: 'PUBLISHED',
        chapters: { create: { position: 1, title: 'Chapter 1', pages: { create: { position: 1, description: null } } } },
      },
    });
  }
  for (const [title, category, verse] of RHYMES) {
    await prisma.libraryItem.create({
      data: {
        kind: 'RHYME',
        title,
        categoryId: categoryId('RHYME', category),
        lyrics: verse,
        status: 'PUBLISHED',
        chapters: { create: { position: 1, title: 'Chapter 1', pages: { create: { position: 1, description: verse } } } },
      },
    });
  }
  console.log(`✔ Demo library: ${STORIES.length} stories, ${RHYMES.length} rhymes`);
}
