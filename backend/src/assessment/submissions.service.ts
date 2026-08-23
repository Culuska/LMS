import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ResourceOwnerType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OfferingAccessService } from '../common/offering-access.service';
import { StorageService } from '../storage/storage.service';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { RequestUploadDto } from '../storage/dto/request-upload.dto';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/**
 * Student-facing assignment submissions — separate from MarksService, which is the
 * lecturer-facing side of the same AssessmentItem (entering a score). A Submission is
 * what the student hands in; a Mark is what the lecturer gives it back. Neither
 * requires the other to exist, matching how a paper assignment actually works (you can
 * grade a no-show as a zero without them having "submitted" anything).
 */
@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offeringAccess: OfferingAccessService,
    private readonly storage: StorageService,
  ) {}

  private async requireStudent(user: AuthenticatedUser) {
    const student = await this.prisma.student.findUnique({
      where: { userId: user.id },
    });
    if (!student) {
      throw new ForbiddenException('Only students can submit assignments');
    }
    return student;
  }

  private async requireItem(assessmentItemId: string) {
    const item = await this.prisma.assessmentItem.findUnique({
      where: { id: assessmentItemId },
    });
    if (!item) {
      throw new NotFoundException(
        `Assessment item ${assessmentItemId} not found`,
      );
    }
    return item;
  }

  async submit(
    assessmentItemId: string,
    dto: SubmitAssignmentDto,
    user: AuthenticatedUser,
  ) {
    const [item, student] = await Promise.all([
      this.requireItem(assessmentItemId),
      this.requireStudent(user),
    ]);

    const registration = await this.prisma.courseRegistration.findFirst({
      where: {
        studentId: student.id,
        courseOfferingId: item.courseOfferingId,
      },
    });
    if (!registration) {
      throw new BadRequestException(
        'You are not registered for the course this assignment belongs to',
      );
    }

    const isLate = item.dueAt ? new Date() > item.dueAt : false;

    return this.prisma.submission.upsert({
      where: {
        assessmentItemId_studentId: {
          assessmentItemId,
          studentId: student.id,
        },
      },
      // Resubmitting before the deadline should clear a stale late flag; resubmitting
      // after it should still count as late even if the first attempt was on time.
      update: { content: dto.content, isLate, submittedAt: new Date() },
      create: {
        assessmentItemId,
        studentId: student.id,
        content: dto.content,
        isLate,
      },
      include: { resources: true },
    });
  }

  /** Attaches a file to the caller's own submission for this item, creating an empty
   * submission first if one doesn't exist yet — so "attach a file" alone is a valid way
   * to submit, without requiring text content first. */
  async attachResource(
    assessmentItemId: string,
    dto: RequestUploadDto,
    user: AuthenticatedUser,
  ) {
    const student = await this.requireStudent(user);
    let submission = await this.prisma.submission.findUnique({
      where: {
        assessmentItemId_studentId: { assessmentItemId, studentId: student.id },
      },
    });
    if (!submission) {
      submission = await this.submit(assessmentItemId, {}, user);
    }

    const storageKey = this.storage.buildStorageKey(dto.fileName);
    const resource = await this.prisma.resource.create({
      data: {
        ownerType: ResourceOwnerType.SUBMISSION,
        submissionId: submission.id,
        fileName: dto.fileName,
        contentType: dto.contentType,
        sizeBytes: dto.sizeBytes,
        storageKey,
        uploadedById: user.id,
      },
    });
    const uploadUrl = await this.storage.createUploadUrl(
      storageKey,
      dto.contentType,
    );
    return { resource, uploadUrl };
  }

  /** Lecturer/admin view of every student's submission for grading. */
  async findAllForItem(assessmentItemId: string, user: AuthenticatedUser) {
    const item = await this.requireItem(assessmentItemId);
    await this.offeringAccess.assertCanManageOffering(
      item.courseOfferingId,
      user,
    );
    return this.prisma.submission.findMany({
      where: { assessmentItemId },
      include: {
        resources: true,
        student: { include: { user: true } },
        mark: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /** The caller's own submission status — null if they haven't submitted anything yet,
   * which the frontend renders as "not submitted" rather than an error. */
  async findMine(assessmentItemId: string, user: AuthenticatedUser) {
    const student = await this.requireStudent(user);
    return this.prisma.submission.findUnique({
      where: {
        assessmentItemId_studentId: { assessmentItemId, studentId: student.id },
      },
      include: { resources: true, mark: true },
    });
  }
}
