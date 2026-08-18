import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { applyBaselineSeed } from './prisma/baseline-seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Ensures grade bands + a Super Admin account exist before the app starts accepting
  // traffic — see baseline-seed.ts for why this runs on every boot rather than as a
  // separate one-off step (in short: some hosting platforms don't give free-tier
  // services a shell to run a one-off command in, and a fresh database with no way to
  // log in is a dead end either way). Idempotent; a failure here is logged, not fatal —
  // an already-seeded production database should keep serving even if this one check
  // has a transient hiccup.
  try {
    await applyBaselineSeed(app.get(PrismaService));
  } catch (err) {
    new Logger('BaselineSeed').error(
      'Baseline seed failed on boot',
      err instanceof Error ? err.stack : err,
    );
  }

  // Reject unknown/malformed request bodies rather than silently accepting them —
  // see docs/00-requirements-audit.md §12 (input validation).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Wide open (reflects any origin) when CORS_ORIGIN isn't set — matches every prior
  // environment this ran in (local dev, this project's own smoke tests). Once deployed
  // behind a real domain, set CORS_ORIGIN to the frontend's exact origin(s) — comma-
  // separated for more than one (e.g. a www + apex pair) — so the API only answers
  // browser requests from the site that's actually supposed to call it.
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
