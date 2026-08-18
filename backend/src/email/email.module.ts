import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConsoleEmailService,
  EmailService,
  ResendEmailService,
} from './email.service';

// ConfigService is available here without importing ConfigModule — AppModule registers
// it via ConfigModule.forRoot({ isGlobal: true }).
@Global()
@Module({
  providers: [
    {
      provide: EmailService,
      inject: [ConfigService],
      // Auto-selects Resend once RESEND_API_KEY is configured (production/staging);
      // otherwise falls back to the console stub so local dev needs no email
      // credentials at all. See email.service.ts for both implementations.
      useFactory: (config: ConfigService): EmailService =>
        config.get<string>('RESEND_API_KEY')
          ? new ResendEmailService(config)
          : new ConsoleEmailService(),
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
