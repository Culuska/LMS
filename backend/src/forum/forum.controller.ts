import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { ForumService } from './forum.service';
import { CreateForumPostDto } from './dto/create-forum-post.dto';
import { CreateForumReplyDto } from './dto/create-forum-reply.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

const POSTING_ROLES: RoleName[] = [
  RoleName.STUDENT,
  RoleName.LECTURER,
  RoleName.SUPER_ADMIN,
  RoleName.REGISTRAR,
];

@Controller()
export class ForumController {
  constructor(private readonly service: ForumService) {}

  @Get('course-offerings/:offeringId/forum-posts')
  findAllForOffering(@Param('offeringId', ParseUUIDPipe) offeringId: string) {
    return this.service.findAllForOffering(offeringId);
  }

  @Roles(...POSTING_ROLES)
  @Post('course-offerings/:offeringId/forum-posts')
  createPost(
    @Param('offeringId', ParseUUIDPipe) offeringId: string,
    @Body() dto: CreateForumPostDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createPost(offeringId, dto, user);
  }

  @Roles(...POSTING_ROLES)
  @Post('forum-posts/:postId/replies')
  createReply(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: CreateForumReplyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createReply(postId, dto, user);
  }
}
