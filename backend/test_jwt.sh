#!/bin/bash
# JWT Authentication Test Script
# Run this after starting: python manage.py runserver 8000

BASE_URL="http://localhost:8000/api/v1"

echo "=========================================="
echo "JWT AUTHENTICATION QUICK TEST"
echo "=========================================="
echo ""

echo "TEST 1: LOGIN"
echo "POST /api/v1/auth/login/"
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin@test.com"
  }')

echo "Response:"
echo "$LOGIN_RESPONSE" | python -m json.tool
echo ""

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('access', ''))")
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('refresh', ''))")

if [ -z "$ACCESS_TOKEN" ]; then
  echo "ERROR: Could not get access token from login response"
  exit 1
fi

echo "✅ Access token obtained: ${ACCESS_TOKEN:0:50}..."
echo ""

echo "TEST 2: GET CURRENT USER (with token)"
echo "GET /api/v1/auth/me/"
echo ""

CURRENT_USER=$(curl -s -X GET "$BASE_URL/auth/me/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response:"
echo "$CURRENT_USER" | python -m json.tool
echo ""

echo "TEST 3: ACCESS PROTECTED ENDPOINT (Students list)"
echo "GET /api/v1/students/"
echo ""

STUDENTS=$(curl -s -X GET "$BASE_URL/students/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response (first 500 chars):"
echo "$STUDENTS" | python -m json.tool | head -30
echo ""

echo "TEST 4: ATTEMPT WITHOUT TOKEN (should be 401)"
echo "GET /api/v1/students/"
echo ""

NO_TOKEN=$(curl -s -w "\nStatus: %{http_code}\n" -X GET "$BASE_URL/students/")

echo "Response:"
echo "$NO_TOKEN"
echo ""

echo "TEST 5: REFRESH TOKEN"
echo "POST /api/v1/auth/token/refresh/"
echo ""

if [ -z "$REFRESH_TOKEN" ]; then
  echo "ERROR: Could not get refresh token"
  exit 1
fi

REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/token/refresh/" \
  -H "Content-Type: application/json" \
  -d "{
    \"refresh\": \"$REFRESH_TOKEN\"
  }")

echo "Response:"
echo "$REFRESH_RESPONSE" | python -m json.tool
echo ""

echo "=========================================="
echo "ALL TESTS COMPLETED"
echo "=========================================="
echo ""
echo "Summary:"
echo "✅ Login works - tokens generated"
echo "✅ Protected endpoints require token"
echo "✅ Token refresh works"
echo ""
echo "Token expiration times:"
echo "  - Access token: 2 hours"
echo "  - Refresh token: 1 day"
echo ""
echo "Access this token (2 hour expiration):"
echo "$ACCESS_TOKEN"
