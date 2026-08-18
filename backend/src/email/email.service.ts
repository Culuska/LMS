import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

/**
 * Abstract so the real provider can be swapped by changing exactly one line in
 * EmailModule (`useClass: ConsoleEmailService` <-> `useClass: ResendEmailService`) —
 * nothing that calls EmailService needs to change.
 */
export abstract class EmailService {
  abstract send(message: EmailMessage): Promise<void>;
}

/**
 * Local-dev stopgap: logs the message instead of sending it. EmailModule falls back to
 * this automatically whenever RESEND_API_KEY isn't set, so `npm run start:dev` never
 * needs real credentials — but every call site that depends on a user actually
 * receiving mail (password reset, temporary-password delivery) is unusable for real
 * users while this is active. Flagged here rather than silently pretending email works.
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

/**
 * Real delivery via Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email)
 * — chosen for the free tier (3,000 emails/month, plenty for a V1 pilot) and a plain
 * REST endpoint that doesn't need an SDK dependency. Selected automatically by
 * EmailModule when RESEND_API_KEY is present; see backend/README.md's deployment
 * section for how to obtain a key and verify a sending domain.
 */
@Injectable()
export class ResendEmailService extends EmailService {
  private readonly logger = new Logger('Email (Resend)');
  private readonly apiKey: string;
  private readonly fromAddress: string;

  constructor(config: ConfigService) {
    super();
    // Non-null assertions are safe here: EmailModule only constructs this class when
    // RESEND_API_KEY is present, and EMAIL_FROM_ADDRESS has a hard-coded fallback.
    this.apiKey = config.get<string>('RESEND_API_KEY')!;
    this.fromAddress =
      config.get<string>('EMAIL_FROM_ADDRESS') ??
      'BaroTech <onboarding@resend.dev>';
  }

  async send(message: EmailMessage): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: [message.to],
        subject: message.subject,
        text: message.body,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      // Deliberately does not throw: a failed password-reset email shouldn't 500 the
      // request that triggered it (and would leak account-existence info via timing/
      // error differences either way) — it's logged so the failure is at least visible
      // in production logs instead of silently vanishing.
      this.logger.error(
        `Failed to send to ${message.to} (${response.status}): ${detail}`,
      );
    }
  }
}
