# Requirements Audit & Gap Analysis
**University Management System + LMS — v0.1 (Draft for lecturer review)**
**Status:** Planning phase. No code has been written. This document is the shared source of truth for all future work.

---

## 0. How to read this document

This is the output of the audit requested before development starts. It does **not** accept the originally proposed feature list as-is. For every area it identifies what's missing, what's extra, what should change, and what's still an open question that only the university (you) can answer — those are collected in `03-open-questions-and-decisions.md`, not guessed here.

---

## 1. Executive summary

The proposed system is a reasonable starting sketch of a combined **Student Information System (SIS) + LMS**, but as written it has four structural problems:

1. **No registrar/records-office function.** Admissions, official academic records, transcripts, and graduation clearance have no clear owner among the six proposed roles. This is normally the backbone of a university system.
2. **No result-approval workflow.** "Grading" and "result publication" are listed as if a lecturer's entered mark becomes the official record. In every real university, marks go through at least one approval step before they're visible to students. This is missing entirely and is a *data-integrity risk*, not a nice-to-have.
3. **The LMS and SIS sides are described as separate feature lists but are actually one integrated data model** (a course *is* a course whether you're taking attendance in it or uploading a lecture PDF to it). The audit below treats them as one system with two faces, which changes the database design.
4. **Several "advanced" ideas (QR/biometric attendance, native mobile app, SMS, payment gateways) are appropriate for Version 2/3, not V1**, and including them now would slow down getting a working, trustworthy core system in front of real students and lecturers.

The rest of this document works through the system area by area.

---

## 2. A. Missing features (must be added)

| # | Feature | What it is | Why needed | Who needs it | Essential/Optional | Version |
|---|---|---|---|---|---|---|
| A1 | **Admissions / applicant management** | Pre-enrollment pipeline: application, document upload, review, offer, acceptance, conversion to student record | Without this, "student registration" has no defined starting point — someone must decide who *becomes* a student | Admissions Officer, Applicant, Registrar | Essential | V1 (can be simple; V2 for online application portal) |
| A2 | **Result approval workflow** | Marks entered by a lecturer are "provisional" until a Department/Exam Officer approves and locks them; only then are they published to students | Prevents unreviewed or erroneous marks reaching students/transcripts; matches how every accredited university actually operates | Lecturer, HoD, Exam Officer, Student | Essential | V1 |
| A3 | **Academic records/transcript office function** | Central, authoritative, versioned record of a student's full academic history, independent of any single course or department | Transcripts must be tamper-evident and outlive any course/lecturer being deleted or changed | Registrar, Student, external verifiers | Essential | V1 (issuance can be manual/PDF in V1, self-service portal in V2) |
| A4 | **Prerequisites / co-requisites enforcement** | Course registration must check a student has passed/is taking the required prior course | Prevents invalid registrations (e.g. registering for a 300-level course without the 200-level prerequisite) | Student, Registrar, Advisor | Essential | V1 |
| A5 | **Academic advising** | Record of an assigned advisor per student, advisor's view of advisee progress, advisor sign-off on registration (if your university requires it) | Common requirement; without it there's no one accountable for guiding a student's course selection | Academic Advisor, Student | Essential (module) — *ask if advisor sign-off is required at your university* | V1 basic, V2 richer |
| A6 | **Academic probation / good-standing status tracking** | System tracks whether a student is in good standing, on probation, or subject to dismissal based on GPA/attendance rules | Needed to correctly gate registration, graduation, and reporting | Registrar, Advisor, Dean | Essential | V1 (rules TBD by you — see open questions) |
| A7 | **Graduation / clearance workflow** | Checklist-driven process: credits completed, fees cleared (if tracked), library clearance (if tracked), final GPA check, before a student is marked "graduated" and a transcript/certificate is issued | Otherwise "graduation" is just a status flag with no verification behind it | Registrar, Dean, Student | Essential | V1 basic, V2 automated checklist |
| A8 | **Course catalog / curriculum versioning** | A definitive catalog of courses offered per program per academic year, including credit value, prerequisites, and which curriculum "version" a given student's cohort follows | Curricula change over time; a student admitted in 2023 may follow different requirements than one admitted in 2026. Without this, graduation-requirement checking is impossible | Registrar, Dept Admin, Student | Essential | V1 |
| A9 | **Timetable/scheduling with room & conflict checking** | Structured timetable entity (course + section + lecturer + room + time slot) with clash detection | The proposed list mentions "teaching schedules" and "timetables" but not conflict prevention — double-booking a lecturer or room is a common real failure | Registrar, Lecturer, Student | Essential | V1 (manual entry + conflict *warnings*; auto-generation is V2/V3) |
| A10 | **Password reset / account recovery, email verification** | Standard self-service account recovery | Baseline security requirement; not listed at all in the original proposal | All users | Essential | V1 |
| A11 | **Audit logging (who changed what, when)** | Immutable log of sensitive actions: grade changes, result publication, user role changes, deletions | Required for both security and academic-integrity disputes ("who changed this grade and when?") | Super Admin, Auditor | Essential | V1 |
| A12 | **Withdrawal / leave-of-absence handling** | A student can withdraw from a single course (with a "W" grade, not silently deleted) or take a leave of absence from the university entirely | The proposed academic-status list doesn't distinguish these; without it, withdrawn students either vanish from records or count as failures | Registrar, Student | Essential | V1 |
| A13 | **Late/incomplete result handling ("Incomplete", "I" grade)** | A course result can be temporarily marked incomplete pending missing coursework, with a deadline | Common real scenario (medical emergency, missing project); GPA calculation must know how to treat it | Lecturer, Registrar | Essential | V1 |
| A14 | **Data export / self-service transcript & document requests** | Student can request an official transcript or enrollment letter without emailing the registrar | Reduces admin load; expected in any modern system | Student, Registrar | Optional for V1, recommended V2 | V2 |
| A15 | **Fee/finance status flag (not full billing)** | A simple "fees cleared / outstanding" flag that can gate registration or exam entry, *if* your university links these | Many universities block exam entry or registration on unpaid fees. Full billing/accounting is out of scope, but the *status flag* and the gate it enforces belong in this system | Finance Officer (light role), Registrar | Essential *if* your university enforces this — otherwise skip | V1 flag / V2+ integration with real finance system |
| A16 | **Library status flag (optional)** | Similar lightweight flag — "no outstanding library holds" — used only at graduation clearance | Same reasoning as A15, smaller scope | Librarian (light role), Registrar | Optional | V2 |
| A17 | **Data retention & anonymization policy enforcement** | Rules for how long inactive-student/lecturer accounts and their data are retained, and what happens on deletion | Required by essentially every data-protection framework; also protects academic-record integrity when a user account is removed | Super Admin | Essential | V1 policy, V1/V2 tooling |
| A18 | **Terms of service / consent tracking** | Record of when a user accepted data-handling terms (relevant if under GDPR-like rules) | Compliance requirement once jurisdiction is confirmed | All users | Depends on jurisdiction — open question | V1 if required |

---

## 3. B. Unnecessary / premature features in the original proposal

| # | Feature (as proposed) | Why it's premature or unnecessary now | Recommendation |
|---|---|---|---|
| B1 | **Two-factor authentication for all users** | Valuable, but mandatory 2FA for every student on day one adds support burden (lost devices, lockouts) before the core system is proven | Ship with 2FA *available and required for admin/lecturer roles handling grades*, optional for students in V1, consider mandatory for all in V2 |
| B2 | **QR / biometric / mobile attendance** | Adds hardware/device dependency and complexity before you know if manual/roll-call attendance actually causes problems | Start with lecturer-marks-attendance-in-system (roll call from a class list) in V1. Revisit QR check-in for V2 if manual entry proves too slow in large classes |
| B3 | **Native mobile app** | Doubles the frontend build (two codebases) before the web product is validated | Build one responsive web app that works well on phones (see §16). Reassess a native app only if usage data shows a real need (e.g. push notifications matter more than expected) |
| B4 | **SMS notifications** | Costs money per message, needs a telecom provider integration, and is rarely essential — most universities communicate by email + in-system notification | Postpone to V2/V3, and only for high-value alerts (exam reminders) if the university decides email isn't reaching students reliably |
| B5 | **Payment gateway integration** | Full payment processing is a compliance-heavy sub-project (PCI-DSS) on its own | Out of scope for this system. Use the lightweight "fees cleared" flag (A15) set manually or by import from the university's existing finance system, not a payment processor built into this app |
| B6 | **Video conferencing built in** | Reinventing Zoom/Teams/Meet is not a good use of engineering time | Store a *link* to an external meeting (Zoom/Teams/Meet) on the class session — do not build conferencing |
| B7 | **"Other learning materials" as an open-ended file type list** | Vague; every extra file type is a security-review surface (upload validation) | Define a fixed allow-list: PDF, DOCX, PPTX, XLSX, common image formats, MP4 (or better, external video links — see §11) |
| B8 | **Separate "Course pages" and "Course syllabus" and "Course topics/modules" listed as distinct top-level features** | These are all facets of one `Course` + `CourseContent` entity, not separate modules | Merge into a single course-content structure (see database model, §4) |
| B9 | **Discussion forums as full-blown generic forum software** | A full forum system (threads, subforums, moderation queues) is a lot of surface area for uncertain payoff in V1 | V1: a simple per-course Q&A/discussion thread attached to announcements. Evaluate a richer forum for V2 based on actual usage |
| B10 | **Faculty Administrator and Department Administrator as fully separate role types with their own dashboards from day one** | Reasonable long-term, but for a university with a small number of faculties, this may be over-structured for V1 depending on your actual org size | Confirmed as needed once you answer the scale question in §25 — kept in the role model either way since it's cheap to include, but dashboard depth for these two roles can start shallow |

**Nothing above is removed outright** — per your instructions, difficulty is never the reason to cut something. Each is either resequenced to a later version or narrowed in scope for V1.

---

## 4. C. User roles

### Roles confirmed as necessary (in addition to the original six)

| Role | Why it's needed | Replaces/relates to |
|---|---|---|
| **Registrar / Academic Records Officer** | Owns admissions-to-graduation record integrity, official transcripts, academic-status changes. This is the single biggest gap in the original role list. | New |
| **Examination Officer** | Owns exam scheduling, result-approval workflow, grade-change authorization, transcript-affecting corrections. Separates "can enter a mark" (Lecturer) from "can certify results are final" (Exam Officer). | New |
| **Dean (Faculty level) / Head of Department (Department level)** | Academic leadership approvals — e.g. approving course allocations, approving results at faculty/department level, viewing performance analytics for their unit. Distinct from *Faculty Administrator* / *Department Administrator*, who are administrative/data-entry roles, not academic decision-makers. Many universities combine these (Dean *is* the Faculty Administrator); confirm in open questions. | Clarifies "Faculty/Department Administrator" |
| **Academic Advisor** | Guides individual students' course selection/progress; may or may not be a distinct role from Lecturer at your institution (often lecturers double as advisors) | New (may be a *capability*, not a separate account, if advisors are lecturers) |
| **Admissions Officer** | Manages the applicant pipeline (A1) before a person becomes a student | New |
| **IT/System Administrator** | Manages accounts, resets, technical configuration — distinct from **Super Administrator**, who governs the whole system's academic configuration and highest-level policy. Keeping these separate limits how many people hold full super-admin power. | Splits "Super Administrator" into a technical-ops role and a governance role |
| **Auditor (read-only)** | Optional but recommended: a role that can view audit logs and reports but cannot change anything — useful for internal quality assurance/accreditation review | New, optional |

### Roles considered and **not** added as separate accounts

- **Finance Officer** — only if your university wants to *enforce* a fee-status gate in this system (A15). If so, this is a narrow role (can only set/view the fee-status flag), not a full accounting role.
- **Librarian** — same reasoning, narrower still (A16); most universities keep the library system entirely separate and this system doesn't need to know more than a pass/fail clearance flag.
- **Quality Assurance Officer** — this is normally an *auditor-style* consumer of reports (grade distributions, accreditation data), covered by the Auditor role above rather than needing its own account type, unless you tell us otherwise.

**Open question:** whether Dean/HoD are separate people from Faculty/Department Administrator at your university, and whether Advisor is a distinct staff role or a capability every lecturer has for their assigned advisees. See §25.

---

## 5. D. Preliminary RBAC model

Legend: **V**=View, **C**=Create, **E**=Edit, **D**=Delete, **A**=Approve, **P**=Publish, **—**=No access

| Module / Data | Super Admin | IT Admin | Registrar | Dean/HoD | Dept/Faculty Admin | Exam Officer | Advisor | Lecturer | Student |
|---|---|---|---|---|---|---|---|---|---|
| University/Faculty/Dept/Program structure | VCED | V | VCE | V (own) | VE (own) | V | — | — | — |
| Academic year / semester config | VCED | V | VCE | V | V | V | — | — | — |
| Course catalog & curriculum | VCED | — | VCE | VA (own) | VCE (own) | V | V | V (own) | V |
| Course allocation (lecturer↔course) | VCED | — | VCE | VA (own) | VCE (own) | V | — | V (own) | — |
| Timetable | VCED | — | VCE | V | VCE (own) | V | V | V (own) | V (own) |
| Student profile — academic | V | — | VCE | V (own unit) | V (own unit) | V | V (advisees) | V (own students) | V (self) |
| Student profile — personal/contact | VE | VE (technical) | VE | — | — | — | — | — | VE (self) |
| Admissions / applications | VCED | — | VCEA | V | — | — | — | — | C (self, own application) |
| Course registration | VCED | — | VE (all) | V | V (own unit) | V | A (advisees, if required) | — | CE (self, within rules) |
| Course materials / content | VCED | — | — | V | V | — | — | VCED (own course) | V (registered courses) |
| Attendance | VD | — | V (all) | V (own unit) | V (own unit) | V | V (advisees) | VCE (own course) | V (self) |
| Assignments / quizzes | VD | — | — | V | V | — | — | VCED (own course) | V + submit (registered) |
| Marks entry (provisional) | VD | — | V | V (own unit) | V (own unit) | V | — | VCE (own course, until locked) | — |
| **Result approval / locking** | VD | — | VA | **A** (own unit) | — | **A** | — | — | — |
| **Result publication** | VD | — | — | — | — | **P** | — | — | V (self, after publish) |
| Grade change after publication | — | — | request only | request only | — | **A** (with audit trail) | — | request only | — |
| GPA/CGPA | V | — | V | V (own unit) | V (own unit) | V | V (advisees) | — | V (self) |
| Transcripts (official) | VD | — | VC**P** | V (own unit) | — | V | — | — | V (self, request copy) |
| Reports (student/course/dept/faculty) | V (all) | — | V (all) | V (own unit) | V (own unit) | V (exam-related) | V (advisees) | V (own courses) | V (self only) |
| User accounts & roles | VCED | VCE (non-role-sensitive fields) | — | — | — | — | — | — | — |
| Audit logs | V | V | — | — | — | V (exam-related) | — | — | — |
| System settings / security config | VE | VE | — | — | — | — | — | — | — |

### Dangerous permission conflicts identified

1. **A lecturer must never be able to publish their own course's final results.** Entering marks and certifying/publishing them must be two different people (or at minimum two different *actions with approval*), otherwise there's no defense against a single person quietly inflating a grade. This is why "Marks entry" and "Result publication" are split above.
2. **A lecturer must not be able to enter/edit marks for a course they are not assigned to.** Course-level ownership must be enforced at the API level, not just hidden in the UI (a common real vulnerability: hiding a button doesn't stop a direct API call).
3. **Super Admin should not be a role people use for daily work.** Because it can do everything including deleting audit trails, it should be limited to a very small number of accounts, always with 2FA, and every action it takes should still be logged (see §9 — "Administrator protection").
4. **Once a result is published, editing it must go through an explicit "grade change" workflow with a reason and an approver — never a silent overwrite.** This satisfies your own stated rule in §5 of the brief ("Published examination results should not be silently changed").
5. **Students must never see another student's grades, attendance, or personal data — including indirectly** (e.g. a class-average report must not let a student back-calculate a specific classmate's score in a 3-person class). Small-cohort statistical disclosure is a real risk worth flagging now.

---

## 6. Academic workflow audit

Your proposed flow:

```
Admission → Account creation → Enrollment → Academic year → Semester → Course registration →
Course allocation → Learning materials → Attendance → Assignments → Continuous assessment →
Examinations → Grading → Result approval → Result publication → GPA/CGPA →
Academic progression → Graduation → Transcript
```

This is close to correct. Corrections/additions:

1. **"Course allocation" must happen *before* "course registration" is meaningful**, not after — students can't sensibly pick sections/lecturers that haven't been assigned yet. Reorder: `... Semester → Course allocation → Course registration → Learning materials → ...`
2. **Missing: prerequisite check, inserted between course registration and confirmation.** A registration attempt should be validated against completed/in-progress prerequisites before it's accepted.
3. **Missing: registration period / add-drop window.** Universities normally have a defined window for registering and a separate, shorter window for dropping/adding without penalty. This needs to be a semester-level configuration, not assumed to be always-open.
4. **Missing: withdrawal path branching off between "Course registration" and "Examinations"** — a student can withdraw from a course mid-semester (→ "W" grade), which is a distinct branch from simply not showing up.
5. **"Grading" is really three sub-steps you've collapsed into one: mark entry (lecturer) → verification/moderation (HoD/Exam Officer, optional but common) → approval & lock (Exam Officer/Registrar).** This is the single most important correction in the whole workflow (see A2).
6. **"Academic progression" needs an explicit decision point**, not just a label: at the end of each semester/year, the system should evaluate each student against progression rules (pass, proceed with conditions, repeat semester, probation, dismiss) — this needs your actual rules (see open questions).
7. **Missing: graduation eligibility check as a distinct step before "Graduation"** — credits completed, GPA threshold, no outstanding "Incomplete" grades, clearance flags if used (A7).
8. **Transcript generation should be triggered both by graduation AND by ad-hoc request** (a continuing student requesting a transcript mid-program for a scholarship application, for instance) — it isn't only an end-of-journey event.

**Corrected high-level workflow:**

```
Admission/Application → Offer & Acceptance → Student account creation → Program enrollment
   → Academic year/Semester opens → Course allocation (lecturer+section+room+time)
   → Registration window opens → Course registration (+ prerequisite check, advisor approval if required)
   → [Withdrawal branch: student may withdraw from a course before the drop deadline]
   → Learning materials delivered → Attendance recorded → Assignments/Continuous assessment
   → Examinations → Mark entry (lecturer) → Moderation (optional) → Result approval & lock (Exam Officer)
   → Result publication → GPA/CGPA computed → Progression decision (pass/repeat/probation/dismiss)
   → [repeat each semester] → Graduation eligibility check → Graduation → Official transcript
```

---

## 7. Conceptual database model

Not SQL — entities, purpose, key relationships. Grouped by domain.

### Identity & structure
- **User** — one account per person (login, credentials, contact info). Purpose: single identity regardless of how many roles a person holds (a lecturer who is also a department admin is *one* User with two role assignments, not two accounts).
- **Role** / **UserRole** (join table) — supports one user holding multiple roles, and roles being scoped (e.g. "Department Admin for Computer Science" not just "Department Admin" globally).
- **Faculty**, **Department**, **Program** — hierarchical structure; Program belongs to Department belongs to Faculty.
- **AcademicYear**, **Semester** — time periods everything else is scoped to.

### Curriculum
- **Course** — a subject definition (code, title, credit value, description) — largely time-independent.
- **CurriculumVersion** — which set of courses/requirements a Program requires, versioned by the academic year a cohort started (A8). Prevents "curriculum drift" from breaking older students' graduation checks.
- **CoursePrerequisite** — self-referencing relation on Course.
- **CourseOffering** (a.k.a. "Course Section") — a specific instance of a Course in a specific Semester, taught by a specific Lecturer(s), with capacity, room, and timetable slot. **This is the entity most of the original proposal's "course allocation/timetable" features actually attach to**, not Course itself.

### People & enrollment
- **Student** — extends User; program, cohort/entry-year, status (active/probation/withdrawn/graduated/dismissed), advisor link.
- **Lecturer** — extends User; department, employment info relevant to teaching only (not full HR).
- **Enrollment** — Student ↔ Program (long-lived; "I am enrolled in the BSc Computer Science program").
- **CourseRegistration** — Student ↔ CourseOffering (per-semester; "I am taking CS301 this semester"), with status (registered/withdrawn/completed).

### Delivery & LMS
- **CourseContent** (unifies "course page/syllabus/topics/modules" — see B8) — hierarchical: Module → Lesson/Topic → Resource.
- **Resource/File** — polymorphic attachment (belongs to CourseContent, Assignment, Submission, StudentDocument, etc.) — one file-storage model reused everywhere, not one per feature.
- **Announcement** — scoped to a CourseOffering or broader (Department/Faculty/University).
- **DiscussionThread** / **DiscussionPost** — scoped to a CourseOffering (see B9, kept simple for V1).

### Attendance
- **AttendanceSession** — one class meeting instance of a CourseOffering.
- **AttendanceRecord** — Student × AttendanceSession, status (present/absent/late/excused).

### Assessment
- **Assignment** / **Quiz** / **Exam** — all specializations of a common **AssessmentItem** concept (title, weight, due date, max marks) belonging to a CourseOffering — avoids duplicating the same fields three times.
- **QuestionBank** / **Question** — for quizzes/exams, reusable across offerings of the same course.
- **Submission** — Student's response to an Assignment/Quiz/Exam, with file(s) or answers, timestamp (for late-submission logic).
- **Mark** — the score for one Student on one AssessmentItem, entered by a Lecturer, with a status (provisional/moderated/locked).
- **CourseResult** — the *aggregated, weighted* result for a Student in a CourseOffering (computed from Marks per the grading scheme), with an explicit approval workflow state (draft → submitted → approved → published) and grade-change history (A2, D-conflict #4).

### Academic record (authoritative, long-lived — survives course/lecturer deletion)
- **AcademicRecordEntry** — one immutable-once-published row per Student per CourseOffering result: grade, credits earned, semester. This is what transcripts are built from — deliberately decoupled from the live `CourseResult` working data so that deleting a old CourseOffering or Lecturer account can never affect a student's historical record.
- **GPARecord** — computed per semester/cumulative per Student.
- **Transcript** — generated document/snapshot referencing AcademicRecordEntry rows, with an issue date and (ideally) a verification reference/hash.

### Support
- **Notification** — in-app + email dispatch record, polymorphic source (new grade, new announcement, deadline, etc.).
- **AuditLog** — append-only: actor, action, target entity, before/after (for sensitive fields), timestamp, IP.
- **Application** (admissions, A1) — pre-Student pipeline entity, converts into Student + Enrollment on acceptance.

### Entities in the original brief that are **not** separate top-level tables
- "Course pages," "syllabus," "topics/modules" → merged into `CourseContent` (B8).
- "Marks" and "Grades" → `Mark` (raw score) vs `CourseResult` (computed, published grade) are different things and both needed, but "Grades" alone was never going to be one table — it's a *computation*, not stored data, except at the point of publication (`AcademicRecordEntry`).
- "Exam Attempts" (from your §4 list) → same shape as `Submission`, reused rather than duplicated, unless online proctored exams need attempt-specific metadata (time started/ended, IP, lockdown-browser events) — flagged for V2 if you plan online invigilated exams.

---

## 8. Data integrity & business rules (must be enforced by the system, not just assumed)

1. A CourseRegistration can only be created if the student has an active Enrollment in a Program that includes that Course in its CurriculumVersion — **or** an explicit elective override is recorded.
2. A CourseRegistration requires all of the course's prerequisites to be already-passed (or, if your policy allows, "in progress") — enforced at registration time, not just checked by an advisor manually.
3. A student cannot hold two active CourseRegistrations for the same CourseOffering (no accidental double-registration); re-registering after a Withdrawal in the *same* semester is blocked, in a later semester (retake) is allowed.
4. A Lecturer can create/edit Marks only for CourseOfferings they are assigned to teach — enforced server-side on every write, not only hidden in the UI.
5. Once a CourseResult reaches `published` status, it cannot be edited directly. A **grade-change request** must be created, approved by the Exam Officer/Registrar, and the change plus reason plus approver is recorded in AuditLog and visible in the record's history.
6. Deleting a User (Student or Lecturer) never deletes AcademicRecordEntry, Mark, or AttendanceRecord rows — those are retained (with the user reference kept or anonymized per your retention policy, A17), because historical academic records must outlive any single account.
7. GPA/CGPA calculation must use one single, versioned calculation function referencing the grading scale in effect for that student's CurriculumVersion (grading scales can change over time; a student shouldn't have their historical GPA silently recalculated under new rules).
8. AttendanceRecord entries can only be created/edited by the Lecturer of that CourseOffering, and only within a reasonable time window after the session (to prevent retroactive attendance fabrication weeks later) — exact window TBD by policy.
9. An AssessmentItem's total weight within a CourseOffering must sum to the university's expected total (e.g. 100%) before the offering can be marked "grading complete" — a structural safeguard against a lecturer forgetting a component.
10. File uploads are validated by actual content type (not just filename extension) and size before storage, for every Resource/Submission — a security rule, not just a data-integrity one (see §9).

---

## 9. Examination & grading audit

The proposal correctly lists most needed concepts but assumes a grading model rather than defining one. Needed, and **all dependent on your actual policy** (see §25 open questions):

- Assessment component types and their default weights (assignment / continuous assessment / midterm / final / practical) — is this fixed university-wide or configurable per course/department?
- Letter-grade boundaries (what score range = A, B, C, etc.) and whether they're uniform across the university or can vary by faculty.
- Grade point values per letter grade, for GPA calculation.
- Credit-hour weighting in GPA/CGPA (standard formula, but confirm your credit system — see §25).
- Pass mark, and whether it's uniform or varies (e.g. postgraduate vs undergraduate).
- Retake policy: capped number of attempts? Best score kept or most recent? Does a retake replace the failed attempt on the transcript or appear alongside it?
- Repeated-course/repeated-semester policy and how it interacts with probation status (A6).
- Withdrawal grade ("W") — does it count in GPA? Deadline for withdrawing without academic penalty?
- Incomplete ("I") grade — default resolution deadline, and what happens automatically if it's not resolved (converts to F? stays incomplete indefinitely — not recommended)?
- Whether online/proctored examinations are needed in V1 or a later version (affects whether `Submission`/attempt metadata needs lockdown-browser-style fields — see §7).

None of these are assumed in the data model above; the model is built to be **configurable** (a GradingScheme entity referenced by CurriculumVersion) rather than hard-coding one university's rules, specifically so we don't have to guess.

---

## 10. LMS audit

**Essential for V1:**
- Course content structure (modules/lessons), file resources (PDF/DOCX/PPTX/XLSX, images; video via external link — see B6/B7)
- Assignments with file submission, due dates, late-submission flag (accept-late-with-penalty vs hard-block — policy question)
- Quizzes with basic auto-graded question types (multiple choice, true/false) + manually-graded free text
- Manual grading with feedback comments
- Announcements per course
- Simple per-course discussion thread
- Student progress view: what's been submitted/graded/outstanding, attendance percentage, current standing

**Advanced — defer to V2/V3:**
- Randomized question order/question-pool draws per student
- Timed, lockdown/proctored online exams
- Rich threaded forum with subforums and moderation tools
- Fine-grained content "completion tracking" (mark-as-done, sequential unlock)
- Peer review/peer grading
- Plagiarism-detection integration
- SCORM/xAPI import for third-party course packages

---

## 11. Attendance audit — V1 recommendation

**Recommended for V1:** lecturer opens an AttendanceSession for a class meeting, marks each registered student present/absent/late/excused from the class roster (a simple checklist UI, fast to use even for a 100-student lecture). Attendance percentage per course and per semester computed automatically; reports by course/department/faculty.

**Deliberately deferred:** QR-code check-in, geolocation, biometric, and mobile self-check-in (B2) — these solve a problem (large lecture halls, proxy attendance/buddy-marking fraud) that's worth revisiting only after V1 usage shows manual marking is actually a bottleneck or attendance fraud is a real problem at your institution. Simpler and more reliable to launch with.

Lecturer attendance (i.e., tracking whether the lecturer themselves showed up) — include only if your university's HR/administration actually uses this for anything (payroll, performance review); otherwise it's scope with no consumer. Flagged as an open question.

---

## 12. Security audit

| Requirement | Priority |
|---|---|
| Password hashing (bcrypt/argon2), no plaintext ever stored or logged | Critical |
| Server-side authorization check on every request (never rely on hiding UI elements) | Critical |
| Grade/result publication and grade-change actions require explicit approval + audit trail | Critical |
| SQL injection prevention (parameterized queries/ORM — never string-built SQL) | Critical |
| File upload validation: type, size, content-sniffing, storage outside the web root, served via signed/expiring URLs | Critical |
| Session management: secure, httpOnly, expiring session tokens; forced logout on password change | Critical |
| Rate limiting on login and password-reset endpoints | High |
| CSRF protection on state-changing requests | High |
| XSS protection (output encoding, especially in discussion posts/announcements which are user-generated content) | High |
| 2FA for Super Admin, IT Admin, Exam Officer, Registrar accounts | High |
| Audit logging of sensitive actions, tamper-resistant (append-only, ideally shipped off-host) | High |
| Encryption at rest for the database and file storage | High |
| Encryption in transit (TLS everywhere, HSTS) | Critical |
| Automated, tested backups with a defined recovery point/time objective | Critical |
| Breach detection + documented incident-response procedure meeting the 72-hour DPA notification deadline (Somalia DPA Act, §13) | Critical |
| Data-processing/transfer agreement with cloud vendor covering cross-border transfer safeguards (Somalia DPA Act, §13) | Critical (procurement/legal, not code) |
| Account lockout / exponential backoff after repeated failed logins | Medium |
| Email verification on account creation | Medium |
| 2FA for students/lecturers | Medium (optional V1, consider mandatory V2) |
| Superadmin action review (a second admin notified of high-impact actions like bulk delete) | Medium |
| Security headers (CSP, X-Frame-Options, etc.) | Medium |
| Dependency/vulnerability scanning in CI | Medium |
| Penetration test before go-live | High (process requirement, not code) |

---

## 13. Privacy & data protection

**Governing law (confirmed 2026-08-17): Somalia Data Protection Act No. 005 of 2023**, plus implementing regulations and guidance from the Somalia Data Protection Authority (DPA), effective since March 2023. This replaces the generic placeholder in earlier drafts — the requirements below are specific to this Act, not assumed from GDPR.

### What the Act requires of this system

- **Processing principles** the system's design must reflect throughout: lawfulness, fairness, transparency, purpose limitation, data minimization, accuracy, storage limitation, confidentiality/security. Practically: only collect fields the academic/administrative process actually needs (no speculative "just in case" fields), and every data category needs a defined retention period (see below), not indefinite storage by default.
- **Data subject rights** the system must be able to service: access, rectification, erasure, restriction of processing, data portability, objection, and rights relating to automated decisions, plus a statutory right to complain about unlawful/unfair/abusive processing (Art. 26). Concretely, this means:
  - A student/lecturer can request a copy of their own personal data (access) and an export in a usable format (portability) — reasonable to serve this as a self-service "download my data" feature in V2, manually in V1.
  - **Rectification** applies to personal/contact data (name spelling, phone number, address) — self-service or admin-assisted correction. It does **not** provide a side channel around the academic grade-change workflow (§8, rule 5) — a grade is not "inaccurate personal data" a student can unilaterally request changed; it goes through the Exam Officer approval process regardless of this right.
  - **Erasure ("right to be forgotten")** directly conflicts with the academic-record retention rule in §8 (rule 6: "deleting a user never deletes academic record rows"). The Act's erasure right is not absolute — it is expected to carry exemptions for data an institution is legally/regulatorily obligated to retain (accreditation records, transcripts, audit trails). **Practical design:** build an erasure-request workflow that (a) actually erases/anonymizes data with no ongoing retention basis (e.g. a rejected applicant's data past the retention window, a withdrawn user's marketing/contact preferences), and (b) for academic records with a retention obligation, responds to the request by explaining the legal basis for continued retention rather than silently refusing or silently complying. This needs sign-off from whoever handles the university's compliance function — flagged as an open item below, not resolved by engineering judgment alone.
- **Breach notification: 72 hours to the DPA** from becoming aware of a breach (extendable with the DPA notified within the 72-hour window). This is now a **Critical, V1** requirement, not just good practice: the system needs (a) audit logging detailed enough to determine breach scope quickly (which is already required by §8/§12), and (b) a documented incident-response procedure so the university can actually meet the 72-hour clock — this is a process document to write alongside the system, not just a code feature.
- **Cross-border data transfer restrictions.** Data may only leave Somalia to a recipient/jurisdiction with adequate safeguards (binding contractual clauses, certification, adequacy, etc.), with narrow consent-based exceptions for non-repetitive transfers. **This directly affects the confirmed cloud-hosting decision** (§02, confirmed cloud-managed): Somalia has no major hyperscaler data center, so any AWS/Azure/GCP-style hosting means data leaves the country. Before finalizing a cloud vendor/region, the university needs a data processing/transfer agreement with that vendor containing appropriate safeguards, and depending on the mechanism used, may need to notify the DPA. **This is a procurement/legal task for the university, not something engineering can resolve alone — flagged in open questions below.**
- **"Data controller of major importance" registration.** Controllers processing data of a "prescribed number of data subjects" (exact threshold not published in full detail; DPA guidance also designates controllers by significance to society/economy/security) must register with the DPA within 6 months of qualifying. A full-university system holding thousands of student records plausibly qualifies. **This is an institutional compliance action the university should take, independent of the software build** — flagged below.
- **Children's consent.** The DPA treats under-18s as children requiring parent/guardian consent for personal-data processing. Relevant if any admitted students or applicants are minors (common in some entry pathways) — the **Admissions/Application module (A1)** needs a guardian-consent capture field and workflow for underage applicants, not just adult self-registration.
- **Vendor/processor management.** Any third party the system sends personal data to (transactional email provider, SMS gateway if added later, cloud storage vendor) is a data processor under the Act and needs its own data-processing agreement — relevant to the "Useful integrations" list in §20.

### Access & audit principles (unchanged from draft, now reinforced by the Act's confidentiality/security principle)

- Grades and personal data visible only to the student themself, their assigned lecturers/advisor for currently-relevant courses, and administrative roles with a legitimate need (Registrar, Exam Officer, relevant Dean/HoD) — never broadly visible to "all staff."
- Reports and exports exclude personally identifiable fields by default, showing aggregate/statistical data unless the requester has a role permitted to see individual records.
- Audit logs record every access to another user's grade/personal record, not just edits — read-access logging matters both for accountability and for the Act's breach-scope-determination need.
- **Retention periods per data category** must be explicitly defined (storage-limitation principle) rather than "kept forever by default" — this is a policy decision for the university (see open questions), likely informed by academic-accreditation retention norms (transcripts/records typically retained permanently or for a long statutory period) versus shorter-lived data (login logs, session data, rejected-applicant records).

---

## 14. File & document management

- Fixed allowed file types (§B7): documents (PDF/DOCX/PPTX/XLSX), images (JPG/PNG), and video **by external link** rather than hosted video files in V1 (hosting/streaming large video is expensive and not core to the system — revisit in V2 if the university wants self-hosted lecture recordings).
- Size limits: sensible per-type caps (e.g. 25MB for documents/images) enforced both client- and server-side.
- Storage: object storage (not the database, not local disk on the app server) with access via short-lived signed URLs — required for both security and scalability.
- Versioning: needed for course materials (a lecturer replacing a lecture slide deck) — keep prior versions rather than overwrite, at least for V1's course-content resources; not needed for one-shot student submissions.
- Malware scanning on upload — recommended given students/public-facing upload surfaces (assignment submissions, application documents).

---

## 15. Notifications

**V1 (in-system + email):** new announcement, new assignment posted, assignment deadline approaching, result published, grade-change made, course registration confirmation, password reset, attendance-warning threshold crossed.

**Deferred (V2/V3):** SMS (B4), push notifications (depends on whether a PWA/native app exists), digest/summary emails, configurable per-user notification preferences beyond a basic on/off.

---

## 16. Dashboard information architecture (kept intentionally lean)

- **Student:** today's classes, upcoming deadlines (assignments/exams), recent grades/announcements, attendance percentage warning if low, quick links to registered courses.
- **Lecturer:** today's classes, courses needing attention (ungraded submissions, attendance not yet taken), recent announcements sent, quick links to assigned courses.
- **Registrar/Exam Officer:** pending result approvals, pending grade-change requests, registration-period status, applicant pipeline summary (if Admissions Officer role is separate, this narrows accordingly).
- **Dept/Faculty admin & HoD/Dean:** unit-level summary (enrollment counts, pending approvals for their unit, performance snapshot), not full university-wide data.
- **Super Admin:** system health, user-account summary, recent audit-log highlights, configuration entry points — not academic data itself, which isn't Super Admin's job to browse.

---

## 17. Reports

| Report | Who can generate | Export |
|---|---|---|
| Individual transcript | Registrar, Student (self) | PDF |
| Course grade distribution | Lecturer (own course), HoD, Exam Officer | PDF/CSV |
| Attendance report (per course/student/semester) | Lecturer, Registrar, Advisor | PDF/CSV |
| Department/Faculty performance summary | HoD/Dean, Registrar | PDF/Excel |
| GPA/CGPA report | Registrar, Advisor, Student (self) | PDF |
| Enrollment/registration statistics | Registrar, Dept/Faculty Admin | Excel/CSV |
| Audit log export | Super Admin, Auditor | CSV |

All reports respect the RBAC/privacy scoping in §5/§13 — no report bypasses role-based visibility.

---

## 18. Scalability

Design for **medium scale by default** (a few thousand students, a few hundred lecturers, tens of thousands of course registrations per year) without over-engineering for scale you may never need — see the open question in §25 to confirm actual numbers. A conventional relational database with proper indexing, object storage for files, and a stateless application layer easily supports this; no need for microservices, sharding, or specialized big-data infrastructure at this stage.

---

## 19. Mobile & responsive

One responsive web application, built mobile-first, covers students/lecturers/admins on phones, tablets, and desktops (B3). Reassess a native app only if real usage data shows a specific need a responsive site can't meet (e.g., offline access, push notifications that email/in-app can't replace).

---

## 20. Integrations — genuinely useful vs. not yet

**Useful, V1 or V2:**
- Transactional email provider (for password reset, notifications) — essential, V1.
- Google/Microsoft SSO login — genuinely convenient if your university already issues institutional Google/Microsoft accounts; confirm in open questions.

**Useful later, not now:**
- Payment gateway (B5) — out of scope, use a status flag instead.
- SMS provider (B4) — V2/V3 if email proves insufficient.
- Video conferencing (B6) — link-out only, never build.
- Cloud storage/library systems — only if you have a specific existing system to connect to; don't build a generic integration speculatively.

---

## 21–24. Architecture, phases, and final gap table

See `02-architecture-proposal.md` for technical architecture and `01-agent-responsibility-matrix.md` for how build work will be organized. Phase assignment (V1/V2/V3) is summarized in the tables above per feature; a consolidated view:

### Must Have (V1 — cannot launch without)
Admissions/applicant intake · student & lecturer profiles · faculty/department/program/course structure with curriculum versioning · academic year/semester config · course allocation & registration with prerequisite checks · timetable with clash warnings · course content & file resources · assignments & basic quizzes with manual+basic auto grading · attendance (manual) · mark entry → approval → publication workflow · GPA/CGPA calculation · academic-record & transcript generation · progression status tracking · graduation eligibility check · RBAC per §5 · audit logging · password reset/email verification · in-system + email notifications · core reports · backups.

### Should Have (soon after launch — V1.x/V2)
Self-service transcript requests · richer advising tools · grade-change request workflow UI (vs. admin-only) · fee/library clearance flags · Google/Microsoft SSO · improved discussion/forum · content completion tracking · Excel export everywhere.

### Nice to Have (V2/V3)
QR/mobile attendance · native mobile app · SMS notifications · online proctored exams · randomized question banks · peer review · SCORM import · plagiarism detection.

### Remove/Postpone from the original proposal
Built-in payment processing (B5) · built-in video conferencing (B6) · mandatory 2FA for all users at launch (B1) · biometric/QR attendance at launch (B2) · native mobile app at launch (B3) · SMS at launch (B4).

---

*Continue to `03-open-questions-and-decisions.md` for the specific questions that need your answers before the database and grading modules can be finalized.*
