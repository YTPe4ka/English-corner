#!/usr/bin/env python
"""
Generate an expired JWT token for testing token expiry logout behavior.
"""
import jwt
import time
from datetime import datetime, timedelta

# Secret key from Django settings (default)
SECRET_KEY = 'django-insecure-2024-secret-key-for-development'

# Create an expired token (expired 1 hour ago)
expired_time = int(time.time()) - 3600  # 1 hour ago

payload = {
    'user_id': 1,
    'username': 'admin_test',
    'exp': expired_time,  # ALREADY EXPIRED
    'iat': int(time.time()),
    'is_staff': True,
    'is_superuser': True,
}

token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')

print("=" * 80)
print("EXPIRED TOKEN FOR TESTING TOKEN EXPIRY LOGOUT")
print("=" * 80)
print(f"\nToken (copy this):")
print(token)
print(f"\nToken Details:")
print(f"  Expired at: {datetime.fromtimestamp(expired_time)}")
print(f"  Current time: {datetime.now()}")
print(f"  Status: EXPIRED (1 hour ago)")

print("\n" + "=" * 80)
print("HOW TO TEST:")
print("=" * 80)
print("""
1. Open browser at http://localhost:5174/
2. Open DevTools Console (F12 → Console tab)
3. Copy-paste this code:

localStorage.setItem('accessToken', '{token}');
localStorage.setItem('refreshToken', '{token}');
localStorage.setItem('user', JSON.stringify({{
  id: 1,
  username: 'admin_test',
  email: 'admin@test.com',
  first_name: 'Admin',
  last_name: 'Test'
}}));
localStorage.setItem('role', 'superadmin');

4. Press Enter

5. Watch the console for:
   [AuthContext] Restored from localStorage
   [AuthContext redirect] Token expires in: -3600000 (negative = EXPIRED)
   [AuthContext expiry] Token expired, logging out
   
6. Page should redirect to /login/admin

EXPECTED BEHAVIOR:
- Token is already expired
- Logout happens immediately
- Redirect to login page
- All localStorage tokens cleared
""".format(token=token))

print("=" * 80)
