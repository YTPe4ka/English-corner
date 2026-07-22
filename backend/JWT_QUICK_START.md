JWT AUTHENTICATION - QUICK START GUIDE
======================================

## ENDPOINT URLs:

Authentication Endpoints (Public - no token required):
  - POST /api/v1/auth/login/         → Get access & refresh tokens
  - POST /api/v1/auth/token/refresh/ → Refresh expired access token
  - GET  /api/schema/                → OpenAPI schema
  - GET  /api/docs/                  → Swagger UI
  - GET  /api/redoc/                 → ReDoc UI

Protected Endpoints (All require: Authorization: Bearer {access_token}):
  - GET  /api/v1/students/
  - GET  /api/v1/teachers/
  - GET  /api/v1/groups/
  - GET  /api/v1/payments/
  - GET  /api/v1/attendance/
  - GET  /api/v1/performance/
  - GET  /api/v1/admins/
  - GET  /api/v1/permissions/
  - GET  /api/v1/admin-permissions/
  - GET  /api/v1/admin-logs/
  - GET  /api/v1/auth/me/ → Get current user info
  - POST /api/v1/auth/logout/ → Invalidate refresh token

## STEP 1: LOGIN

curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin@test.com"
  }'

Response:
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@test.com",
    "first_name": "Admin",
    "last_name": "User"
  }
}

## STEP 2: USE ACCESS TOKEN FOR REQUESTS

curl -X GET http://localhost:8000/api/v1/students/ \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}"

## STEP 3: WHEN ACCESS TOKEN EXPIRES (2 hours)

curl -X POST http://localhost:8000/api/v1/auth/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "{YOUR_REFRESH_TOKEN}"
  }'

Response:
{
  "access": "NEW_ACCESS_TOKEN_HERE"
}

## STEP 4: GET CURRENT USER (Optional)

curl -X GET http://localhost:8000/api/v1/auth/me/ \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}"

Response:
{
  "id": 1,
  "username": "admin",
  "email": "admin@test.com",
  "first_name": "Admin",
  "last_name": "User"
}

## STEP 5: LOGOUT (Optional - Invalidate Token)

curl -X POST http://localhost:8000/api/v1/auth/logout/ \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "{YOUR_REFRESH_TOKEN}"
  }'

Response:
{
  "message": "Successfully logged out"
}

## PYTHON EXAMPLE:

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"

# Step 1: Login
login_response = requests.post(
    f"{BASE_URL}/auth/login/",
    json={"username": "admin", "password": "admin@test.com"}
)
tokens = login_response.json()
access_token = tokens['access']

# Step 2: Use token for API calls
headers = {"Authorization": f"Bearer {access_token}"}
students_response = requests.get(
    f"{BASE_URL}/students/",
    headers=headers
)
print(students_response.json())

# Step 3: Refresh token if needed
refresh_response = requests.post(
    f"{BASE_URL}/auth/token/refresh/",
    json={"refresh": tokens['refresh']}
)
new_access_token = refresh_response.json()['access']
```

## JAVASCRIPT/FETCH EXAMPLE:

```javascript
const BASE_URL = "http://localhost:8000/api/v1";

// Step 1: Login
const loginRes = await fetch(`${BASE_URL}/auth/login/`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    username: 'admin', 
    password: 'admin@test.com' 
  })
});

const { access, refresh } = await loginRes.json();

// Step 2: Store tokens (usually in localStorage)
localStorage.setItem('access_token', access);
localStorage.setItem('refresh_token', refresh);

// Step 3: Make API calls with token
const studentsRes = await fetch(`${BASE_URL}/students/`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});

const students = await studentsRes.json();
console.log(students);

// Step 4: Handle token expiration
if (studentsRes.status === 401) {
  // Refresh token
  const refreshRes = await fetch(`${BASE_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      refresh: localStorage.getItem('refresh_token')
    })
  });
  
  if (refreshRes.ok) {
    const { access } = await refreshRes.json();
    localStorage.setItem('access_token', access);
    // Retry original request
  } else {
    // Refresh token expired, redirect to login
    window.location.href = '/login';
  }
}
```

## AXIOS EXAMPLE:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1'
});

// Add interceptor to refresh token
api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    
    if (error.response.status === 401 && !original._retry) {
      original._retry = true;
      
      const refresh_token = localStorage.getItem('refresh_token');
      const response = await axios.post(
        'http://localhost:8000/api/v1/auth/token/refresh/',
        { refresh: refresh_token }
      );
      
      localStorage.setItem('access_token', response.data.access);
      api.defaults.headers['Authorization'] = 
        `Bearer ${response.data.access}`;
      
      return api(original);
    }
    
    return Promise.reject(error);
  }
);

// Login
const loginRes = await api.post('/auth/login/', {
  username: 'admin',
  password: 'admin@test.com'
});

api.defaults.headers['Authorization'] = 
  `Bearer ${loginRes.data.access}`;

// Now all requests will automatically refresh token if needed
const students = await api.get('/students/');
```

## TOKEN EXPIRATION TIMES:

- Access Token: 2 hours (will need refresh after 2 hours)
- Refresh Token: 1 day (can refresh access token during this time)
- After logout: Token is blacklisted (cannot be reused)

## ERROR RESPONSES:

401 Unauthorized:
{
  "detail": "Authentication credentials were not provided."
}

401 Unauthorized (Invalid token):
{
  "detail": "Given token not valid for any token type"
}

401 Unauthorized (Token expired):
{
  "detail": "Token is invalid or expired"
}

## TESTING IN SWAGGER UI:

1. Go to: http://localhost:8000/api/docs/
2. Click on "POST /auth/login/" endpoint
3. Click "Try it out"
4. Enter credentials:
   {
     "username": "admin",
     "password": "admin@test.com"
   }
5. Click "Execute"
6. Copy the "access" token from response
7. Click "Authorize" button (top right)
8. Paste token as: Bearer {access_token}
9. Now all other endpoints are authorized

## SECURITY NOTES:

✅ Access tokens expire after 2 hours - automatic logout for security
✅ Refresh tokens last 1 day - enough time to refresh access token
✅ Tokens are signed with Django SECRET_KEY - cannot be tampered with
✅ Token blacklist prevents reuse after logout
✅ All data endpoints require authentication
✅ Passwords are hashed - never transmitted in tokens

## PRODUCTION CONSIDERATIONS:

1. Use HTTPS (not HTTP)
2. Store tokens securely (HttpOnly cookies preferred over localStorage)
3. Implement token rotation on sensitive operations
4. Add rate limiting on login endpoint
5. Log authentication failures
6. Consider adding 2FA for admin users
7. Use stronger secret key in production
