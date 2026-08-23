import { Module } from '@nestjs/common';
import { CourseContentController } from './course-content.controller';
import { CourseContentService } from './course-content.service';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { OfferingAccessService } from '../common/offering-access.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [CourseContentController, AnnouncementsController],
  providers: [
    CourseContentService,
    AnnouncementsService,
    OfferingAccessService,
  ],
  exports: [AnnouncementsService],
})
export class LmsModule {}
