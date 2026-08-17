# Open Questions & Decision Log
**University Management System + LMS**

Two kinds of questions live here:
- **Architecture/scope decisions** (asked via the chat interface as multiple-choice — genuine trade-offs where any answer is workable)
- **University policy questions** (asked here as open questions — these describe *your* institution's actual rules, so they can't be multiple-choice guesses)

Nothing in `00-requirements-audit.md`'s grading, GPA, progression, or attendance design is final until the relevant questions below are answered. As you answer, we'll log the decision at the bottom of this file so later work never contradicts it.

---

## A. Academic policy questions (please answer in your own words — no need to use technical terms)

### Grading & GPA
1. What grading scale does your university use — letter grades (A–F), percentage, a numeric scale (e.g. 5.0/4.0), or something else?
2. What are the score boundaries for each grade (e.g. A = 80–100)? Are they the same across all faculties, or does this vary?
3. What grade-point value does each letter grade carry, for GPA calculation (e.g. A = 4.0, B = 3.0)?
4. What is the pass mark? Is it the same for all levels (undergraduate/postgraduate) and all course types (including practicals)?

### Credit & semester system
5. What credit-hour system do you use (e.g. each course is worth a fixed number of "credit units," and GPA is credit-weighted)?
6. How many semesters/terms per academic year, and are they equal in structure (or is there a shorter summer/trimester session)?
7. How many credits does a typical full-time student register for per semester, and is there a minimum/maximum?

### Assessment structure
8. Are assessment component weights (assignment/continuous assessment/midterm/final/practical) fixed university-wide, or do they vary by course/department?
9. If fixed, what are the standard weights?

### Progression, retakes, and probation
10. What GPA (or other) threshold puts a student on academic probation, and what threshold leads to dismissal?
11. Retake policy: how many attempts are allowed for a failed course? Is the retake score capped, or can it fully replace the failed score? Does the transcript show both attempts or only the latest?
12. What happens to a course a student withdraws from ("W") — does it affect GPA at all, and is there a deadline for withdrawing without penalty?
13. What's the default resolution deadline for an "Incomplete" grade, and what happens if it's not resolved by then?

### Graduation
14. What are the graduation requirements — total credits, minimum CGPA, any other conditions (e.g. no outstanding incomplete grades, project/thesis submitted)?
15. Does your university enforce fee-clearance or library-clearance before allowing exam entry or graduation? (This determines whether A15/A16 in the audit are needed at all.)

### Attendance
16. Is there a minimum attendance percentage required to sit an exam in a course? If so, what is it?
17. Do you need to track *lecturer* attendance (e.g. for payroll/performance purposes), or only student attendance?

### Organizational structure
18. Roughly how many faculties, departments, and programs does the university have?
19. At your university, is the "Dean"/"Head of Department" the same person as what you called "Faculty Administrator"/"Department Administrator" in your original brief, or are these genuinely different people with different jobs (academic leadership vs. administrative data entry)?
20. Is "Academic Advisor" a distinct staff role at your university, or do lecturers act as advisors for their own students as part of their normal duties?
21. Does the registration process require advisor approval/sign-off before it's confirmed, or is it self-service for the student within the rules?

### Admissions
22. Should this system handle the applicant/admissions pipeline (people applying who aren't students yet), or does your university already have a separate admissions system and this one should only take over once someone is officially admitted?

---

## B. Architecture/scope decisions

These will be asked through the chat interface as a short set of multiple-choice questions, since any answer is workable and doesn't require university-specific knowledge — just your preference:

- **Data protection framework** — which jurisdiction's rules apply (affects retention/erasure design).
- **Expected scale** — approximate student/lecturer/faculty counts for V1 (affects hosting sizing, not the core architecture).
- **Mobile strategy** — responsive web (recommended) vs. native app vs. PWA.
- **Hosting preference** — cloud-managed (recommended) vs. on-premise, and any existing institutional infrastructure/budget constraints we should design around.

---

## C. Decision log

*(Filled in as answers arrive — this becomes the permanent record so later development phases don't contradict earlier decisions.)*

| Date | Question | Decision | Recorded by |
|---|---|---|---|
| 2026-08-17 | B: Expected scale | **Medium — full university** (~2,000–15,000 students across all faculties from V1) | Lecturer |
| 2026-08-17 | B: Mobile strategy | **Responsive web only for V1** — no native app, no PWA for now | Lecturer |
| 2026-08-17 | B: Hosting | **Cloud-managed** (e.g. AWS/Azure/GCP-style managed hosting, not on-premise) | Lecturer |
| 2026-08-17 | B: Data protection framework | **Somalia Data Protection Act No. 005 of 2023**, plus DPA regulations/guidance. Key requirements folded into `00-requirements-audit.md` §13: 72-hour breach notification, cross-border transfer safeguards, data-subject rights (access/rectification/erasure/portability/objection), "major importance" controller registration, children's (under-18) consent. | Lecturer |

### Governance decisions from the Somalia DPA follow-up (2026-08-17) — ownership and process now resolved

The four items below have moved from "unowned open question" to "owned, with a defined process." The *decisions on process* are final and are now built into `00-requirements-audit.md` (§7 database model, §8 rules 11–13, §13 narrative). The *underlying university-side actions* are still pending completion — tracked here so they don't get lost before go-live:

| Item | Decision (who / how) | Still needs to happen |
|---|---|---|
| Cross-border transfer safeguards | Procurement/Legal (or DPO if appointed) owns drafting/negotiating the data-processing agreement with the chosen cloud vendor; engineering supplies the data-flow description (what data, where, who accesses it, retention, security controls) | Vendor not yet selected; agreement not yet drafted |
| "Major importance" controller registration | University registers the processing activity and transfer mechanism with the Somalia DPA once the vendor/architecture is settled | Not yet initiated |
| Erasure requests touching academic records | Governance group decides: Registrar (records owner) + Legal/Compliance + DPO (if appointed). Rule of thumb: full erasure only where no retention obligation applies; otherwise partial redaction of non-essential fields, mandatory academic fields preserved (§8 rules 11–12) | Group not yet convened; no requests received yet (system not live) |
| Minors in admissions | Admissions Office owns confirming underage status at intake and capturing guardian consent + proof; Legal/DPO reviews consent language (§8 rule 13, §13) | **Open question for you:** does your university admit any students under 18? |
| Data retention periods per category | Records Management/Registrar drafts the retention schedule (by data category: applications, enrollment, grades/transcripts, disciplinary, logs); Legal/DPO approves; IT implements technical enforcement via `RetentionClass` (§7) | Schedule not yet drafted — needs Registrar input on what your institution/accreditor requires per category |

**Note on "special category" data:** the guidance above referenced tighter rules for "special categories" of data. This wasn't independently confirmed in my earlier research (my search results described general processing principles and data-subject rights but didn't surface a documented special-category regime) — worth having your Legal/DPO contact confirm directly with the DPA guidance document before it's relied on for the consent/admissions workflow design.

### Still pending
- All of §A (academic policy — grading, GPA, credits, semesters, progression, retakes, graduation, attendance, org structure, advising, admissions)
