# 🏗️ English Corner - Architecture & System Design

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ENGLISH CORNER PLATFORM                          │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    FRONTEND (React + Vite)                       │  │
│  │                    http://localhost:5173                         │  │
│  │                                                                  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │  │
│  │  │   Landing    │  │   Login      │  │  Dashboard   │           │  │
│  │  │   Page       │→ │   Forms      │→ │   (3 types)  │           │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │  │
│  │         ↓                                    ↓                   │  │
│  │  ┌────────────────────────────────────────────────┐            │  │
│  │  │  React Router (Protected Routes)              │            │  │
│  │  │  - /                                          │            │  │
│  │  │  - /login/:role                               │            │  │
│  │  │  - /:role/dashboard (Protected)               │            │  │
│  │  └────────────────────────────────────────────────┘            │  │
│  │         ↓                                                       │  │
│  │  ┌────────────────────────────────────────────────┐            │  │
│  │  │  React Context API (AuthContext)              │            │  │
│  │  │  - user, accessToken, refreshToken, role      │            │  │
│  │  │  - localStorage persistence                   │            │  │
│  │  └────────────────────────────────────────────────┘            │  │
│  │         ↓                                                       │  │
│  │  ┌────────────────────────────────────────────────┐            │  │
│  │  │  API Client (api/index.ts)                    │            │  │
│  │  │  - auth namespace (login, logout, current)    │            │  │
│  │  │  - student namespace (groups, attendance)     │            │  │
│  │  │  - teacher namespace (manage classes)         │            │  │
│  │  └────────────────────────────────────────────────┘            │  │
│  │         ↓                                                       │  │
│  │  ┌────────────────────────────────────────────────┐            │  │
│  │  │  TypeScript Types (types/index.ts)            │            │  │
│  │  │  - User, Teacher, Student, Group, etc         │            │  │
│  │  └────────────────────────────────────────────────┘            │  │
│  │         ↓                                                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│         ↓                                                              │
│         │ HTTPS/CORS                                                  │
│         ↓                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    BACKEND (Django REST)                         │  │
│  │                 http://localhost:8000/api/v1                    │  │
│  │                                                                  │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │  Authentication Layer                                   │  │  │
│  │  │  - JWT Token Generation (2-hour expiry)               │  │  │
│  │  │  - Token Refresh Mechanism                            │  │  │
│  │  │  - 2FA SuperAdmin Verification (email codes)          │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │  API Endpoints (22 total)                              │  │  │
│  │  │  ┌────────────────────────────────────────────────────┐ │  │  │
│  │  │  │  AUTH (4 endpoints)                               │ │  │  │
│  │  │  │  - POST /auth/login/          ← Login user       │ │  │  │
│  │  │  │  - POST /auth/logout/         ← Logout user      │ │  │  │
│  │  │  │  - POST /auth/refresh/        ← Refresh token    │ │  │  │
│  │  │  │  - GET  /auth/current-user/   ← Get profile      │ │  │  │
│  │  │  └────────────────────────────────────────────────────┘ │  │  │
│  │  │  ┌────────────────────────────────────────────────────┐ │  │  │
│  │  │  │  STUDENT (6 endpoints)                            │ │  │  │
│  │  │  │  - GET /student/groups/       ← Enrolled groups  │ │  │  │
│  │  │  │  - GET /student/attendance/   ← Attendance data  │ │  │  │
│  │  │  │  - GET /student/performance/  ← Grades          │ │  │  │
│  │  │  │  - GET /student/payments/     ← Payment history │ │  │  │
│  │  │  │  - GET /student/profile/      ← Profile info     │ │  │  │
│  │  │  └────────────────────────────────────────────────────┘ │  │  │
│  │  │  ┌────────────────────────────────────────────────────┐ │  │  │
│  │  │  │  TEACHER (7 endpoints)                            │ │  │  │
│  │  │  │  - GET  /teacher/groups/      ← Teaching groups  │ │  │  │
│  │  │  │  - GET  /teacher/attendance/  ← View attendance  │ │  │  │
│  │  │  │  - POST /teacher/attendance/  ← Mark attendance  │ │  │  │
│  │  │  │  - GET  /teacher/performance/ ← View grades      │ │  │  │
│  │  │  │  - POST /teacher/performance/ ← Add grades       │ │  │  │
│  │  │  └────────────────────────────────────────────────────┘ │  │  │
│  │  │  ┌────────────────────────────────────────────────────┐ │  │  │
│  │  │  │  ADMIN (2+ endpoints)                             │ │  │  │
│  │  │  │  - GET /admin/dashboard/      ← Statistics       │ │  │  │
│  │  │  │  - GET /admin/logs/           ← Activity logs    │ │  │  │
│  │  │  └────────────────────────────────────────────────────┘ │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │  Permission & Authorization Layer                      │  │  │
│  │  │  - 10 Permission Classes                               │  │  │
│  │  │  - Role-Based Access Control                           │  │  │
│  │  │  - StudentCanViewOwnData                               │  │  │
│  │  │  - TeacherCanManageClass                               │  │  │
│  │  │  - AdminOnly, SuperAdminOnly                           │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │  Serializers & Validation                              │  │  │
│  │  │  - User Serializer with nested data                    │  │  │
│  │  │  - Group Serializer with relationships                 │  │  │
│  │  │  - Attendance Serializer with student data             │  │  │
│  │  │  - Performance Serializer with grades                  │  │  │
│  │  │  - Payment Serializer with transaction data            │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │  Models & Database Layer                               │  │  │
│  │  │  - User (Django built-in with extensions)             │  │  │
│  │  │  - Teacher (1:1 with User)                            │  │  │
│  │  │  - Student (1:1 with User)                            │  │  │
│  │  │  - Group (English classes)                            │  │  │
│  │  │  - Attendance (Student attendance records)            │  │  │
│  │  │  - Performance (Student grades)                       │  │  │
│  │  │  - Payment (Student payments)                         │  │  │
│  │  │  - TwoFactorAuth (2FA settings)                       │  │  │
│  │  │  - VerificationCode (2FA codes)                       │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │         ↓                                                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│         ↓                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                  DATABASE (SQLite)                              │  │
│  │                  db.sqlite3                                     │  │
│  │                                                                  │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │  Tables:                                                │  │  │
│  │  │  - auth_user, auth_group, auth_permission              │  │  │
│  │  │  - configapp_teacher, configapp_student                │  │  │
│  │  │  - configapp_group, configapp_attendance               │  │  │
│  │  │  - configapp_performance, configapp_payment            │  │  │
│  │  │  - configapp_twofactorauth, configapp_verificationcode │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## User Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

User Opens App (http://localhost:5173)
       ↓
    ┌──────────────────────────────────────┐
    │  Check localStorage for tokens        │
    └──────────────────────────────────────┘
       ↓
    ┌──────────────────────────────────────┐
    │  If tokens exist → Load User State    │
    └──────────────────────────────────────┘
       ↓
    ┌─────────────────────────────────────────────────────┐
    │  If no tokens → Show Landing Page                   │
    │  (3 Login Card Options: Student, Teacher, Admin)    │
    └─────────────────────────────────────────────────────┘
       ↓
User Clicks "Login as Student" (or Teacher/Admin)
       ↓
    ┌──────────────────────────────────────┐
    │  Navigate to /login/student           │
    │  Show role-specific login form        │
    │  Display demo credentials             │
    └──────────────────────────────────────┘
       ↓
User Enters Credentials
       ↓
    ┌──────────────────────────────────────────────────┐
    │  API Call: POST /api/v1/auth/login/              │
    │  Data: { username, password }                    │
    └──────────────────────────────────────────────────┘
       ↓
Backend Validates Credentials
       ↓
    ┌──────────────────────────────────────────────────┐
    │  ✓ Valid → Generate JWT Token                   │
    │  Return: { access_token, refresh_token, user }  │
    │  ✗ Invalid → Return 401 Unauthorized             │
    └──────────────────────────────────────────────────┘
       ↓
Frontend Receives Response
       ↓
    ┌──────────────────────────────────────┐
    │  Store tokens in localStorage        │
    │  Store user in React Context         │
    │  Set role in Context                 │
    └──────────────────────────────────────┘
       ↓
    ┌──────────────────────────────────────┐
    │  Navigate to /:role/dashboard        │
    │  (e.g., /student/dashboard)          │
    └──────────────────────────────────────┘
       ↓
ProtectedRoute Validates
       ↓
    ┌──────────────────────────────────────┐
    │  ✓ Token exists + correct role       │
    │  → Render Dashboard Component        │
    │  ✗ No token or wrong role            │
    │  → Redirect to /                     │
    └──────────────────────────────────────┘
       ↓
Dashboard Loads Data
       ↓
    ┌──────────────────────────────────────────────────┐
    │  API Calls with Bearer Token:                    │
    │  Headers: { Authorization: "Bearer {token}" }   │
    │                                                  │
    │  Student: getGroups, getAttendance, etc        │
    │  Teacher: getGroups, getAttendance, etc        │
    │  Admin: getDashboard, getLogs, etc             │
    └──────────────────────────────────────────────────┘
       ↓
Backend Validates Token & Permission
       ↓
    ┌──────────────────────────────────────┐
    │  ✓ Valid + Authorized                │
    │  → Return user's data                │
    │  ✗ Invalid or Unauthorized           │
    │  → Return 401/403 Forbidden          │
    └──────────────────────────────────────┘
       ↓
Display Dashboard with Data
       ↓
Session Active
       ↓
    ┌──────────────────────────────────────┐
    │  Token expires in 2 hours             │
    │  Automatic refresh attempted          │
    │  If refresh fails → Redirect to login │
    └──────────────────────────────────────┘
       ↓
User Clicks Logout
       ↓
    ┌──────────────────────────────────────┐
    │  Clear tokens from localStorage       │
    │  Clear user from Context              │
    │  Clear role from Context              │
    │  Navigate to /                        │
    └──────────────────────────────────────┘
       ↓
Return to Landing Page
```

---

## Component Hierarchy

```
App (src/App.tsx)
│
├── Routes
│   ├── / → Landing (src/pages/Landing.tsx)
│   │
│   ├── /login/:role → Login (src/pages/Login.tsx)
│   │
│   └── Protected Routes
│       ├── ProtectedRoute (src/components/ProtectedRoute.tsx)
│       │   ├── Check: User authenticated?
│       │   ├── Check: Correct role?
│       │   ├── Show: Loading spinner
│       │   └── If OK: Render Component
│       │
│       ├── /student/dashboard
│       │   └── StudentDashboard (src/pages/StudentDashboard.tsx)
│       │       ├── Attendance Card
│       │       ├── Grades Card
│       │       ├── Balance Card
│       │       └── Groups Card
│       │
│       ├── /teacher/dashboard
│       │   └── TeacherDashboard (src/pages/TeacherDashboard.tsx)
│       │       ├── Overview Tab
│       │       │   ├── Groups List
│       │       │   └── Quick Stats
│       │       ├── Attendance Tab
│       │       │   └── Attendance Table
│       │       └── Grades Tab
│       │           └── Grades Table
│       │
│       └── /admin/dashboard
│           └── AdminDashboard (src/pages/AdminDashboard.tsx)
│               ├── Overview Tab
│               │   ├── Stat Cards (6)
│               │   └── Quick Actions
│               └── Logs Tab
│                   └── Activity Logs
│
└── AuthProvider (src/context/AuthContext.tsx)
    ├── State: user, accessToken, refreshToken, role
    ├── Methods: login(), logout(), setTokens()
    ├── localStorage: persistence
    └── useAuth() Hook: component access
```

---

## Data Flow

### Student Dashboard Data Flow

```
StudentDashboard Component
         ↓
    useEffect (on mount with accessToken)
         ↓
    useAuth() → get accessToken
         ↓
    Promise.all([
        student.getGroups(accessToken),
        student.getAttendance(accessToken),
        student.getPerformance(accessToken),
        student.getPayments(accessToken)
    ])
         ↓
    API Client (src/api/index.ts)
         ↓
    fetch() with Bearer Token
    Headers: {
        "Authorization": "Bearer {accessToken}",
        "Content-Type": "application/json"
    }
         ↓
    Django Backend
         ↓
    Token Authentication Check
         ↓
    Permission Check (StudentCanViewOwnData)
         ↓
    Query Database
         ↓
    Serialize Data
         ↓
    Return JSON Response
         ↓
    Frontend Receives Data
         ↓
    setState() → Update Component
         ↓
    Render Cards:
    ├── Attendance (total, present, absent, %)
    ├── Grades (total assessments, average)
    ├── Balance (current, total paid)
    └── Groups (list with teachers)
```

---

## Security Architecture

```
┌─────────────────────────────────────────────┐
│          SECURITY LAYERS                    │
└─────────────────────────────────────────────┘

Layer 1: Frontend
├── React Router Guards
│   └── ProtectedRoute component checks tokens before rendering
├── localStorage Token Storage
│   └── Tokens persist across sessions
└── Client-side Validation
    └── Check user exists before allowing navigation

Layer 2: API Client
├── Bearer Token Injection
│   └── Every request includes: Authorization: Bearer {token}
├── HTTPS (in production)
│   └── All data encrypted in transit
└── Error Handling
    └── 401/403 errors trigger logout/redirect

Layer 3: Backend Authentication
├── JWT Token Verification
│   └── Validate token signature and expiry (2 hours)
├── Token Refresh Mechanism
│   └── Attempt refresh if token expired
└── Logout Invalidation
    └── Revoke tokens on logout

Layer 4: Backend Authorization
├── Permission Classes (10 total)
│   ├── StudentCanViewOwnData
│   ├── TeacherCanManageClass
│   ├── AdminOnly
│   └── SuperAdminOnly
├── Role-Based Access Control
│   └── Routes check user.role
├── Object-Level Permissions
│   └── Students see only their own data
└── 2FA for SuperAdmin
    └── Email verification codes

Layer 5: Database
├── Encrypted Passwords (Django hashing)
├── SQL Injection Prevention (ORM queries)
├── Data Integrity
│   └── Foreign key constraints
└── Backup & Recovery
    └── Regular database backups
```

---

## Deployment Architecture (Production)

```
┌──────────────────────────────────────────────────────────┐
│              PRODUCTION DEPLOYMENT                       │
└──────────────────────────────────────────────────────────┘

┌─────────────────┐         ┌─────────────────┐
│  Domain Name    │         │  Domain Name    │
│  (e.g.)         │         │  (e.g.)         │
│  english        │         │  api.english    │
│  corner.com     │         │  corner.com     │
└────────┬────────┘         └────────┬────────┘
         │                          │
         │                          │
    ┌────▼──────────┐          ┌───▼─────────────┐
    │   CDN/Cache   │          │  Load Balancer  │
    │ (CloudFlare)  │          │  (nginx/HAProxy)│
    └────┬──────────┘          └───┬─────────────┘
         │                         │
    ┌────▼───────────────────┐ ┌──▼──────────────────┐
    │  Frontend Hosting      │ │  API Servers (3+)  │
    │  (Vercel/Netlify)      │ │  (Gunicorn+Django) │
    │                        │ │                    │
    │ - React App (dist/)    │ │ - Django Instance  │
    │ - Static Assets        │ │ - REST Endpoints   │
    │ - SSL Certificate      │ │ - Token Auth       │
    │ - Auto-deploy from     │ │ - SSL Certificate  │
    │   GitHub on push       │ │                    │
    └────┬───────────────────┘ └──┬─────────────────┘
         │                        │
         │                        │
         │    ┌──────────────────▼──────────────────┐
         │    │  Database Server                   │
         │    │  (PostgreSQL RDS/Cloud SQL)        │
         │    │                                    │
         │    │ - User data                        │
         │    │ - Teacher/Student info             │
         │    │ - Groups & Classes                 │
         │    │ - Attendance & Grades              │
         │    │ - Payments                         │
         │    │ - 2FA Codes                        │
         │    │ - Automated backups                │
         │    │ - Replication & Failover           │
         │    └────────────────────────────────────┘
         │
         │
    ┌────▼────────────────────┐
    │  Logging & Monitoring   │
    │                         │
    │ - Error tracking        │
    │ - Performance metrics   │
    │ - User analytics        │
    │ - Security logs         │
    └─────────────────────────┘
```

---

## Technology Stack Summary

```
FRONTEND
├── React 19 (UI Framework)
├── Vite (Build Tool)
├── TypeScript (Type Safety)
├── React Router v6 (Routing)
├── Context API (State Management)
├── Fetch API (HTTP Client)
└── CSS Grid & Flexbox (Styling)

BACKEND
├── Django 5.2 (Web Framework)
├── Django REST Framework (API)
├── JWT (Authentication)
├── SQLAlchemy/ORM (Database)
├── Email (2FA codes)
└── CORS Middleware

DATABASE
├── SQLite (Development)
├── PostgreSQL (Production)
└── Migrations (Schema versioning)

DEPLOYMENT
├── Frontend: Vercel/Netlify
├── Backend: Heroku/PythonAnywhere/VPS
├── Database: Cloud SQL/RDS
├── DNS: Route53/Cloudflare
└── CDN: CloudFlare
```

---

Generated: 2024
Status: Complete
Version: 1.0.0
