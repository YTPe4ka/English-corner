#!/usr/bin/env python3
"""
Test script for all modals API endpoints
"""
import os
import django
import requests
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from configapp.models import (
    Student, Teacher, Group, GroupStudent, Admin, 
    Lesson, StudentLesson, LessonPayment
)

BASE_URL = 'http://localhost:8000/api/v1'

print("=" * 60)
print("Testing Modals API Endpoints")
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

if codes:
    code = codes[0].code
    response = requests.post(
        f'{BASE_URL}/admin/2fa/verify/',
        json={
            'email': 'superadmin@gmail.com',
            'session_id': session_id,
            'code': code
        }
    )
    
    if response.status_code == 200:
        access_token = response.json()['access']
        print(f"✅ Got access token")
    else:
        print("❌ Error during verification")
        exit(1)

headers = {'Authorization': f'Bearer {access_token}'}

# Get group and student
groups = requests.get(f'{BASE_URL}/groups/', headers=headers).json()
group_id = groups[0]['id']
group = requests.get(f'{BASE_URL}/groups/{group_id}/', headers=headers).json()

if not group.get('students'):
    print("⚠️  No students in group, skipping tests")
    exit(0)

student_group = group['students'][0]
student_id = student_group['student_detail']['id'] if student_group.get('student_detail') else student_group.get('student')

print(f"\n✅ Using Group: {group['name']} (ID: {group_id})")
print(f"✅ Using Student ID: {student_id}")

# Test 1: Payment
print("\n" + "=" * 60)
print("TEST 1: Payment (POST /lesson-payments/)")
print("=" * 60)

payment_data = {
    'student_id': student_id,
    'group_id': group_id,
    'lesson_count': 6,
    'amount': 60
}

response = requests.post(
    f'{BASE_URL}/lesson-payments/',
    json=payment_data,
    headers=headers
)

print(f"Status: {response.status_code}")
if response.status_code == 201:
    print("✅ Payment created successfully")
    payment = response.json()
    print(f"   Amount: ${payment.get('total_amount')}")
    print(f"   Lessons: {payment.get('lessons_purchased')}")
else:
    print(f"❌ Error: {response.status_code}")
    print(response.json())

# Test 2: Bonus
print("\n" + "=" * 60)
print("TEST 2: Bonus (POST /student-lessons/add_bonus/)")
print("=" * 60)

bonus_data = {
    'student_id': student_id,
    'group_id': group_id,
    'bonus_count': 2
}

response = requests.post(
    f'{BASE_URL}/student-lessons/add_bonus/',
    json=bonus_data,
    headers=headers
)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    print("✅ Bonus added successfully")
    result = response.json()
    print(f"   Message: {result.get('message')}")
else:
    print(f"❌ Error: {response.status_code}")
    print(response.json())

# Test 3: Remove Lesson
print("\n" + "=" * 60)
print("TEST 3: Remove Lesson (POST /student-lessons/remove_lesson/)")
print("=" * 60)

remove_data = {
    'student_id': student_id,
    'group_id': group_id,
    # lesson_id not provided, should auto-select first unpaid
}

response = requests.post(
    f'{BASE_URL}/student-lessons/remove_lesson/',
    json=remove_data,
    headers=headers
)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    print("✅ Lesson removed successfully")
    result = response.json()
    print(f"   Message: {result.get('message')}")
else:
    print(f"❌ Error: {response.status_code}")
    print(response.json())

print("\n" + "=" * 60)
print("✅ All API tests completed!")
print("=" * 60)
