import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';

@Module({
  controllers: [ResourcesController],
  providers: [StorageService, ResourcesService],
  exports: [StorageService],
})
export class StorageModule {}
