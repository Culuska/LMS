#!/usr/bin/env bash
# Live end-to-end smoke test of the transcript endpoint. Builds a fixture through to a
# published result (reusing the same pattern as smoke-test-grading.sh) then checks the
# transcript reflects it, and that access control (self / staff / cross-student) holds.
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

echo "== Build a fixture through to a published result =="
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@university.local","password":"ChangeMe123!"}' | jf "['accessToken']")
AUTH="Authorization: Bearer $TOKEN"

FACULTY_ID=$(curl -s -X POST $BASE/faculties -H "$AUTH" -H 'Content-Type: application/json' -d '{"code":"TRX1","name":"Transcript Test Faculty"}' | jf "['id']")
DEPT_ID=$(curl -s -X POST $BASE/departments -H "$AUTH" -H 'Content-Type: application/json' -d "{\"facultyId\":\"$FACULTY_ID\",\"code\":\"TRXDEPT\",\"name\":\"Transcript Test Dept\"}" | jf "['id']")
PROGRAM_ID=$(curl -s -X POST $BASE/programs -H "$AUTH" -H 'Content-Type: application/json' -d "{\"departmentId\":\"$DEPT_ID\",\"code\":\"TRXPROG\",\"name\":\"Transcript Test Program\",\"level\":\"UNDERGRADUATE\"}" | jf "['id']")
COURSE_ID=$(curl -s -X POST $BASE/courses -H "$AUTH" -H 'Content-Type: application/json' -d '{"code":"TRX101","title":"Transcript Systems","credits":4}' | jf "['id']")
CURRICULUM_ID=$(curl -s -X POST $BASE/curriculum-versions -H "$AUTH" -H 'Content-Type: application/json' -d "{\"programId\":\"$PROGRAM_ID\",\"versionLabel\":\"2026 intake\",\"effectiveFrom\":\"2026-09-01\",\"totalCreditsRequired\":120}" | jf "['id']")
curl -s -X POST $BASE/curriculum-versions/$CURRICULUM_ID/courses -H "$AUTH" -H 'Content-Type: application/json' -d "{\"courseId\":\"$COURSE_ID\"}" > /dev/null
YEAR_ID=$(curl -s -X POST $BASE/academic-years -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"2030/2031","startDate":"2030-09-01","endDate":"2031-06-30"}' | jf "['id']")
SEMESTER_ID=$(curl -s -X POST $BASE/semesters -H "$AUTH" -H 'Content-Type: application/json' -d "{\"academicYearId\":\"$YEAR_ID\",\"term\":\"FIRST\",\"startDate\":\"2030-09-01\",\"endDate\":\"2030-12-20\",\"registrationOpensAt\":\"2026-01-01\",\"registrationClosesAt\":\"2031-01-01\",\"withdrawalDeadline\":\"2030-11-01\"}" | jf "['id']")
LECTURER_JSON=$(curl -s -X POST $BASE/users/lecturers -H "$AUTH" -H 'Content-Type: application/json' -d "{\"email\":\"trxlec@university.local\",\"firstName\":\"Trina\",\"lastName\":\"Xu\",\"departmentId\":\"$DEPT_ID\",\"staffNumber\":\"TRXSTF1\"}")
LECTURER_ID=$(echo $LECTURER_JSON | jf "['lecturer']['id']")
LECTURER_USER_ID=$(echo $LECTURER_JSON | jf "['lecturer']['user']['id']")
LECTURER_PW=$(echo $LECTURER_JSON | jf "['temporaryPassword']")
su postgres -c "psql -d lms_dev -c \"INSERT INTO user_roles (id, \\\"userId\\\", role) VALUES (gen_random_uuid(), '$LECTURER_USER_ID', 'EXAM_OFFICER');\"" > /dev/null
OFFERING_ID=$(curl -s -X POST $BASE/course-offerings -H "$AUTH" -H 'Content-Type: application/json' -d "{\"courseId\":\"$COURSE_ID\",\"semesterId\":\"$SEMESTER_ID\",\"lecturerId\":\"$LECTURER_ID\",\"capacity\":50}" | jf "['id']")

STUDENT_JSON=$(curl -s -X POST $BASE/users/students -H "$AUTH" -H 'Content-Type: application/json' -d '{"email":"trxstudent@university.local","firstName":"Trey","lastName":"Osei","studentNumber":"TRXSTU1","dateOfBirth":"2005-01-01"}')
STUDENT_ID=$(echo $STUDENT_JSON | jf "['student']['id']")
STUDENT_PW=$(echo $STUDENT_JSON | jf "['temporaryPassword']")
curl -s -X POST $BASE/enrollments -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"programId\":\"$PROGRAM_ID\",\"curriculumVersionId\":\"$CURRICULUM_ID\"}" > /dev/null
REGISTRATION_ID=$(curl -s -X POST $BASE/course-registrations -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"courseOfferingId\":\"$OFFERING_ID\"}" | jf "['id']")

ITEM_ID=$(curl -s -X POST $BASE/course-offerings/$OFFERING_ID/assessment-items -H "$AUTH" -H 'Content-Type: application/json' -d '{"type":"FINAL","title":"Final","weight":40,"maxMarks":100}' | jf "['id']")
curl -s -X POST $BASE/course-offerings/$OFFERING_ID/assessment-items -H "$AUTH" -H 'Content-Type: application/json' -d '{"type":"ASSIGNMENT","title":"CA","weight":40,"maxMarks":100}' > /dev/null
ITEM2_ID=$(curl -s $BASE/course-offerings/$OFFERING_ID/assessment-items -H "$AUTH" | python3 -c "import json,sys;items=json.load(sys.stdin);print([i['id'] for i in items if i['type']=='ASSIGNMENT'][0])")
curl -s -X POST $BASE/course-offerings/$OFFERING_ID/assessment-items -H "$AUTH" -H 'Content-Type: application/json' -d '{"type":"MIDTERM","title":"Mid","weight":20,"maxMarks":100}' > /dev/null
ITEM3_ID=$(curl -s $BASE/course-offerings/$OFFERING_ID/assessment-items -H "$AUTH" | python3 -c "import json,sys;items=json.load(sys.stdin);print([i['id'] for i in items if i['type']=='MIDTERM'][0])")
curl -s -X PUT $BASE/assessment-items/$ITEM_ID/marks -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"score\":90}" > /dev/null
curl -s -X PUT $BASE/assessment-items/$ITEM2_ID/marks -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"score\":90}" > /dev/null
curl -s -X PUT $BASE/assessment-items/$ITEM3_ID/marks -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"score\":90}" > /dev/null
RESULT_ID=$(curl -s -X POST $BASE/course-results/compute/$REGISTRATION_ID -H "$AUTH" | jf "['id']")
curl -s -X PATCH $BASE/course-results/$RESULT_ID/submit -H "$AUTH" > /dev/null

LECTURER_TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"trxlec@university.local\",\"password\":\"$LECTURER_PW\"}" | jf "['accessToken']")
LECTURER_AUTH="Authorization: Bearer $LECTURER_TOKEN"
curl -s -X PATCH $BASE/course-results/$RESULT_ID/approve -H "$LECTURER_AUTH" > /dev/null
curl -s -X PATCH $BASE/course-results/$RESULT_ID/publish -H "$LECTURER_AUTH" > /dev/null

STUDENT_TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"trxstudent@university.local\",\"password\":\"$STUDENT_PW\"}" | jf "['accessToken']")
STUDENT_AUTH="Authorization: Bearer $STUDENT_TOKEN"

echo
echo "=== TRANSCRIPT ==="
TRANSCRIPT=$(curl -s $BASE/students/$STUDENT_ID/transcript -H "$STUDENT_AUTH")
check "student can view own transcript" "TRXSTU1" "$(echo $TRANSCRIPT | jf "['student']['studentNumber']")"
check "transcript shows 1 semester" "1" "$(echo $TRANSCRIPT | python3 -c "import json,sys;print(len(json.load(sys.stdin)['semesters']))")"
check "course appears with credits" "4" "$(echo $TRANSCRIPT | jf "['semesters'][0]['courses'][0]['credits']")"
check "letter grade is A (90%)" "A" "$(echo $TRANSCRIPT | jf "['semesters'][0]['courses'][0]['letterGrade']")"
check "credits attempted = 4" "4" "$(echo $TRANSCRIPT | jf "['totalCreditsAttempted']")"
check "credits earned = 4 (passing grade)" "4" "$(echo $TRANSCRIPT | jf "['totalCreditsEarned']")"
check "cumulative GPA = 4.0" "4" "$(echo $TRANSCRIPT | jf "['cumulativeGpa']")"

echo "-- Exam Officer (staff) can view it too --"
CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE/students/$STUDENT_ID/transcript -H "$LECTURER_AUTH")
check "exam officer staff access succeeds" "200" "$CODE"

echo "-- A different student cannot view this student's transcript --"
OTHER_JSON=$(curl -s -X POST $BASE/users/students -H "$AUTH" -H 'Content-Type: application/json' -d '{"email":"trxother@university.local","firstName":"Otis","lastName":"Bell","studentNumber":"TRXSTU2","dateOfBirth":"2005-03-03"}')
OTHER_PW=$(echo $OTHER_JSON | jf "['temporaryPassword']")
OTHER_TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"trxother@university.local\",\"password\":\"$OTHER_PW\"}" | jf "['accessToken']")
CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE/students/$STUDENT_ID/transcript -H "Authorization: Bearer $OTHER_TOKEN")
check "cross-student transcript access blocked" "403" "$CODE"

echo
echo "=== $pass passed, $fail failed ==="
[ "$fail" -eq 0 ]
