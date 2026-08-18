import { Logger } from '@nestjs/common';
import { PrismaClient, RoleName } from '@prisma/client';
import { DEFAULT_GRADE_BANDS } from '../grading/grading.constants';
import { hashPassword } from '../auth/password.util';

const logger = new Logger('BaselineSeed');

/**
 * The minimum data the app needs to be usable at all: grade bands, and one Super Admin
 * account to log in and set everything else up. Entirely idempotent (upsert/check-then-
 * create throughout — see prisma/seed.ts, which this logic is shared with) so it's safe
 * to call on every boot, not just once. That matters in practice: a hosting platform's
 * free-tier database can get recreated (e.g. Render's free Postgres expires after 30
 * days), and a fresh database with no way to log in is a dead end. Running this at
 * startup means the app never boots into a state nobody can administer.
 */
export async function applyBaselineSeed(prisma: PrismaClient): Promise<void> {
  for (const band of DEFAULT_GRADE_BANDS) {
    await prisma.gradeBand.upsert({
      where: { letter: band.letter },
      update: band,
      create: band,
    });
  }

  const superAdminEmail =
    process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@university.local';
  const superAdminPassword =
    process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!';
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
    where: {
      userId: user.id,
      role: RoleName.SUPER_ADMIN,
      facultyId: null,
      departmentId: null,
    },
  });
  if (!existingSuperAdminRole) {
    await prisma.userRole.create({
      data: { userId: user.id, role: RoleName.SUPER_ADMIN },
    });
    logger.log(`Super Admin account ensured (${superAdminEmail}).`);
  }
}
