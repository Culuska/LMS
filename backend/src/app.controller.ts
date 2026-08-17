import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Unauthenticated liveness check — used by deployment/monitoring, not by end users. */
  @Public()
  @Get('health')
  health() {
    return this.appService.health();
  }
}
