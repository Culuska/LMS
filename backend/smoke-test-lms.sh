#!/usr/bin/env bash
# Live end-to-end smoke test of course content, announcements, and notifications.
# Assumes a freshly seeded database.
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

echo "== Setup: faculty/dept/program/course/curriculum/year/semester/lecturer/offering/students =="
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@university.local","password":"ChangeMe123!"}' | jf "['accessToken']")
AUTH="Authorization: Bearer $TOKEN"

FACULTY_ID=$(curl -s -X POST $BASE/faculties -H "$AUTH" -H 'Content-Type: application/json' -d '{"code":"LMS1","name":"LMS Test Faculty"}' | jf "['id']")
DEPT_ID=$(curl -s -X POST $BASE/departments -H "$AUTH" -H 'Content-Type: application/json' -d "{\"facultyId\":\"$FACULTY_ID\",\"code\":\"LMSDEPT\",\"name\":\"LMS Test Dept\"}" | jf "['id']")
PROGRAM_ID=$(curl -s -X POST $BASE/programs -H "$AUTH" -H 'Content-Type: application/json' -d "{\"departmentId\":\"$DEPT_ID\",\"code\":\"LMSPROG\",\"name\":\"LMS Test Program\",\"level\":\"UNDERGRADUATE\"}" | jf "['id']")
COURSE_ID=$(curl -s -X POST $BASE/courses -H "$AUTH" -H 'Content-Type: application/json' -d '{"code":"LMS101","title":"Intro to LMS","credits":3}' | jf "['id']")
CURRICULUM_ID=$(curl -s -X POST $BASE/curriculum-versions -H "$AUTH" -H 'Content-Type: application/json' -d "{\"programId\":\"$PROGRAM_ID\",\"versionLabel\":\"2026 intake\",\"effectiveFrom\":\"2026-09-01\",\"totalCreditsRequired\":120}" | jf "['id']")
curl -s -X POST $BASE/curriculum-versions/$CURRICULUM_ID/courses -H "$AUTH" -H 'Content-Type: application/json' -d "{\"courseId\":\"$COURSE_ID\"}" > /dev/null
YEAR_ID=$(curl -s -X POST $BASE/academic-years -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"2029/2030","startDate":"2029-09-01","endDate":"2030-06-30"}' | jf "['id']")
SEMESTER_ID=$(curl -s -X POST $BASE/semesters -H "$AUTH" -H 'Content-Type: application/json' -d "{\"academicYearId\":\"$YEAR_ID\",\"term\":\"FIRST\",\"startDate\":\"2029-09-01\",\"endDate\":\"2029-12-20\",\"registrationOpensAt\":\"2026-01-01\",\"registrationClosesAt\":\"2030-01-01\",\"withdrawalDeadline\":\"2029-11-01\"}" | jf "['id']")
LECTURER_JSON=$(curl -s -X POST $BASE/users/lecturers -H "$AUTH" -H 'Content-Type: application/json' -d "{\"email\":\"lmslec@university.local\",\"firstName\":\"Lin\",\"lastName\":\"Sung\",\"departmentId\":\"$DEPT_ID\",\"staffNumber\":\"LMSSTF1\"}")
LECTURER_ID=$(echo $LECTURER_JSON | jf "['lecturer']['id']")
LECTURER_PW=$(echo $LECTURER_JSON | jf "['temporaryPassword']")
OFFERING_ID=$(curl -s -X POST $BASE/course-offerings -H "$AUTH" -H 'Content-Type: application/json' -d "{\"courseId\":\"$COURSE_ID\",\"semesterId\":\"$SEMESTER_ID\",\"lecturerId\":\"$LECTURER_ID\",\"capacity\":50}" | jf "['id']")
STUDENT_JSON=$(curl -s -X POST $BASE/users/students -H "$AUTH" -H 'Content-Type: application/json' -d '{"email":"lmsstudent@university.local","firstName":"Lena","lastName":"Marsh","studentNumber":"LMSSTU1","dateOfBirth":"2005-01-01"}')
STUDENT_ID=$(echo $STUDENT_JSON | jf "['student']['id']")
STUDENT_USER_ID=$(echo $STUDENT_JSON | jf "['student']['user']['id']")
STUDENT_PW=$(echo $STUDENT_JSON | jf "['temporaryPassword']")
curl -s -X POST $BASE/enrollments -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"programId\":\"$PROGRAM_ID\",\"curriculumVersionId\":\"$CURRICULUM_ID\"}" > /dev/null
curl -s -X POST $BASE/course-registrations -H "$AUTH" -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT_ID\",\"courseOfferingId\":\"$OFFERING_ID\"}" > /dev/null

LECTURER_TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"lmslec@university.local\",\"password\":\"$LECTURER_PW\"}" | jf "['accessToken']")
LECTURER_AUTH="Authorization: Bearer $LECTURER_TOKEN"
STUDENT_TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"lmsstudent@university.local\",\"password\":\"$STUDENT_PW\"}" | jf "['accessToken']")
STUDENT_AUTH="Authorization: Bearer $STUDENT_TOKEN"

echo
echo "=== COURSE CONTENT ==="
MODULE_ID=$(curl -s -X POST $BASE/course-offerings/$OFFERING_ID/content -H "$LECTURER_AUTH" -H 'Content-Type: application/json' -d '{"title":"Week 1: Introduction","body":"Course overview"}' | jf "['id']")
LESSON_ID=$(curl -s -X POST $BASE/course-offerings/$OFFERING_ID/content -H "$LECTURER_AUTH" -H 'Content-Type: application/json' -d "{\"title\":\"Lesson 1.1\",\"body\":\"What is an LMS?\",\"parentId\":\"$MODULE_ID\"}" | jf "['id']")
CONTENT_LIST=$(curl -s $BASE/course-offerings/$OFFERING_ID/content -H "$STUDENT_AUTH")
check "student can view course content (2 items)" "2" "$(echo $CONTENT_LIST | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")"

echo "-- Deleting a module with a nested lesson should be blocked --"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE $BASE/course-offerings/$OFFERING_ID/content/$MODULE_ID -H "$LECTURER_AUTH")
check "delete blocked while children exist" "400" "$CODE"
curl -s -X DELETE $BASE/course-offerings/$OFFERING_ID/content/$LESSON_ID -H "$LECTURER_AUTH" > /dev/null
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE $BASE/course-offerings/$OFFERING_ID/content/$MODULE_ID -H "$LECTURER_AUTH")
check "delete succeeds once childless" "200" "$CODE"

echo
echo "=== ANNOUNCEMENTS + NOTIFICATIONS ==="
BEFORE_COUNT=$(curl -s $BASE/notifications -H "$STUDENT_AUTH" | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")

echo "-- Lecturer posts a course-scoped announcement --"
curl -s -X POST $BASE/announcements -H "$LECTURER_AUTH" -H 'Content-Type: application/json' -d "{\"title\":\"Midterm date set\",\"body\":\"Midterm is on Oct 15.\",\"courseOfferingId\":\"$OFFERING_ID\"}" > /dev/null

AFTER_COUNT=$(curl -s $BASE/notifications -H "$STUDENT_AUTH" | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")
check "registered student received a notification" "$((BEFORE_COUNT+1))" "$AFTER_COUNT"

NOTIF_JSON=$(curl -s $BASE/notifications -H "$STUDENT_AUTH")
NOTIF_ID=$(echo $NOTIF_JSON | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['id'])")
IS_READ=$(echo $NOTIF_JSON | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['isRead'])")
check "notification starts unread" "False" "$IS_READ"
curl -s -X PATCH $BASE/notifications/$NOTIF_ID/read -H "$STUDENT_AUTH" > /dev/null
NOTIF_JSON2=$(curl -s $BASE/notifications -H "$STUDENT_AUTH")
IS_READ2=$(echo $NOTIF_JSON2 | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['isRead'])")
check "notification marked read" "True" "$IS_READ2"

echo "-- A student cannot mark another user's notification as read --"
OTHER_STUDENT_JSON=$(curl -s -X POST $BASE/users/students -H "$AUTH" -H 'Content-Type: application/json' -d '{"email":"otherstudent@university.local","firstName":"Otto","lastName":"Reyes","studentNumber":"LMSSTU2","dateOfBirth":"2005-02-02"}')
OTHER_PW=$(echo $OTHER_STUDENT_JSON | jf "['temporaryPassword']")
OTHER_TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"otherstudent@university.local\",\"password\":\"$OTHER_PW\"}" | jf "['accessToken']")
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH $BASE/notifications/$NOTIF_ID/read -H "Authorization: Bearer $OTHER_TOKEN")
check "cross-user notification access blocked" "403" "$CODE"

echo "-- Lecturer tries a university-wide announcement (should be forbidden, not Registrar/Super Admin) --"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/announcements -H "$LECTURER_AUTH" -H 'Content-Type: application/json' -d '{"title":"Test","body":"Test body"}')
check "lecturer blocked from university-wide announcement" "403" "$CODE"

echo "-- Super Admin posts a university-wide announcement --"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/announcements -H "$AUTH" -H 'Content-Type: application/json' -d '{"title":"Semester begins","body":"Welcome back!"}')
check "super admin university-wide announcement succeeds" "201" "$CODE"

echo
echo "=== $pass passed, $fail failed ==="
[ "$fail" -eq 0 ]
