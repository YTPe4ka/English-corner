#!/usr/bin/env python3
"""
Test script for StudentLessonTable API endpoint
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
    Lesson, StudentLesson
)

BASE_URL = 'http://localhost:8000/api/v1'

# Get admin token via 2FA
print("=" * 60)
print("Testing StudentLessonTable API Endpoint")
print("=" * 60)

response = requests.post(
    f'{BASE_URL}/admin/2fa/login/',
    json={'email': 'superadmin@gmail.com', 'password': 'admin123'}
)

if response.status_code != 200:
    print("❌ Error: unable to get 2FA session")
    print(response.text)
    exit(1)

session_id = response.json()['session_id']
print(f"✅ Got 2FA session")

# Get verification code and complete 2FA
from configapp.models import VerificationCode, TwoFactorAuth

two_factor = TwoFactorAuth.objects.get(email='superadmin@gmail.com')
codes = VerificationCode.objects.filter(two_factor=two_factor).order_by('-created_at')[:1]

if codes:
    code = codes[0].code
    print(f"✅ Verification code: {code}")
    
    # Complete 2FA
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
        print(response.text)
        exit(1)
else:
    print("❌ Error: verification code not found")
    exit(1)

headers = {'Authorization': f'Bearer {access_token}'}

# Get first group
print("\n" + "=" * 60)
print("Fetching Groups")
print("=" * 60)

response = requests.get(f'{BASE_URL}/groups/', headers=headers)
if response.status_code != 200:
    print(f"❌ Error fetching groups: {response.status_code}")
    print(response.text)
    exit(1)

groups = response.json()
if not groups:
    print("⚠️  No groups found")
    exit(1)

group_id = groups[0]['id']
group_name = groups[0]['name']
print(f"✅ Found {len(groups)} group(s)")
print(f"   Testing with group: {group_name} (ID: {group_id})")

# Test the lesson-table endpoint
print("\n" + "=" * 60)
print(f"Testing /groups/{group_id}/lesson-table/")
print("=" * 60)

response = requests.get(
    f'{BASE_URL}/groups/{group_id}/lesson-table/',
    headers=headers
)

if response.status_code != 200:
    print(f"❌ Error: {response.status_code}")
    print(response.text)
    exit(1)

data = response.json()
print(f"✅ Endpoint returned 200 OK")
print(f"\n   Group: {data['group']['name']}")
print(f"   Schedule: {data['group']['schedule_type']}")
print(f"   Total lessons: {len(data['lessons'])}")
print(f"   Active students: {len(data['students'])}")

if data['lessons']:
    print(f"\n   Lesson dates:")
    for lesson in data['lessons'][:3]:
        print(f"     - L{lesson['number']}: {lesson['date']} {lesson['time']}")
    if len(data['lessons']) > 3:
        print(f"     ... and {len(data['lessons']) - 3} more")

if data['students']:
    print(f"\n   Students:")
    for student in data['students'][:3]:
        statuses = student['lessons_status'][:3]
        print(f"     - {student['name']}: {statuses}{'...' if len(student['lessons_status']) > 3 else ''}")
    if len(data['students']) > 3:
        print(f"     ... and {len(data['students']) - 3} more")

print(f"\n   Is expired: {data['students'][0]['is_expired'] if data['students'] else 'N/A'}")

print("\n" + "=" * 60)
print("✅ API Test Passed!")
print("=" * 60)
