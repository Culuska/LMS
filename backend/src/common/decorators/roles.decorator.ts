import { SetMetadata } from '@nestjs/common';
import { RoleName } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Marks a route as requiring the caller to hold at least one of the given roles.
 * This is the coarse, "can this endpoint be hit at all" check — see RolesGuard.
 * Resource-level scoping (e.g. "only the lecturer assigned to THIS course") is
 * enforced separately inside the relevant service, never left to this decorator
 * alone — see docs/00-requirements-audit.md §8 rule 4.
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
