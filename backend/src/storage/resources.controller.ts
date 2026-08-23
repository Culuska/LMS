import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly service: ResourcesService) {}

  @Get(':id/download')
  getDownloadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getDownloadUrl(id, user);
  }
}
