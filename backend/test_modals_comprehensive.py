#!/usr/bin/env python3
"""
Comprehensive test for all modals API endpoints
"""
import os
import django
import requests
from datetime import datetime, timedelta
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from configapp.models import (
    Student, Teacher, Group, GroupStudent, Admin, 
    Lesson, StudentLesson, LessonPayment
)

BASE_URL = 'http://localhost:8000/api/v1'

print("=" * 60)
print("COMPREHENSIVE MODALS API TEST")
print("=" * 60)

# Get admin token
response = requests.post(
    f'{BASE_URL}/admin/2fa/login/',
    json={'email': 'superadmin@gmail.com', 'password': 'admin123'}
)

if response.status_code != 200:
    print("❌ Error: unable to get 2FA session")
    exit(1)

session_id = response.json()['session_id']

from configapp.models import VerificationCode, TwoFactorAuth
two_factor = TwoFactorAuth.objects.get(email='superadmin@gmail.com')
codes = VerificationCode.objects.filter(two_factor=two_factor).order_by('-created_at')[:1]

code = codes[0].code
response = requests.post(
    f'{BASE_URL}/admin/2fa/verify/',
    json={
        'email': 'superadmin@gmail.com',
        'session_id': session_id,
        'code': code
    }
)

if response.status_code != 200:
    print("❌ Error during verification")
    exit(1)

access_token = response.json()['access']
headers = {'Authorization': f'Bearer {access_token}'}

print(f"✅ Got access token")

# Create test data
print("\nCreating test data...")

# Find or create student
students = requests.get(f'{BASE_URL}/students/', headers=headers).json()
if students:
    student_id = students[0]['id']
    student_name = students[0].get('user_detail', {}).get('first_name') or f"Student {student_id}"
else:
    print("❌ No students found")
    exit(1)

# Find or create group with students
groups = requests.get(f'{BASE_URL}/groups/', headers=headers).json()
group_id = None
for g in groups:
    if g.get('students_count', 0) > 0:
        group_id = g['id']
        break

if not group_id:
    print("⚠️  Creating a new group with student...")
    # Create a group
    group_data = {
        'name': 'Test Group Modal',
        'description': 'Testing modals',
        'level': 'beginner',
        'teacher': 1,
        'start_date': datetime.now().isoformat(),
        'max_students': 10,
        'price_per_month': 100,
        'schedule_type': 'odd'
    }
    
    response = requests.post(f'{BASE_URL}/groups/', json=group_data, headers=headers)
    if response.status_code == 201:
        group_id = response.json()['id']
        print(f"✅ Created group {group_id}")
    else:
        print(f"❌ Failed to create group: {response.status_code}")
        print(response.json())
        exit(1)

print(f"✅ Using Group ID: {group_id}")
print(f"✅ Using Student ID: {student_id}")

# Test Lesson Table first
print("\n" + "=" * 60)
print("PRE-CHECK: Lesson Table")
print("=" * 60)

response = requests.get(f'{BASE_URL}/groups/{group_id}/lesson-table/', headers=headers)
if response.status_code == 200:
    table = response.json()
    print(f"✅ Lesson table endpoint works")
    print(f"   Lessons: {len(table.get('lessons', []))}")
    print(f"   Students: {len(table.get('students', []))}")
else:
    print(f"❌ Lesson table error: {response.status_code}")

# Test 1: Payment API
print("\n" + "=" * 60)
print("TEST 1: Payment API (POST /lesson-payments/)")
print("=" * 60)

payment_data = {
    'student_id': student_id,
    'group_id': group_id,
    'lesson_count': 6,
    'amount': 60.00
}

print(f"Request data: {json.dumps(payment_data, indent=2)}")

response = requests.post(
    f'{BASE_URL}/lesson-payments/',
    json=payment_data,
    headers=headers
)

print(f"Response Status: {response.status_code}")
if response.status_code == 201:
    payment = response.json()
    print("✅ Payment created successfully")
    print(f"   Total Amount: ${payment.get('total_amount')}")
    print(f"   Lessons Purchased: {payment.get('lessons_purchased')}")
    print(f"   Price Per Lesson: ${payment.get('price_per_lesson')}")
    print(f"   Lessons Remaining: {payment.get('lessons_remaining')}")
else:
    print(f"❌ Error: {response.status_code}")
    print(response.text)

# Test 2: Bonus API
print("\n" + "=" * 60)
print("TEST 2: Bonus API (POST /student-lessons/add_bonus/)")
print("=" * 60)

bonus_data = {
    'student_id': student_id,
    'group_id': group_id,
    'bonus_count': 2
}

print(f"Request data: {json.dumps(bonus_data, indent=2)}")

response = requests.post(
    f'{BASE_URL}/student-lessons/add_bonus/',
    json=bonus_data,
    headers=headers
)

print(f"Response Status: {response.status_code}")
if response.status_code == 200:
    result = response.json()
    print("✅ Bonus added successfully")
    print(f"   Message: {result.get('message')}")
    print(f"   Status: {result.get('status')}")
else:
    print(f"❌ Error: {response.status_code}")
    print(response.text)

# Test 3: Remove Lesson API
print("\n" + "=" * 60)
print("TEST 3: Remove Lesson API (POST /student-lessons/remove_lesson/)")
print("=" * 60)

remove_data = {
    'student_id': student_id,
    'group_id': group_id
    # lesson_id not provided - should auto-select
}

print(f"Request data: {json.dumps(remove_data, indent=2)}")

response = requests.post(
    f'{BASE_URL}/student-lessons/remove_lesson/',
    json=remove_data,
    headers=headers
)

print(f"Response Status: {response.status_code}")
if response.status_code == 200:
    result = response.json()
    print("✅ Lesson removed successfully")
    print(f"   Message: {result.get('message')}")
    print(f"   Status: {result.get('status')}")
else:
    print(f"❌ Error: {response.status_code}")
    print(response.text)

# Check table after changes
print("\n" + "=" * 60)
print("POST-CHECK: Lesson Table After Changes")
print("=" * 60)

response = requests.get(f'{BASE_URL}/groups/{group_id}/lesson-table/', headers=headers)
if response.status_code == 200:
    table = response.json()
    print(f"✅ Table updated successfully")
    
    for student in table.get('students', []):
        if student['id'] == student_id:
            statuses = student['lessons_status']
            paid = statuses.count('paid')
            bonus = statuses.count('bonus')
            unpaid = statuses.count('unpaid')
            removed = statuses.count('removed')
            print(f"   Student: {student['name']}")
            print(f"   - Paid: {paid}")
            print(f"   - Bonus: {bonus}")
            print(f"   - Unpaid: {unpaid}")
            print(f"   - Removed: {removed}")
            break
else:
    print(f"❌ Error: {response.status_code}")

print("\n" + "=" * 60)
print("✅ ALL TESTS COMPLETED!")
print("=" * 60)
