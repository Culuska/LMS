import { createHash, randomBytes } from 'crypto';

/** Raw token goes out in the email/URL and is never stored; only its hash is persisted,
 * so a database leak alone can't be used to reset anyone's password. SHA-256 (not bcrypt)
 * is appropriate here — the token itself is 256 bits of randomness, not a human-chosen
 * password, so it doesn't need slow/salted hashing to resist guessing. */
export function generateResetToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}

export function hashResetToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
