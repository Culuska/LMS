import { Injectable, Logger } from '@nestjs/common';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

/**
 * Abstract so a real provider (SES/Postmark/SendGrid — see
 * docs/00-requirements-audit.md §20, "no provider chosen yet") can be dropped in later by
 * changing exactly one line in EmailModule (`useClass: ConsoleEmailService` ->
 * `useClass: SesEmailService` or similar) — nothing that calls EmailService needs to change.
 */
export abstract class EmailService {
  abstract send(message: EmailMessage): Promise<void>;
}

/**
 * V1 stopgap: logs the message instead of sending it. This is NOT a production email
 * path — every call site that depends on a user actually receiving mail (password reset,
 * temporary-password delivery) is unusable for real users until this is replaced. Flagged
 * here rather than silently pretending email works.
 */
@Injectable()
export class ConsoleEmailService extends EmailService {
  private readonly logger = new Logger(
    'Email (console stub — no real provider configured)',
  );

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(
      `To: ${message.to}\nSubject: ${message.subject}\n${message.body}`,
    );
    return Promise.resolve();
  }
}
