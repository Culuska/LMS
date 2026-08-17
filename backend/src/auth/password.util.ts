import * as bcrypt from 'bcrypt';

// Cost factor 12 is a reasonable balance of security vs. login latency for 2026
// hardware — see docs/00-requirements-audit.md §12 (password hashing: Critical).
const SALT_ROUNDS = 12;

export function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

export function comparePassword(
  plainTextPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, passwordHash);
}
