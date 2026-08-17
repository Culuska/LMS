import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as not requiring authentication — everything else requires a valid JWT
 * by default, since JwtAuthGuard is registered globally. Use sparingly (login, health check). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
