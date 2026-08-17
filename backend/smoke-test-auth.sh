#!/usr/bin/env bash
# Live end-to-end smoke test of password reset, change-password, and role assignment.
# Assumes a freshly seeded database and requires reading the server's stdout log to grab
# the reset token (the "email" is a console-log stub — see src/email/email.service.ts).
set -euo pipefail
BASE=http://localhost:3000
SERVER_LOG="${SERVER_LOG:?Set SERVER_LOG to the running backend server log file path}"
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

echo "== Login as super admin (seeded password) =="
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@university.local","password":"ChangeMe123!"}' | jf "['accessToken']")
AUTH="Authorization: Bearer $TOKEN"

echo
echo "=== PASSWORD RESET ==="
echo "-- forgot-password response is identical for a real vs. nonexistent account --"
REAL=$(curl -s -X POST $BASE/auth/forgot-password -H 'Content-Type: application/json' -d '{"email":"admin@university.local"}')
FAKE=$(curl -s -X POST $BASE/auth/forgot-password -H 'Content-Type: application/json' -d '{"email":"nosuchuser@university.local"}')
check "identical response (no account enumeration)" "$REAL" "$FAKE"

sleep 1
RAW_TOKEN=$(grep -oE '^[A-Za-z0-9_-]{40,}$' "$SERVER_LOG" | tail -1)

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/auth/reset-password -H 'Content-Type: application/json' -d '{"token":"garbage-token","newPassword":"NewPass123"}')
check "garbage token rejected" "400" "$CODE"

curl -s -X POST $BASE/auth/reset-password -H 'Content-Type: application/json' -d "{\"token\":\"$RAW_TOKEN\",\"newPassword\":\"NewPass123\"}" > /dev/null
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@university.local","password":"ChangeMe123!"}')
check "old password no longer works" "401" "$CODE"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@university.local","password":"NewPass123"}')
check "new password works" "200" "$CODE"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/auth/reset-password -H 'Content-Type: application/json' -d "{\"token\":\"$RAW_TOKEN\",\"newPassword\":\"AnotherPass\"}")
check "reset token is single-use" "400" "$CODE"

echo
echo "=== CHANGE PASSWORD (authenticated) ==="
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@university.local","password":"NewPass123"}' | jf "['accessToken']")
AUTH="Authorization: Bearer $TOKEN"
ME=$(curl -s $BASE/auth/me -H "$AUTH")
check "mustChangePassword is false after reset" "False" "$(echo $ME | jf "['mustChangePassword']")"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/auth/change-password -H "$AUTH" -H 'Content-Type: application/json' -d '{"currentPassword":"wrong","newPassword":"AnotherPass456"}')
check "wrong current password rejected" "401" "$CODE"
curl -s -X POST $BASE/auth/change-password -H "$AUTH" -H 'Content-Type: application/json' -d '{"currentPassword":"NewPass123","newPassword":"AnotherPass456"}' > /dev/null
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@university.local","password":"AnotherPass456"}')
check "changed password works" "200" "$CODE"

echo
echo "=== ROLE ASSIGNMENT ==="
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@university.local","password":"AnotherPass456"}' | jf "['accessToken']")
AUTH="Authorization: Bearer $TOKEN"

FACULTY_ID=$(curl -s -X POST $BASE/faculties -H "$AUTH" -H 'Content-Type: application/json' -d '{"code":"ROLETEST","name":"Role Test Faculty"}' | jf "['id']")
DEPT_ID=$(curl -s -X POST $BASE/departments -H "$AUTH" -H 'Content-Type: application/json' -d "{\"facultyId\":\"$FACULTY_ID\",\"code\":\"RTDEPT\",\"name\":\"Role Test Dept\"}" | jf "['id']")
LECTURER_JSON=$(curl -s -X POST $BASE/users/lecturers -H "$AUTH" -H 'Content-Type: application/json' -d "{\"email\":\"roletest@university.local\",\"firstName\":\"Role\",\"lastName\":\"Test\",\"departmentId\":\"$DEPT_ID\",\"staffNumber\":\"RTSTAFF1\"}")
LECTURER_USER_ID=$(echo $LECTURER_JSON | jf "['lecturer']['user']['id']")

ROLES=$(curl -s $BASE/users/$LECTURER_USER_ID/roles -H "$AUTH")
check "new lecturer starts with exactly one role" "1" "$(echo $ROLES | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")"

ASSIGN=$(curl -s -X POST $BASE/users/$LECTURER_USER_ID/roles -H "$AUTH" -H 'Content-Type: application/json' -d '{"role":"EXAM_OFFICER"}')
ROLE_ID=$(echo $ASSIGN | jf "['id']")
check "role assignment created" "EXAM_OFFICER" "$(echo $ASSIGN | jf "['role']")"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/users/$LECTURER_USER_ID/roles -H "$AUTH" -H 'Content-Type: application/json' -d '{"role":"EXAM_OFFICER"}')
check "duplicate role assignment rejected" "409" "$CODE"

curl -s -X DELETE $BASE/users/$LECTURER_USER_ID/roles/$ROLE_ID -H "$AUTH" > /dev/null
ROLES_AFTER=$(curl -s $BASE/users/$LECTURER_USER_ID/roles -H "$AUTH")
check "role removed, back to one role" "1" "$(echo $ROLES_AFTER | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")"

echo
echo "=== $pass passed, $fail failed ==="
[ "$fail" -eq 0 ]
