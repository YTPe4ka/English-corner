# 🏗️ System Architecture & Flow Diagrams

## Overall System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│                  (Frontend - React/Vue/Angular)                     │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Teacher    │  │   Student    │  │  SuperAdmin  │             │
│  │   Dashboard  │  │   Dashboard  │  │  Dashboard   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                              │
│                   (Django REST Framework)                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  http://localhost:8000/api/v1/                              │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │   AUTH   │   │  TEACHER │   │ STUDENT  │
        │ ENDPOINTS│   │   API    │   │   API    │
        └──────────┘   └──────────┘   └──────────┘
                │             │             │
                └─────────────┼─────────────┘
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                             │
│                    (Django ViewSets)                                │
│                                                                     │
│  Permission Check → Query Filter → Serialization → Response       │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                                 │
│                  (SQLite / PostgreSQL)                              │
│                                                                     │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐              │
│  │ Student │ │ Teacher │ │  Group   │ │ Payment  │              │
│  └─────────┘ └─────────┘ └──────────┘ └──────────┘              │
│                                                                     │
│  ┌──────────┐ ┌────────────┐ ┌─────────────────────┐              │
│  │Attendance│ │Performance │ │  TwoFactorAuth      │              │
│  └──────────┘ └────────────┘ │  VerificationCode   │              │
│                                 └─────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

### Standard JWT Authentication

```
User (Teacher/Student)
       │
       │ 1. POST /auth/login/
       │    username + password
       ▼
┌──────────────────┐
│  Auth View       │
│  - Validate User │
│  - Generate JWT  │
└──────────────────┘
       │
       │ 2. Return Tokens
       │    access_token (2h)
       │    refresh_token (24h)
       ▼
Client stores tokens
       │
       │ 3. Use access_token
       │    Authorization: Bearer <access_token>
       ▼
┌──────────────────┐
│  JWT Middleware  │
│  - Verify Token  │
│  - Validate exp. │
└──────────────────┘
       │
       │ 4a. Token valid
       │    Continue to endpoint
       │
       │ 4b. Token expired
       │    Use refresh_token
       │    → Get new access_token
       ▼
Protected Endpoint
```

### SuperAdmin 2FA Authentication

```
SuperAdmin User
       │
       │ 1. POST /auth/superadmin/login/
       │    username + password
       ▼
┌──────────────────────┐
│  SuperAdmin Login    │
│  - Validate creds    │
│  - Generate 6-digit  │
│    code (random)     │
│  - Store in DB       │
│  - Set expiry (10m)  │
└──────────────────────┘
       │
       │ 2. Send email
       │    Code sent to email
       ▼
User receives code
       │
       │ 3. Enter code
       │    POST /auth/superadmin/verify/
       │    user_id + code
       ▼
┌──────────────────────┐
│  SuperAdmin Verify   │
│  - Find code in DB   │
│  - Check if used     │
│  - Check if expired  │
│  - Validate match    │
│  - Mark as used      │
└──────────────────────┘
       │
       │ 4a. Code valid
       │    Generate JWT
       │    Return tokens
       │
       │ 4b. Code invalid/expired
       │    Return error
       │    Option: resend code
       ▼
SuperAdmin authenticated
with Full System Access
```

---

## Role-Based Access Control

### Permission Check Flow

```
HTTP Request
    │
    ├─ Headers Include JWT Token?
    │
    ├─ YES ─→ Decode JWT Token
    │         │
    │         ├─ Token Valid?
    │         │
    │         ├─ YES ─→ Extract User
    │         │         │
    │         │         ├─ Check Permission Classes
    │         │         │
    │         │         ├─ IsAuthenticated? ✅
    │         │         │
    │         │         ├─ IsTeacher/IsStudent/etc?
    │         │         │  (Check user.teacher_profile exists)
    │         │         │
    │         │         ├─ YES ─→ Object Permission Check
    │         │         │         │
    │         │         │         ├─ Can user access this object?
    │         │         │         │  (Compare IDs, check relationships)
    │         │         │         │
    │         │         │         ├─ YES ─→ ALLOW REQUEST ✅
    │         │         │         │
    │         │         │         └─ NO ─→ DENY 403 ❌
    │         │         │
    │         │         └─ NO ─→ DENY 403 ❌
    │         │
    │         └─ NO ─→ DENY 401 ❌
    │
    └─ NO ─→ DENY 401 ❌
```

### Data Access Isolation

```
Teacher User                      Student User
    │                                 │
    ▼                                 ▼
GET /teacher/groups/          GET /student/groups/
    │                                 │
    ├─ get_queryset()         ├─ get_queryset()
    │  Filter by:             │  Filter by:
    │  teacher=request.user   │  students__student=request.user
    │  .teacher_profile       │  (enrolled groups only)
    │                                 │
    ├─ Returns only:          ├─ Returns only:
    │  - Own groups            │  - Enrolled groups
    │  - No other teacher's    │  - No other student's
    │    groups                │    groups
    │                                 │
    └─ Result: [Group1, ...]   └─ Result: [Group2, ...]
       (15 students)               (only this student)
```

---

## Teacher API Workflow

```
Teacher Login
    │
    ├─ POST /auth/login/
    │  → Receive access_token
    │
    ▼
Teacher Dashboard
    │
    ├─ GET /teacher/groups/
    │  Query:
    │    - teacher=teacher_user.teacher_profile
    │  Response:
    │    - All groups taught by this teacher
    │
    ├─ GET /teacher/attendance/
    │  Query:
    │    - group__teacher=teacher_user.teacher_profile
    │  Response:
    │    - All attendance records in own groups
    │
    ├─ POST /teacher/attendance/
    │  Request:
    │    - student_id, group_id, is_present, date
    │  Action:
    │    - Create attendance record
    │    - Auto-validate group ownership
    │
    ├─ GET /teacher/attendance/student_attendance/?student_id=X
    │  Calculation:
    │    - total_classes: count(attendance)
    │    - present: count(is_present=True)
    │    - absent: total - present
    │    - attendance_rate: (present/total)*100
    │
    ├─ POST /teacher/performance/
    │  Request:
    │    - student_id, group_id, grade, comment
    │  Action:
    │    - Create grade record
    │    - Auto-set assessed_by=current_teacher
    │
    ├─ GET /teacher/performance/student_performance/?student_id=X
    │  Calculation:
    │    - total_assessments: count(grades)
    │    - average_grade: mean(grade)
    │
    └─ GET /teacher/profile/
       Response:
         - Current teacher's profile info
```

---

## Student API Workflow

```
Student Login
    │
    ├─ POST /auth/login/
    │  → Receive access_token
    │
    ▼
Student Dashboard
    │
    ├─ GET /student/groups/
    │  Query:
    │    - students__student=student_user.student_profile
    │    - is_active=True (only active enrollments)
    │  Response:
    │    - All groups student is enrolled in
    │
    ├─ GET /student/attendance/
    │  Query:
    │    - student=student_user.student_profile
    │  Response + Calculation:
    │    - attendance records
    │    - total_classes: count
    │    - present: count(is_present=True)
    │    - absent: total - present
    │    - attendance_rate: (present/total)*100
    │
    ├─ GET /student/performance/
    │  Query:
    │    - student=student_user.student_profile
    │  Response + Calculation:
    │    - grade records
    │    - total_assessments: count
    │    - average_grade: mean(grade)
    │
    ├─ GET /student/payments/
    │  Query:
    │    - student=student_user.student_profile
    │  Response + Calculation:
    │    - current_balance: from Student.balance
    │    - total_paid: sum(payment.amount)
    │    - payment_history: list of payments
    │
    └─ GET /student/profile/
       Response:
         - Current student's profile info
         - Balance (can pay)
         - Contact info
```

---

## Database Schema Diagram

```
User (Django built-in)
  id, username, email, password, is_staff, is_superuser

    ├─ ONE-TO-ONE ─→ Student
    │               id, user_id, personal_id, phone, balance, is_active
    │               created_at, updated_at
    │               
    │               ├─ ONE-TO-MANY → GroupStudent
    │               │               id, student_id, group_id, is_active
    │               │               ├─ GROUP Enrollment
    │               │               └─ Status (active/inactive)
    │               │
    │               ├─ ONE-TO-MANY → Attendance
    │               │               id, student_id, group_id, is_present, date
    │               │               ├─ Mark presence
    │               │               └─ Track attendance
    │               │
    │               ├─ ONE-TO-MANY → Performance
    │               │               id, student_id, group_id, grade, comment
    │               │               assessed_by_id
    │               │               ├─ Record grades
    │               │               └─ Track progress
    │               │
    │               └─ ONE-TO-MANY → Payment
    │                               id, student_id, group_id, amount
    │                               payment_date, status
    │                               ├─ Track payments
    │                               └─ Manage balance
    │
    ├─ ONE-TO-ONE ─→ Teacher
    │               id, user_id, personal_id, phone, specialization
    │               is_active, created_at, updated_at
    │               
    │               ├─ ONE-TO-MANY → Group
    │               │               id, teacher_id, name, level, schedule
    │               │               ├─ Group taught by teacher
    │               │               └─ Multiple students enrolled
    │               │
    │               └─ ONE-TO-MANY → Performance
    │                               (where assessed_by=teacher)
    │                               ├─ Grades given by teacher
    │                               └─ Performance evaluations
    │
    └─ ONE-TO-ONE ─→ Admin
                    id, user_id, role, is_active
                    created_at, updated_at
                    ├─ Admin or SuperAdmin
                    │
                    └─ ONE-TO-ONE → TwoFactorAuth
                                    id, admin_id, email, is_enabled
                                    ├─ 2FA configuration
                                    │
                                    └─ ONE-TO-MANY → VerificationCode
                                                    id, two_factor_id, code
                                                    is_used, expires_at
                                                    ├─ 6-digit codes
                                                    └─ 10-min expiration
```

---

## Request/Response Flow for Teacher Marking Attendance

```
Teacher Client
       │
       │ 1. POST /api/v1/teacher/attendance/
       │    Headers: Authorization: Bearer <token>
       │    Body: {
       │      "student": 1,
       │      "group": 1,
       │      "is_present": true,
       │      "date": "2026-01-18"
       │    }
       ▼
Django URL Router
       │
       ├─ Match: r'teacher/attendance'
       │  → TeacherAttendanceViewSet
       ▼
Permission Check
       │
       ├─ IsAuthenticated? ✅
       ├─ IsTeacher? ✅
       │  (Check user.teacher_profile exists)
       ▼
View Handler (perform_create)
       │
       ├─ Serializer Validation
       │  - Student exists?
       │  - Group exists?
       │  - Is date valid?
       │
       ├─ Query Filter
       │  - Verify group belongs to current teacher
       │    (get_queryset filters by teacher=request.user)
       │
       ├─ Save to Database
       │  INSERT INTO attendance (student, group, is_present, date)
       │  VALUES (1, 1, True, 2026-01-18)
       ▼
Serializer Response
       │
       └─ Return 201 Created
          {
            "id": 1,
            "student": 1,
            "group": 1,
            "is_present": true,
            "date": "2026-01-18T10:00:00Z",
            "created_at": "2026-01-18T10:05:00Z"
          }
```

---

## Error Handling Flow

```
API Request
       │
       ├─ Validation Error
       │  ├─ Invalid JSON → 400 Bad Request
       │  ├─ Missing fields → 400 Bad Request
       │  └─ Invalid data types → 400 Bad Request
       │
       ├─ Authentication Error
       │  ├─ No token → 401 Unauthorized
       │  ├─ Invalid token → 401 Unauthorized
       │  └─ Token expired → 401 Unauthorized (+ refresh option)
       │
       ├─ Permission Error
       │  ├─ Wrong role → 403 Forbidden
       │  │  "You must be a teacher to access this resource"
       │  ├─ Wrong user's data → 403 Forbidden
       │  │  "You can only access your own data"
       │  └─ Insufficient permissions → 403 Forbidden
       │
       ├─ Resource Error
       │  ├─ Not found → 404 Not Found
       │  │  "Student not found in your groups"
       │  └─ Conflict → 409 Conflict
       │
       └─ Server Error
          ├─ Internal error → 500 Internal Server Error
          └─ Not implemented → 501 Not Implemented
```

---

## Deployment Architecture (Production)

```
┌──────────────────────────────────────────────────┐
│           CLIENTS (Multiple)                     │
│   - Web Browsers                                 │
│   - Mobile Apps                                  │
│   - Integrations                                 │
└──────────────────────────────────────────────────┘
                    │
                    │ HTTPS/TLS
                    ▼
┌──────────────────────────────────────────────────┐
│      LOAD BALANCER (nginx/HAProxy)               │
│  - Distribute traffic                            │
│  - SSL/TLS termination                           │
│  - Rate limiting                                 │
│  - Caching                                       │
└──────────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    ┌────────┐ ┌────────┐ ┌────────┐
    │ Django │ │ Django │ │ Django │ (Multiple instances)
    │ Server │ │ Server │ │ Server │ (Gunicorn/uWSGI)
    │  :8000 │ │  :8001 │ │  :8002 │
    └────────┘ └────────┘ └────────┘
        │           │           │
        └───────────┼───────────┘
                    │
                    ▼
        ┌──────────────────────┐
        │  PostgreSQL Database │
        │  (Primary + Replicas)│
        │  - Students          │
        │  - Teachers          │
        │  - Groups            │
        │  - Attendance        │
        │  - Performance       │
        │  - Payments          │
        │  - 2FA Auth          │
        └──────────────────────┘
```

---

## Summary

These diagrams show:

1. **Overall Architecture** - How all components interact
2. **Authentication Flows** - Both JWT and 2FA
3. **Permission System** - How access control works
4. **API Workflows** - Teacher and Student request flows
5. **Database Schema** - All models and relationships
6. **Error Handling** - Error response paths
7. **Production Setup** - Scalable deployment

Each diagram can be expanded with specific details as needed during implementation.

