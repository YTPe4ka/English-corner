import requests
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from configapp.models import VerificationCode, TwoFactorAuth

BASE_URL = 'http://localhost:8000/api/v1'

# Get token
print("Getting token...")
response = requests.post(
    f'{BASE_URL}/admin/2fa/login/',
    json={'email': 'superadmin@gmail.com', 'password': 'admin123'}
)

if response.status_code != 200:
    print(f"Failed to get 2FA session: {response.status_code}")
    exit(1)

session_id = response.json()['session_id']
two_factor = TwoFactorAuth.objects.get(email='superadmin@gmail.com')
codes = VerificationCode.objects.filter(two_factor=two_factor).order_by('-created_at')[:1]
code = codes[0].code

response = requests.post(
    f'{BASE_URL}/admin/2fa/verify/',
    json={'email': 'superadmin@gmail.com', 'session_id': session_id, 'code': code}
)

if response.status_code != 200:
    print(f"Failed verification: {response.status_code}")
    exit(1)

token = response.json()['access']
headers = {'Authorization': f'Bearer {token}'}
print(f"✅ Got token")

# Test endpoints
endpoints = [
    ('GET', '/student-lessons/'),
    ('POST', '/student-lessons/add_bonus/'),
    ('POST', '/student-lessons/remove_lesson/'),
]

for method, endpoint in endpoints:
    url = BASE_URL + endpoint
    print(f"\n{method} {endpoint}")
    
    if method == 'GET':
        response = requests.get(url, headers=headers)
    else:
        response = requests.post(
            url,
            json={'student_id': 1, 'group_id': 1},
            headers=headers
        )
    
    print(f"  Status: {response.status_code}")
    if response.status_code >= 400:
        print(f"  Response: {response.text[:200]}")
