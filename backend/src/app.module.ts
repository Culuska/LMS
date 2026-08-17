import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AcademicStructureModule } from './academic-structure/academic-structure.module';
import { AcademicCalendarModule } from './academic-calendar/academic-calendar.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AssessmentModule } from './assessment/assessment.module';
import { AuditModule } from './audit/audit.module';
import { EmailModule } from './email/email.module';
import { LmsModule } from './lms/lms.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdmissionsModule } from './admissions/admissions.module';
import { AcademicRecordsModule } from './academic-records/academic-records.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    EmailModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    AcademicStructureModule,
    AcademicCalendarModule,
    CoursesModule,
    EnrollmentModule,
    AttendanceModule,
    AssessmentModule,
    LmsModule,
    AdmissionsModule,
    AcademicRecordsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Every route requires a valid JWT unless marked @Public() — see
    // docs/00-requirements-audit.md §12 (authorization: Critical).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Then, if the route is @Roles(...)-annotated, the caller must hold one of them.
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
