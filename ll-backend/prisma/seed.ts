/**
 * Seed entry point, run by Prisma (`prisma db seed`, and automatically after `prisma migrate reset`).
 *
 *   npm run prisma:seed        → base data only (safe for any environment)
 *   npm run prisma:seed:demo   → base data + development demo data
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedBase } from './seeds/base';
import { seedDemo } from './seeds/demo';

const prisma = new PrismaClient();
const withDemo = process.argv.includes('--demo');

async function main() {
  await seedBase(prisma);
  if (withDemo) await seedDemo(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
