import { PrismaClient } from '@prisma/client';
import { applyBaselineSeed } from '../src/prisma/baseline-seed';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding grade bands (docs/04-grading-and-academic-policy.md §1) and Super Admin...');
  await applyBaselineSeed(prisma);

  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@university.local';
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!';
  console.log('Seed complete.');
  console.log(`  Super Admin login: ${superAdminEmail} / ${superAdminPassword}`);
  console.log('  ⚠ mustChangePassword is set — change this before any real use.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
