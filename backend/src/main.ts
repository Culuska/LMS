import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
