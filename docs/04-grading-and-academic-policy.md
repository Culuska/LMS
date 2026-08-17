# Grading & Academic Policy Specification
**University Management System + LMS — v1.0**
**Status: Confirmed by the lecturer on 2026-08-17, unless marked otherwise below.** This is the authoritative source the grading engine, `GradingScheme`, and academic-progression business rules will be built from. Everything here is stored as *configuration data*, not hard-coded — so future policy changes are a data update, not a code change.

---

## 1. Grading scale

Letter grades with plus/minus granularity, mapped to a percentage score and a 4.0 GPA scale.

| Letter | Percentage range | Grade points |
|---|---|---|
| A+ | 97–100 | 4.0 |
| A | 90–96 | 4.0 |
| A- | 85–89 | 3.7 |
| B+ | 82–84 | 3.3 |
| B | 78–81 | 3.0 |
| B- | 75–77 | 2.7 |
| C+ | 72–74 | 2.3 |
| C | 68–71 | 2.0 |
| C- | 65–67 | 1.7 |
| D+ | 60–64 | 1.3 |
| D | 50–59 | 1.0 |
| F | 0–49 | 0.0 |

**Note on this table:** you asked for plus/minus granularity but gave exact numbers only for the 5-tier version (A/B/C/D/F). I've subdivided each band into standard thirds and kept your original tier boundaries (A starts at 85, B at 75, C at 65, D/pass at 50) as the outer edges. A+ is capped at 4.0 rather than going to 4.3+, so the maximum possible GPA stays a clean 4.0 university-wide. **This is just configuration data — tell me if any of the subdivision points should move, and it's a one-line change, not a redesign.**

- **Pass mark: 50%** (D or above), applied university-wide for undergraduate programs. You noted postgraduate programs sometimes carry higher GPA requirements for progression (not necessarily a different pass mark) — captured as an open item below since it needs your specific PG numbers, not guessed.

## 2. Credits & semester structure

- **Credit-unit system**: every course carries a fixed credit value (typically 3 or 4). GPA is credit-weighted:
  `GPA = Σ(course credits × grade points) / Σ(course credits)`
- **Two main semesters per academic year** (Fall & Spring), each ~15–16 weeks of teaching + exams, plus an optional shorter summer session.
- **Course load per semester**: minimum full-time 12 credits, normal load 15–18 credits, maximum 21 credits (above 21 requires advisor approval — see §9).

## 3. Assessment component weights

Weights vary by course/department **within university-set bands**, so the grading engine enforces the bounds while departments retain flexibility:

| Component | Allowed band | Default (if department doesn't specify) |
|---|---|---|
| Continuous assessment (quizzes, assignments, labs) | 30–50% | 40% |
| Midterm | 15–25% | 25% |
| Final exam | 40–60% | 35% |

The system enforces that a course's actual weights (i) fall within these bands and (ii) sum to exactly 100% before that course's grading can be marked complete (this was already data-integrity rule §8.9 in the main audit; the bands/default above are the concrete numbers that rule now references).

*Note: the default row (40/25/35) sums to 100 as shown; if a department customizes any one component, the other two must be adjusted so the total still reaches 100% — the engine validates this, it doesn't auto-balance for you.*

## 4. Retakes

- **Up to 2 retake attempts per failed course** — i.e., a maximum of **3 total attempts** (original + 2 retakes). *(Confirming this reading of "2 attempts" — say so if you meant 2 total attempts including the original.)*
- **Scoring: capped at pass mark.** A passed retake counts as no higher than the minimum passing grade (D, 50%, 1.0 grade points) in both GPA calculation *and* on the transcript, regardless of the actual score achieved — this is a deliberate disincentive against using retakes to inflate GPA. The student's actual raw score is still stored internally (for lecturer/statistical visibility) but is not the official recorded grade.
- **Transcript**: both the original failed attempt and the retake attempt appear, with the retake clearly flagged.
- **⚠️ Open gap:** what happens if a student fails *both* retake attempts (3 total failures)? Nothing in your answer specifies a consequence. **Proposed default:** the course is flagged as a graduation-blocking failure requiring Registrar/Dean review (e.g. program substitution, formal appeal, or dismissal review) rather than an automatic system action — confirm or override.

## 5. Withdrawal

- **Before the withdrawal deadline** (proposed default: end of week 8 of a ~15-week semester — confirm if your actual deadline differs): student receives a **"W"** grade, which does not count in GPA (excluded from both the numerator and the credit-hour denominator).
- **After the deadline**: withdrawal is still allowed but recorded as **"WF"** (Withdraw-Fail), which counts as a fail in GPA (0.0 grade points) — distinct from a plain "F" on the transcript so the record shows it was a withdrawal, not an exam failure.

## 6. Incomplete ("I") grade

- **Resolution deadline: within the first 6 weeks of the following semester** (proposed — confirm if your policy uses a different window).
- **If unresolved by that deadline**, the Incomplete automatically converts to an **F** so GPA/progression calculations always have a definite value to work with — no indefinitely-pending grades.

## 7. Academic standing: probation & dismissal

- **Probation**: triggered when cumulative GPA (CGPA) falls below **2.0**.
- **Dismissal**: triggered when a student's **semester GPA** (not CGPA — a single term's performance) falls below **1.5** in any one semester. *(You selected this as the sole trigger, explicitly not the "two consecutive semesters" version — noting the interpretation: this checks that semester's own GPA, not the cumulative figure, since a cumulative figure by definition can't apply "in a single term.")*
- **⚠️ Open gap:** with dismissal keyed only to a single bad semester, a student could sit on probation (CGPA between 1.5 and 2.0) indefinitely without ever recovering *or* being dismissed, as long as no single semester drops below 1.5. Is that acceptable, or should there be a cap (e.g. dismissal after N consecutive semesters on probation with no CGPA recovery)? Not resolved — flagged for your decision, not assumed.

## 8. Graduation requirements

- Total credits: **program-specific** (typical range 120–150 depending on degree length) — exact figures per program come from each program's `CurriculumVersion` (§7 of the main audit), not a single university-wide number. Registrar will need to supply actual per-program credit totals when curricula are entered.
- Minimum CGPA: **2.0**.
- No outstanding Incomplete grades.
- All required core courses passed (per the program's curriculum).
- Mandatory project/thesis passed, where the program requires one.
- **Not gated by fee/library clearance in this system for exam entry** — see §10 below; graduation itself *is* gated by these flags (per your original answer).

## 9. Registration rules

- **Self-service by default**, subject to standard checks: prerequisites met, no time conflicts, course capacity available, within the normal credit-load band (12–18).
- **Advisor sign-off required** for: exceeding the 21-credit maximum, a student currently on academic probation, or any program-exception registration (e.g. an elective substitution outside the curriculum).

## 10. Fee / library clearance

- Enforced **at graduation only**. Unpaid fees or unresolved library holds do **not** block exam entry or mid-program registration — avoids disrupting a student's studies over an administrative matter that isn't academic in nature.

## 11. Attendance & exam eligibility

- **Minimum 75% attendance required to sit a course's exam**, enabled by default, **configurable per faculty** (a faculty can raise or lower its own threshold).
- Only **student** attendance is tracked in this system — lecturer attendance is out of scope here (assumed to sit in HR/teaching-load systems if your university tracks it at all).
- **⚠️ Open detail:** does an *excused* absence count against the 75% figure, or is it excluded from the calculation entirely (so a student with several approved medical absences isn't penalized)? Proposed default: **excused absences are excluded from the denominator** (i.e. the percentage is calculated only over sessions where attendance was actually expected) — confirm or override.

## 12. Organizational structure (sizing assumption, not a hard limit)

Expect roughly **5–8 faculties**, **2–6 departments per faculty**, multiple programs per department (UG/PG variants). The database model (§7 of the main audit) supports this hierarchy generically — these numbers only inform hosting/scale sizing (already confirmed as "medium" in `02-architecture-proposal.md`), nothing is hard-coded to a specific count.

## 13. Roles — confirmed alignment with the existing RBAC model

- **Dean/Head of Department** are confirmed as distinct from **Faculty/Department Administrator** — academic leadership (approvals, curriculum, policy) vs. administrative data entry. This already matches the role model in `00-requirements-audit.md` §4/§5 — no change needed, just confirmed.
- **Academic Advisor** is confirmed as a distinct role (even where a lecturer doubles as an advisor in practice) — also already matches the existing model.

## 14. Admissions

**Confirmed: this system includes its own lightweight admissions module** (application → decision → enrollment), as already scoped in `00-requirements-audit.md` item A1. No separate external admissions platform is assumed.

---

## Open items from this policy pass (not yet resolved — flagged, not guessed)

1. Consequence when a student fails both retake attempts (§4).
2. Whether "2 retake attempts" means 2 total or 2 additional beyond the original (§4).
3. Exact withdrawal deadline, if different from the proposed week-8 default (§5).
4. Exact Incomplete-resolution window, if different from the proposed 6-weeks default (§6).
5. Whether indefinite probation (never dismissed, never recovering) is acceptable, or needs a cap (§7).
6. Whether pass mark/GPA requirements differ for postgraduate programs (§1).
7. Whether excused absences are excluded from the 75% attendance calculation (§11).
8. Actual per-program total credit requirements, once curricula are being entered (§8) — this is data-entry, not a policy question, but noted so it isn't forgotten.
