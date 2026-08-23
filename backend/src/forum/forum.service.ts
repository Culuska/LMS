import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateForumPostDto } from './dto/create-forum-post.dto';
import { CreateForumReplyDto } from './dto/create-forum-reply.dto';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

export interface AuthorInfo {
  firstName: string;
  lastName: string;
}

/**
 * A simple per-course discussion forum: one flat level of replies under each post, no
 * likes/reactions/nesting — explicitly not social-media-style, per the LMS
 * simplification spec. Read access is open to any authenticated user, matching the rest
 * of this codebase's course-scoped content (see CourseContentService); write access
 * (posting/replying) is any STUDENT or LECTURER/staff, gated at the controller.
 *
 * `authorId` is a plain field, not a Prisma relation (same convention as
 * Announcement.authorId), so author names are attached here via a manual batch lookup
 * rather than an `include`.
 */
@Injectable()
export class ForumService {
  constructor(private readonly prisma: PrismaService) {}

  private async attachAuthors<T extends { authorId: string }>(
    rows: T[],
  ): Promise<(T & { author: AuthorInfo | null })[]> {
    const authorIds = [...new Set(rows.map((r) => r.authorId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const byId = new Map(
      users.map((u) => [
        u.id,
        { firstName: u.firstName, lastName: u.lastName },
      ]),
    );
    return rows.map((r) => ({ ...r, author: byId.get(r.authorId) ?? null }));
  }

  async findAllForOffering(offeringId: string) {
    const posts = await this.prisma.forumPost.findMany({
      where: { courseOfferingId: offeringId },
      orderBy: { createdAt: 'desc' },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
    });

    const postsWithAuthors = await this.attachAuthors(posts);
    return Promise.all(
      postsWithAuthors.map(async (post) => ({
        ...post,
        replies: await this.attachAuthors(post.replies),
      })),
    );
  }

  async createPost(
    offeringId: string,
    dto: CreateForumPostDto,
    user: AuthenticatedUser,
  ) {
    const offering = await this.prisma.courseOffering.findUnique({
      where: { id: offeringId },
    });
    if (!offering) {
      throw new NotFoundException(`Course offering ${offeringId} not found`);
    }

    const post = await this.prisma.forumPost.create({
      data: {
        courseOfferingId: offeringId,
        authorId: user.id,
        title: dto.title,
        body: dto.body,
      },
    });
    return {
      ...post,
      author: { firstName: user.firstName, lastName: user.lastName },
      replies: [],
    };
  }

  async createReply(
    postId: string,
    dto: CreateForumReplyDto,
    user: AuthenticatedUser,
  ) {
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException(`Forum post ${postId} not found`);
    }

    const reply = await this.prisma.forumReply.create({
      data: { postId, authorId: user.id, body: dto.body },
    });
    return {
      ...reply,
      author: { firstName: user.firstName, lastName: user.lastName },
    };
  }
}
