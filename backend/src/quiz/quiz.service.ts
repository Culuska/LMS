import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssessmentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OfferingAccessService } from '../common/offering-access.service';
import { CreateQuizQuestionDto } from './dto/create-quiz-question.dto';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/**
 * Multiple-choice quizzes, auto-scored on submission — the QUIZ side of AssessmentItem
 * (see SubmissionsService for the parallel ASSIGNMENT side). One attempt per student per
 * quiz; no partial credit beyond "this question's choice was correct or it wasn't".
 */
@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offeringAccess: OfferingAccessService,
  ) {}

  private async requireQuizItem(assessmentItemId: string) {
    const item = await this.prisma.assessmentItem.findUnique({
      where: { id: assessmentItemId },
    });
    if (!item) {
      throw new NotFoundException(
        `Assessment item ${assessmentItemId} not found`,
      );
    }
    if (item.type !== AssessmentType.QUIZ) {
      throw new BadRequestException(
        `Assessment item ${assessmentItemId} is not a quiz`,
      );
    }
    return item;
  }

  private async requireStudent(user: AuthenticatedUser) {
    const student = await this.prisma.student.findUnique({
      where: { userId: user.id },
    });
    if (!student) {
      throw new ForbiddenException('Only students can take quizzes');
    }
    return student;
  }

  private async canManageOffering(
    offeringId: string,
    user: AuthenticatedUser,
  ): Promise<boolean> {
    try {
      await this.offeringAccess.assertCanManageOffering(offeringId, user);
      return true;
    } catch {
      return false;
    }
  }

  /** Lecturers/staff see which choice is correct; students never do — not before they've
   * submitted, and not after either, to keep this a "did I get it right" score rather than
   * an answer key. */
  async findQuestionsForItem(
    assessmentItemId: string,
    user: AuthenticatedUser,
  ) {
    const item = await this.requireQuizItem(assessmentItemId);
    const canManage = await this.canManageOffering(item.courseOfferingId, user);
    const questions = await this.prisma.quizQuestion.findMany({
      where: { assessmentItemId },
      orderBy: { orderIndex: 'asc' },
      include: { choices: { orderBy: { orderIndex: 'asc' } } },
    });
    if (canManage) return questions;
    return questions.map((q) => ({
      ...q,
      choices: q.choices.map((c) => ({
        id: c.id,
        questionId: c.questionId,
        text: c.text,
        orderIndex: c.orderIndex,
      })),
    }));
  }

  async createQuestion(
    assessmentItemId: string,
    dto: CreateQuizQuestionDto,
    user: AuthenticatedUser,
  ) {
    const item = await this.requireQuizItem(assessmentItemId);
    await this.offeringAccess.assertCanManageOffering(
      item.courseOfferingId,
      user,
    );

    const correctCount = dto.choices.filter((c) => c.isCorrect).length;
    if (correctCount !== 1) {
      throw new BadRequestException(
        'Exactly one choice must be marked correct',
      );
    }

    const existingCount = await this.prisma.quizQuestion.count({
      where: { assessmentItemId },
    });
    return this.prisma.quizQuestion.create({
      data: {
        assessmentItemId,
        text: dto.text,
        orderIndex: existingCount,
        choices: {
          create: dto.choices.map((c, i) => ({
            text: c.text,
            isCorrect: c.isCorrect,
            orderIndex: i,
          })),
        },
      },
      include: { choices: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async removeQuestion(questionId: string, user: AuthenticatedUser) {
    const question = await this.prisma.quizQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      throw new NotFoundException(`Quiz question ${questionId} not found`);
    }
    const item = await this.prisma.assessmentItem.findUniqueOrThrow({
      where: { id: question.assessmentItemId },
    });
    await this.offeringAccess.assertCanManageOffering(
      item.courseOfferingId,
      user,
    );
    await this.prisma.quizQuestion.delete({ where: { id: questionId } });
  }

  /** The caller's own attempt — null if they haven't submitted yet, rendered by the
   * frontend as "not taken" rather than an error (same convention as
   * SubmissionsService.findMine). */
  async findMyAttempt(assessmentItemId: string, user: AuthenticatedUser) {
    const student = await this.requireStudent(user);
    return this.prisma.quizAttempt.findUnique({
      where: {
        assessmentItemId_studentId: { assessmentItemId, studentId: student.id },
      },
      include: { answers: true },
    });
  }

  /** Lecturer/admin view of every student's attempt, for the gradebook. */
  async findAllAttemptsForItem(
    assessmentItemId: string,
    user: AuthenticatedUser,
  ) {
    const item = await this.requireQuizItem(assessmentItemId);
    await this.offeringAccess.assertCanManageOffering(
      item.courseOfferingId,
      user,
    );
    return this.prisma.quizAttempt.findMany({
      where: { assessmentItemId },
      include: { student: { include: { user: true } } },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Auto-graded, one-shot submission: score = maxMarks × (correct answers / total
   * questions). A question left unanswered just doesn't count as correct — no penalty
   * beyond that. Also best-effort writes the equivalent Mark row so this quiz shows up
   * in the regular gradebook/CourseResult pipeline alongside manually-entered marks; if
   * that write isn't currently possible (e.g. grading already locked), the quiz score
   * itself is still recorded and the failure is swallowed rather than blocking the
   * student's submission.
   */
  async submitAttempt(
    assessmentItemId: string,
    dto: SubmitQuizAttemptDto,
    user: AuthenticatedUser,
  ) {
    const item = await this.requireQuizItem(assessmentItemId);
    const student = await this.requireStudent(user);

    const registration = await this.prisma.courseRegistration.findFirst({
      where: { studentId: student.id, courseOfferingId: item.courseOfferingId },
    });
    if (!registration) {
      throw new BadRequestException(
        'You are not registered for the course this quiz belongs to',
      );
    }

    const existing = await this.prisma.quizAttempt.findUnique({
      where: {
        assessmentItemId_studentId: { assessmentItemId, studentId: student.id },
      },
    });
    if (existing?.submittedAt) {
      throw new BadRequestException('You have already submitted this quiz');
    }

    const questions = await this.prisma.quizQuestion.findMany({
      where: { assessmentItemId },
      include: { choices: true },
    });

    // Last answer wins per question; anything referencing a question/choice outside
    // this quiz is silently ignored rather than trusted from the client.
    const answerByQuestion = new Map(
      dto.answers.map((a) => [a.questionId, a.choiceId]),
    );
    let correct = 0;
    const answersToCreate: { questionId: string; choiceId: string | null }[] =
      [];
    for (const q of questions) {
      const chosenChoiceId = answerByQuestion.get(q.id) ?? null;
      const chosenChoice = chosenChoiceId
        ? q.choices.find((c) => c.id === chosenChoiceId)
        : undefined;
      if (chosenChoice?.isCorrect) correct += 1;
      answersToCreate.push({
        questionId: q.id,
        choiceId: chosenChoice ? chosenChoice.id : null,
      });
    }

    const total = questions.length;
    const maxMarks = Number(item.maxMarks);
    const score =
      total > 0 ? Math.round((maxMarks * correct * 100) / total) / 100 : 0;
    const isLate = item.dueAt ? new Date() > item.dueAt : false;
    const now = new Date();

    const attempt = await this.prisma.quizAttempt.upsert({
      where: {
        assessmentItemId_studentId: { assessmentItemId, studentId: student.id },
      },
      create: {
        assessmentItemId,
        studentId: student.id,
        submittedAt: now,
        isLate,
        score,
        answers: { create: answersToCreate },
      },
      update: {
        submittedAt: now,
        isLate,
        score,
        answers: { deleteMany: {}, create: answersToCreate },
      },
      include: { answers: true },
    });

    await this.tryRecordMark(assessmentItemId, student.id, score, user.id);

    return { ...attempt, totalQuestions: total, correctCount: correct };
  }

  private async tryRecordMark(
    assessmentItemId: string,
    studentId: string,
    score: number,
    enteredById: string,
  ) {
    try {
      const registration = await this.prisma.courseRegistration.findFirst({
        where: {
          studentId,
          courseOfferingId: (
            await this.prisma.assessmentItem.findUniqueOrThrow({
              where: { id: assessmentItemId },
            })
          ).courseOfferingId,
        },
        include: { courseResult: true },
      });
      if (!registration || registration.status !== 'REGISTERED') return;
      if (
        registration.courseResult &&
        registration.courseResult.status !== 'DRAFT'
      )
        return;

      await this.prisma.mark.upsert({
        where: { assessmentItemId_studentId: { assessmentItemId, studentId } },
        update: { score, enteredById, enteredAt: new Date() },
        create: { assessmentItemId, studentId, score, enteredById },
      });
    } catch {
      // Best-effort — the quiz attempt itself is already saved regardless.
    }
  }
}
