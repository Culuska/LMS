#!/usr/bin/env bash
# Live end-to-end smoke test of the admissions workflow, including the minor/guardian-
# consent gate (Somalia DPA Act). Assumes a freshly seeded database.
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

echo "== Setup: faculty/dept/program =="
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@university.local","password":"ChangeMe123!"}' | jf "['accessToken']")
AUTH="Authorization: Bearer $TOKEN"
FACULTY_ID=$(curl -s -X POST $BASE/faculties -H "$AUTH" -H 'Content-Type: application/json' -d '{"code":"ADM1","name":"Admissions Test Faculty"}' | jf "['id']")
DEPT_ID=$(curl -s -X POST $BASE/departments -H "$AUTH" -H 'Content-Type: application/json' -d "{\"facultyId\":\"$FACULTY_ID\",\"code\":\"ADMDEPT\",\"name\":\"Admissions Test Dept\"}" | jf "['id']")
PROGRAM_ID=$(curl -s -X POST $BASE/programs -H "$AUTH" -H 'Content-Type: application/json' -d "{\"departmentId\":\"$DEPT_ID\",\"code\":\"ADMPROG\",\"name\":\"Admissions Test Program\",\"level\":\"UNDERGRADUATE\"}" | jf "['id']")

echo
echo "=== APPLICATION SUBMISSION (public, no auth) ==="
echo "-- Adult applicant submits successfully --"
ADULT_APP=$(curl -s -X POST $BASE/applications -H 'Content-Type: application/json' -d "{\"programId\":\"$PROGRAM_ID\",\"firstName\":\"Adama\",\"lastName\":\"Toure\",\"email\":\"adama@example.com\",\"dateOfBirth\":\"2003-01-01\"}")
ADULT_APP_ID=$(echo $ADULT_APP | jf "['id']")
check "adult application submitted with SUBMITTED status" "SUBMITTED" "$(echo $ADULT_APP | jf "['status']")"

echo "-- Minor applicant WITHOUT guardian info is rejected --"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/applications -H 'Content-Type: application/json' -d "{\"programId\":\"$PROGRAM_ID\",\"firstName\":\"Kofi\",\"lastName\":\"Boateng\",\"email\":\"kofi@example.com\",\"dateOfBirth\":\"2012-01-01\"}")
check "minor without guardian info rejected" "400" "$CODE"

echo "-- Minor applicant WITH guardian info succeeds --"
MINOR_APP=$(curl -s -X POST $BASE/applications -H 'Content-Type: application/json' -d "{\"programId\":\"$PROGRAM_ID\",\"firstName\":\"Kofi\",\"lastName\":\"Boateng\",\"email\":\"kofi@example.com\",\"dateOfBirth\":\"2012-01-01\",\"guardianName\":\"Ama Boateng\",\"guardianEmail\":\"ama@example.com\"}")
MINOR_APP_ID=$(echo $MINOR_APP | jf "['id']")
check "minor application with guardian info submitted" "SUBMITTED" "$(echo $MINOR_APP | jf "['status']")"

echo
echo "=== STAFF REVIEW WORKFLOW ==="
echo "-- Unauthenticated caller cannot list applications --"
CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE/applications)
check "unauthenticated list blocked" "401" "$CODE"

echo "-- Registrar/Admissions staff can list --"
LIST=$(curl -s $BASE/applications -H "$AUTH")
check "at least 2 applications visible to staff" "True" "$(python3 -c "print(len([a for a in __import__('json').loads('''$LIST''') ]) >= 2)")"

echo "-- Move adult application through UNDER_REVIEW -> OFFERED --"
curl -s -X PATCH $BASE/applications/$ADULT_APP_ID/status -H "$AUTH" -H 'Content-Type: application/json' -d '{"status":"UNDER_REVIEW"}' > /dev/null
OFFER_RESULT=$(curl -s -X PATCH $BASE/applications/$ADULT_APP_ID/status -H "$AUTH" -H 'Content-Type: application/json' -d '{"status":"OFFERED"}')
check "adult application now OFFERED" "OFFERED" "$(echo $OFFER_RESULT | jf "['status']")"

echo "-- Minor application (guardian consent on file) can also progress --"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH $BASE/applications/$MINOR_APP_ID/status -H "$AUTH" -H 'Content-Type: application/json' -d '{"status":"UNDER_REVIEW"}')
check "minor with consent on file can progress" "200" "$CODE"

echo
echo "=== ACCEPTANCE -> STUDENT CONVERSION ==="
echo "-- Cannot accept an application that isn't OFFERED --"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/applications/$MINOR_APP_ID/accept -H "$AUTH")
check "accept blocked for non-OFFERED application" "400" "$CODE"

echo "-- Accept the OFFERED adult application --"
ACCEPT_RESULT=$(curl -s -X POST $BASE/applications/$ADULT_APP_ID/accept -H "$AUTH")
STUDENT_NUMBER=$(echo $ACCEPT_RESULT | jf "['studentNumber']")
echo "     created student number: $STUDENT_NUMBER"
check "student account created" "true" "$([ -n "$STUDENT_NUMBER" ] && echo true || echo false)"

FINAL_APP=$(curl -s $BASE/applications/$ADULT_APP_ID -H "$AUTH")
check "application status is now ACCEPTED" "ACCEPTED" "$(echo $FINAL_APP | jf "['status']")"

TEMP_PW=$(echo $ACCEPT_RESULT | jf "['temporaryPassword']")
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"adama@example.com\",\"password\":\"$TEMP_PW\"}")
check "new student account can log in" "200" "$CODE"

echo "-- Re-accepting the same (now ACCEPTED) application is blocked --"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/applications/$ADULT_APP_ID/accept -H "$AUTH")
check "double-accept blocked" "400" "$CODE"

echo
echo "=== $pass passed, $fail failed ==="
[ "$fail" -eq 0 ]
