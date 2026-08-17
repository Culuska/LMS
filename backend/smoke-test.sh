#!/usr/bin/env bash
# Live end-to-end smoke test of the core registration business rules.
# Not part of CI (needs a running server + seeded DB) — a manual verification script
# for this development pass. Superseded by proper e2e tests as those get written.
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

echo "== Login as super admin =="
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@university.local","password":"ChangeMe123!"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['accessToken'])")
AUTH="Authorization: Bearer $TOKEN"

echo "== Create faculty/department/program =="
FACULTY=$(curl -s -X POST $BASE/faculties -H "$AUTH" -H 'Content-Type: application/json' -d '{"code":"SCI","name":"Faculty of Science"}')
FACULTY_ID=$(echo $FACULTY | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
DEPT=$(curl -s -X POST $BASE/departments -H "$AUTH" -H 'Content-Type: application/json' -d "{\"facultyId\":\"$FACULTY_ID\",\"code\":\"CS\",\"name\":\"Computer Science\"}")
DEPT_ID=$(echo $DEPT | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
PROGRAM=$(curl -s -X POST $BASE/programs -H "$AUTH" -H 'Content-Type: application/json' -d "{\"departmentId\":\"$DEPT_ID\",\"code\":\"BSCCS\",\"name\":\"BSc Computer Science\",\"level\":\"UNDERGRADUATE\"}")
PROGRAM_ID=$(echo $PROGRAM | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")

echo "== Create courses CS101 and CS201 (CS201 requires CS101) =="
CS101=$(curl -s -X POST $BASE/courses -H "$AUTH" -H 'Content-Type: application/json' -d '{"code":"CS101","title":"Intro to Programming","credits":3}')
CS101_ID=$(echo $CS101 | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
CS201=$(curl -s -X POST $BASE/courses -H "$AUTH" -H 'Content-Type: application/json' -d '{"code":"CS201","title":"Data Structures","credits":3}')
CS201_ID=$(echo $CS201 | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
curl -s -X POST $BASE/courses/$CS201_ID/prerequisites -H "$AUTH" -H 'Content-Type: application/json' -d "{\"prerequisiteCourseId\":\"$CS101_ID\"}" > /dev/null

echo "== Create curriculum version with both courses =="
CURRICULUM=$(curl -s -X POST $BASE/curriculum-versions -H "$AUTH" -H 'Content-Type: application/json' -d "{\"programId\":\"$PROGRAM_ID\",\"versionLabel\":\"2026 intake\",\"effectiveFrom\":\"2026-09-01\",\"totalCreditsRequired\":120}")
CURRICULUM_ID=$(echo $CURRICULUM | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
curl -s -X POST $BASE/curriculum-versions/$CURRICULUM_ID/courses -H "$AUTH" -H 'Content-Type: application/json' -d "{\"courseId\":\"$CS101_ID\"}" > /dev/null
curl -s -X POST $BASE/curriculum-versions/$CURRICULUM_ID/courses -H "$AUTH" -H 'Content-Type: application/json' -d "{\"courseId\":\"$CS201_ID\"}" > /dev/null

echo "== Create academic year + semester with registration open now =="
YEAR=$(curl -s -X POST $BASE/academic-years -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"2026/2027","startDate":"2026-09-01","endDate":"2027-06-30"}')
YEAR_ID=$(echo $YEAR | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
SEMESTER=$(curl -s -X POST $BASE/semesters -H "$AUTH" -H 'Content-Type: application/json' -d "{\"academicYearId\":\"$YEAR_ID\",\"term\":\"FIRST\",\"startDate\":\"2026-09-01\",\"endDate\":\"2026-12-20\",\"registrationOpensAt\":\"2026-01-01\",\"registrationClosesAt\":\"2027-01-01\",\"withdrawalDeadline\":\"2026-11-01\"}")
SEMESTER_ID=$(echo $SEMESTER | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")

echo "== Create lecturer =="
LECTURER=$(curl -s -X POST $BASE/users/lecturers -H "$AUTH" -H 'Content-Type: application/json' -d '{"email":"jsmith@university.local","firstName":"Jane","lastName":"Smith","departmentId":"'$DEPT_ID'","staffNumber":"STF001"}')
LECTURER_ID=$(echo $LECTURER | python3 -c "import json,sys;print(json.load(sys.stdin)['lecturer']['id'])")

echo "== Create course offerings for CS101 and CS201 =="
OFFERING_101=$(curl -s -X POST $BASE/course-offerings -H "$AUTH" -H 'Content-Type: application/json' -d "{\"courseId\":\"$CS101_ID\",\"semesterId\":\"$SEMESTER_ID\",\"lecturerId\":\"$LECTURER_ID\",\"capacity\":50}")
OFFERING_101_ID=$(echo $OFFERING_101 | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
OFFERING_201=$(curl -s -X POST $BASE/course-offerings -H "$AUTH" -H 'Content-Type: application/json' -d "{\"courseId\":\"$CS201_ID\",\"semesterId\":\"$SEMESTER_ID\",\"lecturerId\":\"$LECTURER_ID\",\"capacity\":50}")
OFFERING_201_ID=$(echo $OFFERING_201 | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")

echo "== Create student =="
STUDENT=$(curl -s -X POST $BASE/users/students -H "$AUTH" -H 'Content-Type: application/json' -d '{"email":"asharma@university.local","firstName":"Amina","lastName":"Sharma","studentNumber":"STU001","dateOfBirth":"2006-05-01"}')
STUDENT_ID=$(echo $STUDENT | python3 -c "import json,sys;print(json.load(sys.stdin)['student']['id'])")

echo
echo "=== RULE TESTS ==="

echo "-- Register for CS201 before any enrollment exists (should fail: no active enrollment) --"
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/course-registrations -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"courseOfferingId\":\"$OFFERING_201_ID\"}")
check "registration blocked with no enrollment" "400" "$RESP"

echo "-- Enroll student in the program --"
curl -s -X POST $BASE/enrollments -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"programId\":\"$PROGRAM_ID\",\"curriculumVersionId\":\"$CURRICULUM_ID\"}" > /dev/null

echo "-- Register for CS201 now (should fail: prerequisite CS101 not passed) --"
RESP=$(curl -s -X POST $BASE/course-registrations -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"courseOfferingId\":\"$OFFERING_201_ID\"}")
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/course-registrations -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"courseOfferingId\":\"$OFFERING_201_ID\"}")
check "registration blocked on missing prerequisite" "400" "$CODE"
echo "     ($(echo $RESP | python3 -c "import json,sys;print(json.load(sys.stdin).get('message'))"))"

echo "-- Register for CS101 (no prerequisites, should succeed) --"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/course-registrations -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"courseOfferingId\":\"$OFFERING_101_ID\"}")
check "CS101 registration succeeds" "201" "$CODE"

echo "-- Register for CS101 again (duplicate, should fail) --"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/course-registrations -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"courseOfferingId\":\"$OFFERING_101_ID\"}")
check "duplicate CS101 registration blocked" "409" "$CODE"

echo "-- Simulate CS101 completion with a passing grade (direct DB insert — grading pipeline not built yet) --"
su postgres -c "psql -d lms_dev -c \"INSERT INTO academic_record_entries (id, \\\"studentId\\\", \\\"courseCode\\\", \\\"courseTitle\\\", credits, \\\"letterGrade\\\", \\\"gradePoints\\\", \\\"semesterName\\\") VALUES (gen_random_uuid(), '$STUDENT_ID', 'CS101', 'Intro to Programming', 3, 'B', 3.0, '2026 FIRST');\"" > /dev/null

echo "-- Register for CS201 now (prerequisite satisfied, should succeed) --"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/course-registrations -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"courseOfferingId\":\"$OFFERING_201_ID\"}")
check "CS201 registration succeeds after prerequisite met" "201" "$CODE"

echo
echo "=== $pass passed, $fail failed ==="
[ "$fail" -eq 0 ]
