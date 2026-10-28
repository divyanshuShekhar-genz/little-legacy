/**
 * Base seed — reference data every environment needs (development, staging, production):
 * the first Super Admin, learning regions, countries, plans, the default learning catalogue
 * skeleton and settings. Idempotent: every write is an upsert or a "create if missing".
 */
import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_DEVELOPMENT_AREAS } from '../../src/common/rules';
import { defaultRules } from '../../src/common/utils/assessment';
import { seedAppContentDraft } from './app-content';

const AREA_DESCRIPTIONS: Record<string, string> = {
  Cognitive: 'Thinking, remembering and problem solving',
  Physical: 'Movement, coordination and balance',
  Emotional: 'Recognising and expressing feelings',
  Social: 'Connecting, sharing and taking turns',
  Creative: 'Imagination, making and expression',
};

/** [code, name, ISO 4217 currency] — Category 1 countries besides US, as of 2026 (BG uses EUR). */
const EUROPE: [string, string, string][] = [
  ['GB', 'United Kingdom', 'GBP'], ['IE', 'Ireland', 'EUR'], ['FR', 'France', 'EUR'], ['DE', 'Germany', 'EUR'],
  ['IT', 'Italy', 'EUR'], ['ES', 'Spain', 'EUR'], ['PT', 'Portugal', 'EUR'], ['NL', 'Netherlands', 'EUR'],
  ['BE', 'Belgium', 'EUR'], ['LU', 'Luxembourg', 'EUR'], ['AT', 'Austria', 'EUR'], ['CH', 'Switzerland', 'CHF'],
  ['LI', 'Liechtenstein', 'CHF'], ['DK', 'Denmark', 'DKK'], ['SE', 'Sweden', 'SEK'], ['NO', 'Norway', 'NOK'],
  ['FI', 'Finland', 'EUR'], ['IS', 'Iceland', 'ISK'], ['EE', 'Estonia', 'EUR'], ['LV', 'Latvia', 'EUR'],
  ['LT', 'Lithuania', 'EUR'], ['PL', 'Poland', 'PLN'], ['CZ', 'Czechia', 'CZK'], ['SK', 'Slovakia', 'EUR'],
  ['HU', 'Hungary', 'HUF'], ['SI', 'Slovenia', 'EUR'], ['HR', 'Croatia', 'EUR'], ['BA', 'Bosnia and Herzegovina', 'BAM'],
  ['RS', 'Serbia', 'RSD'], ['ME', 'Montenegro', 'EUR'], ['MK', 'North Macedonia', 'MKD'], ['AL', 'Albania', 'ALL'],
  ['GR', 'Greece', 'EUR'], ['BG', 'Bulgaria', 'EUR'], ['RO', 'Romania', 'RON'], ['MD', 'Moldova', 'MDL'],
  ['UA', 'Ukraine', 'UAH'], ['BY', 'Belarus', 'BYN'], ['MT', 'Malta', 'EUR'], ['CY', 'Cyprus', 'EUR'],
  ['TR', 'Türkiye', 'TRY'],
];

export const REGION_NAMES = {
  usEurope: 'Category 1 · US and Europe',
  indiaSriLanka: 'Category 2 · India and Sri Lanka',
} as const;

export async function seedBase(prisma: PrismaClient) {
  // First Super Admin. In production the password must come from the environment.
  const email = (process.env.SEED_SUPER_ADMIN_EMAIL ?? 'owner@littlelegacy.dev').toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (!password && process.env.NODE_ENV === 'production') {
    throw new Error('Set SEED_SUPER_ADMIN_PASSWORD before seeding production.');
  }
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Super Admin',
      email,
      role: 'SUPER_ADMIN',
      passwordHash: await bcrypt.hash(password ?? 'ChangeMe123!', 10),
      directPublish: true,
    },
  });

  // Learning regions ("regional learning categories"). Category 1 starts empty by design. There is
  // no default category (OPEN_QUESTIONS Q8, CR2): every country below is assigned to one.
  const usEurope = await prisma.learningRegion.upsert({
    where: { name: REGION_NAMES.usEurope },
    update: {},
    create: { name: REGION_NAMES.usEurope },
  });
  const indiaSriLanka = await prisma.learningRegion.upsert({
    where: { name: REGION_NAMES.indiaSriLanka },
    update: {},
    create: { name: REGION_NAMES.indiaSriLanka },
  });

  // Countries (prices are per country and never converted)
  const countries = [
    { code: 'IN', name: 'India', currency: 'INR', deliveryCharge: 0, deliveryEstimate: '5–7 business days', learningRegionId: indiaSriLanka.id },
    { code: 'LK', name: 'Sri Lanka', currency: 'LKR', deliveryCharge: 0, deliveryEstimate: null, learningRegionId: indiaSriLanka.id },
    { code: 'US', name: 'United States', currency: 'USD', deliveryCharge: 3, deliveryEstimate: null, learningRegionId: usEurope.id },
    // The rest of the prototype's Category 1 (docs/prototype/shell-team-users.md). No prices yet:
    // a missing price means unavailable there until staff enter one.
    ...EUROPE.map(([code, name, currency]) => ({ code, name, currency, deliveryCharge: 0, deliveryEstimate: null, learningRegionId: usEurope.id })),
  ];
  for (const c of countries) {
    await prisma.country.upsert({ where: { code: c.code }, update: {}, create: c });
  }

  // Plans: memory allowance per child; null = unlimited. Prices per child, per country.
  const plans = [
    { tier: 'FREE', name: 'Free', memoryLimit: 5, inr: 0 },
    { tier: 'PLUS', name: 'Plus', memoryLimit: 100, inr: 199 },
    { tier: 'PREMIUM', name: 'Premium', memoryLimit: null, inr: 499 },
  ] as const;
  for (const p of plans) {
    await prisma.plan.upsert({ where: { tier: p.tier }, update: {}, create: { tier: p.tier, name: p.name, memoryLimit: p.memoryLimit } });
    // Free is always free and has no prices (OPEN_QUESTIONS Q33).
    if (p.tier === 'FREE') continue;
    await prisma.planPrice.upsert({
      where: { planTier_countryCode: { planTier: p.tier, countryCode: 'IN' } },
      update: {},
      create: { planTier: p.tier, countryCode: 'IN', amount: p.inr },
    });
  }

  // Default learning catalogue skeleton for Category 2: areas, levels, ages, bases, progression.
  for (const [i, name] of DEFAULT_DEVELOPMENT_AREAS.entries()) {
    // Matched by name, removed or not: re-running the seed never brings back an area staff removed.
    const area =
      (await prisma.developmentArea.findFirst({ where: { regionId: indiaSriLanka.id, name } })) ??
      (await prisma.developmentArea.create({ data: { regionId: indiaSriLanka.id, name, description: AREA_DESCRIPTIONS[name], position: i } }));
    if (area.removedAt) continue;
    for (const [n, score, mastered] of [[1, 0, 0], [2, 40, 1], [3, 100, 3]] as const) {
      const exists = await prisma.level.findFirst({ where: { areaId: area.id, categoryId: null, number: n } });
      if (!exists) {
        await prisma.level.create({
          data: { areaId: area.id, number: n, title: `Foundation ${n}`, requiredScore: score, requiredMastered: mastered },
        });
      }
    }
  }
  for (const age of [3, 4, 5]) {
    for (const regionId of [usEurope.id, indiaSriLanka.id]) {
      await prisma.ageGroup.upsert({ where: { regionId_age: { regionId, age } }, update: {}, create: { regionId, age } });
    }
  }
  await prisma.progressionSettings.upsert({ where: { regionId: indiaSriLanka.id }, update: {}, create: { regionId: indiaSriLanka.id } });
  for (const [position, name, fromPercent, startDifficulty] of [[1, 'Base 1', 0, 1], [2, 'Base 2', 34, 2], [3, 'Base 3', 67, 3]] as const) {
    await prisma.developmentBase.upsert({
      where: { regionId_position: { regionId: indiaSriLanka.id, position } },
      update: {},
      create: { regionId: indiaSriLanka.id, position, name, fromPercent, startDifficulty },
    });
  }

  // First assessment-rules revision per region (children keep the revision they started with).
  for (const region of [usEurope, indiaSriLanka]) {
    const exists = await prisma.assessmentConfig.findFirst({ where: { regionId: region.id } });
    if (exists) continue;
    const areas = await prisma.developmentArea.findMany({ where: { regionId: region.id, removedAt: null }, orderBy: { position: 'asc' } });
    await prisma.assessmentConfig.create({ data: { regionId: region.id, revision: 1, rules: defaultRules(areas) } });
  }

  // Library categories (stories and rhymes keep separate lists)
  for (const name of ['Nature', 'Kindness', 'Feelings', 'Adventure', 'Bedtime']) {
    for (const kind of ['STORY', 'RHYME'] as const) {
      await prisma.libraryCategory.upsert({ where: { kind_name: { kind, name } }, update: {}, create: { kind, name } });
    }
  }

  // Settings. The parent checklist's visible limit is per regional category
  // (`checklist.visibleLimit:{regionId}`, default 5 when not set), so nothing is seeded for it.
  const settings = [['community.regularVisibleLimit', 10]] as const;
  for (const [key, value] of settings) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  // App Content: the working draft only (sample wording; staff review and publish it).
  await seedAppContentDraft(prisma);

  console.log(`✔ Base data. Super Admin: ${email}${password ? '' : ' / ChangeMe123!'}`);
}
