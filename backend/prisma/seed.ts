import { PrismaClient, RoleName } from '@prisma/client';
import { DEFAULT_GRADE_BANDS } from '../src/grading/grading.constants';
import { hashPassword } from '../src/auth/password.util';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding grade bands (docs/04-grading-and-academic-policy.md §1)...');
  for (const band of DEFAULT_GRADE_BANDS) {
    await prisma.gradeBand.upsert({
      where: { letter: band.letter },
      update: band,
      create: band,
    });
  }

  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@university.local';
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!';

  console.log(`Seeding initial Super Admin account (${superAdminEmail})...`);
  const passwordHash = await hashPassword(superAdminPassword);

  const user = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      mustChangePassword: true,
    },
  });

  // Not an upsert: Postgres/Prisma compound unique constraints don't reliably match
  // rows containing NULL columns (facultyId/departmentId are null for a university-wide
  // role like SUPER_ADMIN), so we check-then-create instead.
  const existingSuperAdminRole = await prisma.userRole.findFirst({
    where: { userId: user.id, role: RoleName.SUPER_ADMIN, facultyId: null, departmentId: null },
  });
  if (!existingSuperAdminRole) {
    await prisma.userRole.create({
      data: { userId: user.id, role: RoleName.SUPER_ADMIN },
    });
  }

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
