#!/usr/bin/env bash
# Live end-to-end smoke test of the grade-change request workflow: request -> approve
# (or deny), including the deliberate exclusion of SUPER_ADMIN from approval and the
# lecturer-ownership check on requests. Assumes a freshly seeded database.
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

echo "== Login as super admin, build fixtures through to a PUBLISHED result =="
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@university.local","password":"ChangeMe123!"}' | jf "['accessToken']")
AUTH="Authorization: Bearer $TOKEN"

FACULTY_ID=$(curl -s -X POST $BASE/faculties -H "$AUTH" -H 'Content-Type: application/json' -d '{"code":"SCI3","name":"Faculty of Science 3"}' | jf "['id']")
DEPT_ID=$(curl -s -X POST $BASE/departments -H "$AUTH" -H 'Content-Type: application/json' -d "{\"facultyId\":\"$FACULTY_ID\",\"code\":\"CS3\",\"name\":\"Computer Science 3\"}" | jf "['id']")
PROGRAM_ID=$(curl -s -X POST $BASE/programs -H "$AUTH" -H 'Content-Type: application/json' -d "{\"departmentId\":\"$DEPT_ID\",\"code\":\"BSCCS3\",\"name\":\"BSc CS 3\",\"level\":\"UNDERGRADUATE\"}" | jf "['id']")
COURSE_ID=$(curl -s -X POST $BASE/courses -H "$AUTH" -H 'Content-Type: application/json' -d '{"code":"CS120","title":"Algorithms","credits":3}' | jf "['id']")
CURRICULUM_ID=$(curl -s -X POST $BASE/curriculum-versions -H "$AUTH" -H 'Content-Type: application/json' -d "{\"programId\":\"$PROGRAM_ID\",\"versionLabel\":\"2026 intake\",\"effectiveFrom\":\"2026-09-01\",\"totalCreditsRequired\":120}" | jf "['id']")
curl -s -X POST $BASE/curriculum-versions/$CURRICULUM_ID/courses -H "$AUTH" -H 'Content-Type: application/json' -d "{\"courseId\":\"$COURSE_ID\"}" > /dev/null
YEAR_ID=$(curl -s -X POST $BASE/academic-years -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"2028/2029","startDate":"2028-09-01","endDate":"2029-06-30"}' | jf "['id']")
SEMESTER_ID=$(curl -s -X POST $BASE/semesters -H "$AUTH" -H 'Content-Type: application/json' -d "{\"academicYearId\":\"$YEAR_ID\",\"term\":\"FIRST\",\"startDate\":\"2028-09-01\",\"endDate\":\"2028-12-20\",\"registrationOpensAt\":\"2026-01-01\",\"registrationClosesAt\":\"2029-01-01\",\"withdrawalDeadline\":\"2028-11-01\"}" | jf "['id']")

# Two lecturers: one teaches the course (Lecturer A), one doesn't (Lecturer B) — used to
# prove the ownership check on grade-change requests.
LECTURER_A_JSON=$(curl -s -X POST $BASE/users/lecturers -H "$AUTH" -H 'Content-Type: application/json' -d "{\"email\":\"lecA@university.local\",\"firstName\":\"Amara\",\"lastName\":\"Diallo\",\"departmentId\":\"$DEPT_ID\",\"staffNumber\":\"STF010\"}")
LECTURER_A_ID=$(echo $LECTURER_A_JSON | jf "['lecturer']['id']")
LECTURER_A_USER_ID=$(echo $LECTURER_A_JSON | jf "['lecturer']['user']['id']")
LECTURER_A_PW=$(echo $LECTURER_A_JSON | jf "['temporaryPassword']")
LECTURER_B_JSON=$(curl -s -X POST $BASE/users/lecturers -H "$AUTH" -H 'Content-Type: application/json' -d "{\"email\":\"lecB@university.local\",\"firstName\":\"Boas\",\"lastName\":\"Nyeri\",\"departmentId\":\"$DEPT_ID\",\"staffNumber\":\"STF011\"}")
LECTURER_B_PW=$(echo $LECTURER_B_JSON | jf "['temporaryPassword']")

# Exam Officer account, distinct from everyone above (no role-assignment endpoint yet —
# same documented gap as smoke-test-grading.sh; direct SQL, not hidden).
EO_JSON=$(curl -s -X POST $BASE/users/students -H "$AUTH" -H 'Content-Type: application/json' -d '{"email":"examofficer@university.local","firstName":"Nadia","lastName":"Examofficer","studentNumber":"STAFFEO1","dateOfBirth":"1990-01-01"}')
EO_USER_ID=$(echo $EO_JSON | jf "['student']['user']['id']")
EO_PW=$(echo $EO_JSON | jf "['temporaryPassword']")
su postgres -c "psql -d lms_dev -c \"INSERT INTO user_roles (id, \\\"userId\\\", role) VALUES (gen_random_uuid(), '$EO_USER_ID', 'EXAM_OFFICER');\"" > /dev/null

OFFERING_ID=$(curl -s -X POST $BASE/course-offerings -H "$AUTH" -H 'Content-Type: application/json' -d "{\"courseId\":\"$COURSE_ID\",\"semesterId\":\"$SEMESTER_ID\",\"lecturerId\":\"$LECTURER_A_ID\",\"capacity\":50}" | jf "['id']")
STUDENT_JSON=$(curl -s -X POST $BASE/users/students -H "$AUTH" -H 'Content-Type: application/json' -d '{"email":"gcstudent@university.local","firstName":"Grace","lastName":"Chen","studentNumber":"STU020","dateOfBirth":"2005-06-01"}')
STUDENT_ID=$(echo $STUDENT_JSON | jf "['student']['id']")
curl -s -X POST $BASE/enrollments -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"programId\":\"$PROGRAM_ID\",\"curriculumVersionId\":\"$CURRICULUM_ID\"}" > /dev/null
REGISTRATION_ID=$(curl -s -X POST $BASE/course-registrations -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"courseOfferingId\":\"$OFFERING_ID\"}" | jf "['id']")

# Offering defaults to the 40/20/40 CA/Midterm/Final split — three items matching it.
ITEM_CA=$(curl -s -X POST $BASE/course-offerings/$OFFERING_ID/assessment-items -H "$AUTH" -H 'Content-Type: application/json' -d '{"type":"ASSIGNMENT","title":"Assignment 1","weight":40,"maxMarks":100}' | jf "['id']")
ITEM_MID=$(curl -s -X POST $BASE/course-offerings/$OFFERING_ID/assessment-items -H "$AUTH" -H 'Content-Type: application/json' -d '{"type":"MIDTERM","title":"Midterm","weight":20,"maxMarks":100}' | jf "['id']")
ITEM_FIN=$(curl -s -X POST $BASE/course-offerings/$OFFERING_ID/assessment-items -H "$AUTH" -H 'Content-Type: application/json' -d '{"type":"FINAL","title":"Final Exam","weight":40,"maxMarks":100}' | jf "['id']")
curl -s -X PUT $BASE/assessment-items/$ITEM_CA/marks -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"score\":80}" > /dev/null
curl -s -X PUT $BASE/assessment-items/$ITEM_MID/marks -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"score\":60}" > /dev/null
curl -s -X PUT $BASE/assessment-items/$ITEM_FIN/marks -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"score\":90}" > /dev/null
RESULT_ID=$(curl -s -X POST $BASE/course-results/compute/$REGISTRATION_ID -H "$AUTH" | jf "['id']")
curl -s -X PATCH $BASE/course-results/$RESULT_ID/submit -H "$AUTH" > /dev/null

LECTURER_A_TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"lecA@university.local\",\"password\":\"$LECTURER_A_PW\"}" | jf "['accessToken']")
LECTURER_A_AUTH="Authorization: Bearer $LECTURER_A_TOKEN"
LECTURER_B_TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"lecB@university.local\",\"password\":\"$LECTURER_B_PW\"}" | jf "['accessToken']")
LECTURER_B_AUTH="Authorization: Bearer $LECTURER_B_TOKEN"
EO_TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"examofficer@university.local\",\"password\":\"$EO_PW\"}" | jf "['accessToken']")
EO_AUTH="Authorization: Bearer $EO_TOKEN"

curl -s -X PATCH $BASE/course-results/$RESULT_ID/approve -H "$EO_AUTH" > /dev/null
PUBLISH_JSON=$(curl -s -X PATCH $BASE/course-results/$RESULT_ID/publish -H "$EO_AUTH")
echo "     published at 80% -> B, cumulativeGpa=$(echo $PUBLISH_JSON | jf "['gpa']['cumulativeGpa']")"

echo
echo "=== GRADE-CHANGE WORKFLOW TESTS ==="

echo "-- Lecturer B (not assigned to this offering) tries to request a change -> blocked --"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/course-results/$RESULT_ID/grade-change-requests -H "$LECTURER_B_AUTH" -H 'Content-Type: application/json' -d '{"newPercentage":95,"reason":"Marking error found on re-check"}')
check "unaffiliated lecturer blocked from requesting" "403" "$CODE"

echo "-- Lecturer A (the actual course lecturer) requests a correction to 95% --"
REQUEST_JSON=$(curl -s -X POST $BASE/course-results/$RESULT_ID/grade-change-requests -H "$LECTURER_A_AUTH" -H 'Content-Type: application/json' -d '{"newPercentage":95,"reason":"Marking error found on re-check, final exam script re-graded"}')
REQUEST_ID=$(echo $REQUEST_JSON | jf "['id']")
STATUS=$(echo $REQUEST_JSON | jf "['status']")
check "request created with PENDING status" "PENDING" "$STATUS"

echo "-- Super Admin tries to approve it -> blocked (RBAC table deliberately excludes Super Admin here) --"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH $BASE/grade-change-requests/$REQUEST_ID/approve -H "$AUTH")
check "super admin cannot approve a grade change" "403" "$CODE"

echo "-- Exam Officer approves it --"
APPROVE_JSON=$(curl -s -X PATCH $BASE/grade-change-requests/$REQUEST_ID/approve -H "$EO_AUTH")
NEW_LETTER=$(echo $APPROVE_JSON | jf "['newLetterGrade']")
NEW_CGPA=$(echo $APPROVE_JSON | jf "['gpa']['cumulativeGpa']")
check "new letter grade is A (95% falls in the 90-96 band)" "A" "$NEW_LETTER"
check "CGPA recomputed to 4.0 (single course, now A=4.0 points)" "4" "$NEW_CGPA"

echo "-- Confirm the AcademicRecordEntry itself was corrected, not just the internal CourseResult --"
RECORD_LETTER=$(su postgres -c "psql -d lms_dev -t -c \"SELECT \\\"letterGrade\\\" FROM academic_record_entries WHERE \\\"studentId\\\"='$STUDENT_ID';\"" | tr -d ' \n')
check "AcademicRecordEntry letterGrade corrected to A" "A" "$RECORD_LETTER"

echo "-- Approving the same request again -> blocked (already decided) --"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH $BASE/grade-change-requests/$REQUEST_ID/approve -H "$EO_AUTH")
check "re-approving an already-approved request blocked" "400" "$CODE"

echo "-- A second request, this time denied --"
REQUEST2_JSON=$(curl -s -X POST $BASE/course-results/$RESULT_ID/grade-change-requests -H "$LECTURER_A_AUTH" -H 'Content-Type: application/json' -d '{"newPercentage":50,"reason":"Testing the denial path for this smoke test"}')
REQUEST2_ID=$(echo $REQUEST2_JSON | jf "['id']")
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH $BASE/grade-change-requests/$REQUEST2_ID/deny -H "$EO_AUTH")
check "deny succeeds" "200" "$CODE"
UNCHANGED_LETTER=$(su postgres -c "psql -d lms_dev -t -c \"SELECT \\\"letterGrade\\\" FROM course_results WHERE id='$RESULT_ID';\"" | tr -d ' \n')
check "a denied request does not change the result (still A)" "A" "$UNCHANGED_LETTER"

echo
echo "=== $pass passed, $fail failed ==="
[ "$fail" -eq 0 ]
