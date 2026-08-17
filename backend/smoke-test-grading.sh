#!/usr/bin/env bash
# Live end-to-end smoke test of the grading pipeline: assessment items -> marks ->
# compute -> submit -> approve -> publish -> AcademicRecordEntry + GPA + student status.
# Not part of CI — manual verification script for this development pass.
set -euo pipefail
BASE=http://localhost:3000
pass=0
fail=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  OK   $desc"
    pass=$((pass+1))
  else
    echo "  FAIL $desc (expected $expected, got $actual)"
    fail=$((fail+1))
  fi
}

jf() { python3 -c "import json,sys;d=json.load(sys.stdin);print(d$1)"; }

echo "== Login as super admin =="
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@university.local","password":"ChangeMe123!"}' | jf "['accessToken']")
AUTH="Authorization: Bearer $TOKEN"

echo "== Minimal setup: faculty/dept/program/course/curriculum/year/semester/lecturer/student =="
FACULTY_ID=$(curl -s -X POST $BASE/faculties -H "$AUTH" -H 'Content-Type: application/json' -d '{"code":"SCI2","name":"Faculty of Science 2"}' | jf "['id']")
DEPT_ID=$(curl -s -X POST $BASE/departments -H "$AUTH" -H 'Content-Type: application/json' -d "{\"facultyId\":\"$FACULTY_ID\",\"code\":\"CS2\",\"name\":\"Computer Science 2\"}" | jf "['id']")
PROGRAM_ID=$(curl -s -X POST $BASE/programs -H "$AUTH" -H 'Content-Type: application/json' -d "{\"departmentId\":\"$DEPT_ID\",\"code\":\"BSCCS2\",\"name\":\"BSc CS 2\",\"level\":\"UNDERGRADUATE\"}" | jf "['id']")
COURSE_ID=$(curl -s -X POST $BASE/courses -H "$AUTH" -H 'Content-Type: application/json' -d '{"code":"CS110","title":"Discrete Math","credits":3}' | jf "['id']")
CURRICULUM_ID=$(curl -s -X POST $BASE/curriculum-versions -H "$AUTH" -H 'Content-Type: application/json' -d "{\"programId\":\"$PROGRAM_ID\",\"versionLabel\":\"2026 intake\",\"effectiveFrom\":\"2026-09-01\",\"totalCreditsRequired\":120}" | jf "['id']")
curl -s -X POST $BASE/curriculum-versions/$CURRICULUM_ID/courses -H "$AUTH" -H 'Content-Type: application/json' -d "{\"courseId\":\"$COURSE_ID\"}" > /dev/null
YEAR_ID=$(curl -s -X POST $BASE/academic-years -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"2027/2028","startDate":"2027-09-01","endDate":"2028-06-30"}' | jf "['id']")
SEMESTER_ID=$(curl -s -X POST $BASE/semesters -H "$AUTH" -H 'Content-Type: application/json' -d "{\"academicYearId\":\"$YEAR_ID\",\"term\":\"FIRST\",\"startDate\":\"2027-09-01\",\"endDate\":\"2027-12-20\",\"registrationOpensAt\":\"2026-01-01\",\"registrationClosesAt\":\"2028-01-01\",\"withdrawalDeadline\":\"2027-11-01\"}" | jf "['id']")
LECTURER_JSON=$(curl -s -X POST $BASE/users/lecturers -H "$AUTH" -H 'Content-Type: application/json' -d "{\"email\":\"kwilson@university.local\",\"firstName\":\"Kwame\",\"lastName\":\"Wilson\",\"departmentId\":\"$DEPT_ID\",\"staffNumber\":\"STF002\"}")
LECTURER_ID=$(echo $LECTURER_JSON | jf "['lecturer']['id']")
# All actions in this script run as super admin (which is also given the LECTURER-level
# offering-ownership override via OfferingAccessService's admin bypass) rather than
# logging in as the lecturer separately — sufficient to exercise the pipeline's logic,
# though it means the "submit" and "approve" steps below are performed by the same
# super-admin account, which is exactly what proves the anti-self-approval check works.
OFFERING_ID=$(curl -s -X POST $BASE/course-offerings -H "$AUTH" -H 'Content-Type: application/json' -d "{\"courseId\":\"$COURSE_ID\",\"semesterId\":\"$SEMESTER_ID\",\"lecturerId\":\"$LECTURER_ID\",\"capacity\":50}" | jf "['id']")
STUDENT_JSON=$(curl -s -X POST $BASE/users/students -H "$AUTH" -H 'Content-Type: application/json' -d '{"email":"tng@university.local","firstName":"Tade","lastName":"Ng","studentNumber":"STU002","dateOfBirth":"2005-03-01"}')
STUDENT_ID=$(echo $STUDENT_JSON | jf "['student']['id']")
curl -s -X POST $BASE/enrollments -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"programId\":\"$PROGRAM_ID\",\"curriculumVersionId\":\"$CURRICULUM_ID\"}" > /dev/null

echo "== Register the student for the course (as super admin, on their behalf) =="
REG_JSON=$(curl -s -X POST $BASE/course-registrations -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"courseOfferingId\":\"$OFFERING_ID\"}")
REGISTRATION_ID=$(echo $REG_JSON | jf "['id']")
echo "     registration: $REGISTRATION_ID"

echo "== Create assessment items (CA 40%, Midterm 20%, Final 40% — matches offering defaults) =="
ITEM_CA=$(curl -s -X POST $BASE/course-offerings/$OFFERING_ID/assessment-items -H "$AUTH" -H 'Content-Type: application/json' -d '{"type":"ASSIGNMENT","title":"Assignment 1","weight":40,"maxMarks":100}' | jf "['id']")
ITEM_MID=$(curl -s -X POST $BASE/course-offerings/$OFFERING_ID/assessment-items -H "$AUTH" -H 'Content-Type: application/json' -d '{"type":"MIDTERM","title":"Midterm","weight":20,"maxMarks":100}' | jf "['id']")
ITEM_FIN=$(curl -s -X POST $BASE/course-offerings/$OFFERING_ID/assessment-items -H "$AUTH" -H 'Content-Type: application/json' -d '{"type":"FINAL","title":"Final Exam","weight":40,"maxMarks":100}' | jf "['id']")

echo "-- A 4th CA item pushing the CA bucket over 40% should be rejected --"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/course-offerings/$OFFERING_ID/assessment-items -H "$AUTH" -H 'Content-Type: application/json' -d '{"type":"QUIZ","title":"Extra quiz","weight":5,"maxMarks":100}')
check "over-budget CA item rejected" "400" "$CODE"

echo "== Try to compute result before any marks exist (should fail) =="
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/course-results/compute/$REGISTRATION_ID -H "$AUTH")
check "compute blocked with no marks" "400" "$CODE"

echo "== Enter marks: CA=80, Midterm=60, Final=90 =="
curl -s -X PUT $BASE/assessment-items/$ITEM_CA/marks -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"score\":80}" > /dev/null
curl -s -X PUT $BASE/assessment-items/$ITEM_MID/marks -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"score\":60}" > /dev/null
curl -s -X PUT $BASE/assessment-items/$ITEM_FIN/marks -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"score\":90}" > /dev/null

echo "== Compute result (no attendance sessions yet -> 100% default, should pass eligibility) =="
RESULT_JSON=$(curl -s -X POST $BASE/course-results/compute/$REGISTRATION_ID -H "$AUTH")
RESULT_ID=$(echo $RESULT_JSON | jf "['id']")
COMPUTED_PCT=$(echo $RESULT_JSON | jf "['computedPercentage']")
LETTER=$(echo $RESULT_JSON | jf "['letterGrade']")
echo "     computed: ${COMPUTED_PCT}% -> $LETTER (expected 80*0.4+60*0.2+90*0.4 = 80.0 -> B, per docs/04 §1: B is 78-81%)"
check "computed percentage is 80" "80" "$COMPUTED_PCT"
check "letter grade is B" "B" "$LETTER"

echo "== Submit (as super admin, acting as lecturer role for this test) =="
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH $BASE/course-results/$RESULT_ID/submit -H "$AUTH")
check "submit succeeds" "200" "$CODE"

echo "-- Approve by the SAME user who submitted (super admin) should be blocked (anti-self-approval) --"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH $BASE/course-results/$RESULT_ID/approve -H "$AUTH")
check "self-approval blocked" "403" "$CODE"

echo "== Grant the lecturer account an EXAM_OFFICER role too, to act as a distinct approver =="
echo "   (no 'assign role' admin endpoint exists yet — direct SQL, flagged as a real gap, not pretended away)"
LECTURER_USER_ID=$(echo $LECTURER_JSON | jf "['lecturer']['user']['id']")
LECTURER_TEMP_PASSWORD=$(echo $LECTURER_JSON | jf "['temporaryPassword']")
su postgres -c "psql -d lms_dev -c \"INSERT INTO user_roles (id, \\\"userId\\\", role) VALUES (gen_random_uuid(), '$LECTURER_USER_ID', 'EXAM_OFFICER');\"" > /dev/null

echo "== Log in as that second account and approve, then publish =="
APPROVER_TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"kwilson@university.local\",\"password\":\"$LECTURER_TEMP_PASSWORD\"}" | jf "['accessToken']")
APPROVER_AUTH="Authorization: Bearer $APPROVER_TOKEN"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH $BASE/course-results/$RESULT_ID/approve -H "$APPROVER_AUTH")
check "approval by a different account succeeds" "200" "$CODE"

PUBLISH_JSON=$(curl -s -X PATCH $BASE/course-results/$RESULT_ID/publish -H "$APPROVER_AUTH")
PUBLISH_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH $BASE/course-results/$RESULT_ID/publish -H "$APPROVER_AUTH")
check "re-publish is rejected (already published)" "400" "$PUBLISH_CODE"

CGPA=$(echo $PUBLISH_JSON | jf "['gpa']['cumulativeGpa']")
STATUS=$(echo $PUBLISH_JSON | jf "['gpa']['studentStatus']")
echo "     published. cumulativeGpa=$CGPA studentStatus=$STATUS (B=3.0 points, single course -> CGPA 3.0, ACTIVE)"
check "cumulative GPA computed correctly (3.0 for a single B course)" "3" "$CGPA"
check "student remains ACTIVE (3.0 CGPA is above the 2.0 probation line)" "ACTIVE" "$STATUS"

echo "-- Confirm AcademicRecordEntry was created and CourseRegistration marked COMPLETED --"
REG_STATUS=$(curl -s $BASE/course-offerings/$OFFERING_ID -H "$AUTH" > /dev/null; su postgres -c "psql -d lms_dev -t -c \"SELECT status FROM course_registrations WHERE id='$REGISTRATION_ID';\"" | tr -d ' \n')
check "registration status is COMPLETED" "COMPLETED" "$REG_STATUS"
RECORD_COUNT=$(su postgres -c "psql -d lms_dev -t -c \"SELECT count(*) FROM academic_record_entries WHERE \\\"studentId\\\"='$STUDENT_ID';\"" | tr -d ' \n')
check "one AcademicRecordEntry created" "1" "$RECORD_COUNT"

echo
echo "=== $pass passed, $fail failed ==="
[ "$fail" -eq 0 ]
