# Teacher & Student API Documentation

## Overview
This document describes the Teacher and Student role-based API endpoints implemented in the English Corner backend.

## Authentication
All endpoints require JWT authentication via `Authorization: Bearer <access_token>` header (except public endpoints).

## Teacher API Endpoints

### 1. Teacher Groups - View My Groups
- **Endpoint**: `GET /api/v1/teacher/groups/`
- **Permission**: IsAuthenticated + IsTeacher
- **Description**: Get all groups taught by the current teacher
- **Response**:
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Beginner Level",
      "description": "English for beginners",
      "teacher": {
        "id": 1,
        "user": {
          "id": 1,
          "username": "john_teacher",
          "email": "john@example.com"
        },
        "qualification": "TEFL Certificate"
      },
      "students_count": 15,
      "created_at": "2026-01-18T10:00:00Z"
    }
  ]
}
```

### 2. Teacher Groups - View Group Details
- **Endpoint**: `GET /api/v1/teacher/groups/{id}/`
- **Permission**: IsAuthenticated + IsTeacher
- **Description**: Get detailed information about a specific group
- **Response**: Same structure as list above

### 3. Teacher Attendance - Mark Attendance
- **Endpoint**: `POST /api/v1/teacher/attendance/`
- **Permission**: IsAuthenticated + IsTeacher
- **Description**: Record attendance for a student in your group
- **Request Body**:
```json
{
  "student": 1,
  "group": 1,
  "is_present": true,
  "date": "2026-01-18"
}
```
- **Response**: 201 Created with attendance record

### 4. Teacher Attendance - View All Attendance (Your Groups)
- **Endpoint**: `GET /api/v1/teacher/attendance/`
- **Permission**: IsAuthenticated + IsTeacher
- **Description**: View all attendance records for your groups
- **Response**:
```json
{
  "count": 30,
  "results": [
    {
      "id": 1,
      "student": {
        "id": 1,
        "user": {
          "username": "student1",
          "email": "student1@example.com"
        }
      },
      "group": 1,
      "is_present": true,
      "date": "2026-01-18T10:00:00Z"
    }
  ]
}
```

### 5. Teacher Attendance - Get Student Attendance Stats
- **Endpoint**: `GET /api/v1/teacher/attendance/student_attendance/?student_id=1`
- **Permission**: IsAuthenticated + IsTeacher
- **Description**: Get attendance statistics for a student (must be in your group)
- **Response**:
```json
{
  "total_classes": 20,
  "present": 18,
  "absent": 2,
  "attendance_rate": 90.0,
  "records": [
    {
      "id": 1,
      "date": "2026-01-18",
      "is_present": true
    }
  ]
}
```

### 6. Teacher Performance - Add Student Grade
- **Endpoint**: `POST /api/v1/teacher/performance/`
- **Permission**: IsAuthenticated + IsTeacher
- **Description**: Record a grade/assessment for a student
- **Request Body**:
```json
{
  "student": 1,
  "group": 1,
  "grade": 85,
  "comment": "Good progress"
}
```
- **Response**: 201 Created with performance record

### 7. Teacher Performance - View All Grades (Your Students)
- **Endpoint**: `GET /api/v1/teacher/performance/`
- **Permission**: IsAuthenticated + IsTeacher
- **Description**: View all grades you've given to students in your groups
- **Response**:
```json
{
  "count": 50,
  "results": [
    {
      "id": 1,
      "student": 1,
      "group": 1,
      "grade": 85,
      "comment": "Good progress",
      "assessed_by": 1,
      "created_at": "2026-01-18T10:00:00Z"
    }
  ]
}
```

### 8. Teacher Performance - Get Student Grade Stats
- **Endpoint**: `GET /api/v1/teacher/performance/student_performance/?student_id=1`
- **Permission**: IsAuthenticated + IsTeacher
- **Description**: Get grade statistics for a specific student
- **Response**:
```json
{
  "total_assessments": 5,
  "average_grade": 84.2,
  "records": [
    {
      "id": 1,
      "student": 1,
      "grade": 85,
      "comment": "Good"
    }
  ]
}
```

### 9. Teacher Profile - View My Profile
- **Endpoint**: `GET /api/v1/teacher/profile/`
- **Permission**: IsAuthenticated + IsTeacher
- **Description**: Get your teacher profile information
- **Response**:
```json
{
  "id": 1,
  "user": {
    "id": 1,
    "username": "john_teacher",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "qualification": "TEFL Certificate",
  "experience_years": 5,
  "bio": "Experienced English teacher",
  "created_at": "2026-01-01T10:00:00Z"
}
```

---

## Student API Endpoints

### 1. Student Groups - View My Groups
- **Endpoint**: `GET /api/v1/student/groups/`
- **Permission**: IsAuthenticated + IsStudent
- **Description**: Get all groups the student is enrolled in (active enrollment only)
- **Response**:
```json
{
  "count": 3,
  "results": [
    {
      "id": 1,
      "name": "Beginner Level",
      "description": "English for beginners",
      "teacher": {
        "id": 1,
        "user": {
          "username": "john_teacher",
          "email": "john@example.com"
        }
      },
      "students_count": 15,
      "created_at": "2026-01-18T10:00:00Z"
    }
  ]
}
```

### 2. Student Groups - View Group Details
- **Endpoint**: `GET /api/v1/student/groups/{id}/`
- **Permission**: IsAuthenticated + IsStudent
- **Description**: Get detailed information about a group you're enrolled in
- **Response**: Same structure as list above

### 3. Student Attendance - View My Attendance
- **Endpoint**: `GET /api/v1/student/attendance/`
- **Permission**: IsAuthenticated + IsStudent
- **Description**: View your attendance records with statistics
- **Response**:
```json
{
  "total_classes": 20,
  "present": 18,
  "absent": 2,
  "attendance_rate": 90.0,
  "records": [
    {
      "id": 1,
      "student": 1,
      "group": 1,
      "is_present": true,
      "date": "2026-01-18T10:00:00Z"
    }
  ]
}
```

### 4. Student Performance - View My Grades
- **Endpoint**: `GET /api/v1/student/performance/`
- **Permission**: IsAuthenticated + IsStudent
- **Description**: View all your grades with statistics
- **Response**:
```json
{
  "total_assessments": 5,
  "average_grade": 84.2,
  "records": [
    {
      "id": 1,
      "student": 1,
      "group": 1,
      "grade": 85,
      "comment": "Good progress",
      "assessed_by": {
        "user": {
          "username": "john_teacher"
        }
      },
      "created_at": "2026-01-18T10:00:00Z"
    }
  ]
}
```

### 5. Student Payments - View My Balance & Payment History
- **Endpoint**: `GET /api/v1/student/payments/`
- **Permission**: IsAuthenticated + IsStudent
- **Description**: View your account balance and payment history
- **Response**:
```json
{
  "current_balance": 5000.00,
  "total_paid": 15000.00,
  "payment_history": [
    {
      "id": 1,
      "student": 1,
      "group": 1,
      "amount": 5000.00,
      "payment_date": "2026-01-15T10:00:00Z",
      "payment_method": "credit_card",
      "status": "completed"
    }
  ]
}
```

### 6. Student Profile - View My Profile
- **Endpoint**: `GET /api/v1/student/profile/`
- **Permission**: IsAuthenticated + IsStudent
- **Description**: Get your student profile information
- **Response**:
```json
{
  "id": 1,
  "user": {
    "id": 1,
    "username": "student1",
    "email": "student1@example.com",
    "first_name": "Alice",
    "last_name": "Smith"
  },
  "level": "Beginner",
  "bio": "Passionate about learning English",
  "phone": "+1234567890",
  "balance": 5000.00,
  "created_at": "2026-01-01T10:00:00Z"
}
```

---

## Permission Rules Summary

### Teacher Access
- ✅ View **only own groups**
- ✅ View **only own students' attendance**
- ✅ Mark attendance in **own groups only**
- ✅ Add grades to **own students only**
- ✅ View **own profile**
- ❌ Cannot access student endpoints
- ❌ Cannot modify other teachers' data

### Student Access
- ✅ View **own enrolled groups**
- ✅ View **own attendance records**
- ✅ View **own grades**
- ✅ View **own balance & payments**
- ✅ View **own profile**
- ❌ Cannot create/modify any data
- ❌ Cannot access teacher endpoints
- ❌ Cannot view other students' data

---

## Testing with cURL Examples

### Teacher - Login and Get Token
```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher1","password":"password123"}'
```

### Teacher - View My Groups
```bash
curl http://localhost:8000/api/v1/teacher/groups/ \
  -H "Authorization: Bearer <access_token>"
```

### Teacher - Mark Attendance
```bash
curl -X POST http://localhost:8000/api/v1/teacher/attendance/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "student": 1,
    "group": 1,
    "is_present": true,
    "date": "2026-01-18"
  }'
```

### Student - Login and Get Token
```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"student1","password":"password123"}'
```

### Student - View My Groups
```bash
curl http://localhost:8000/api/v1/student/groups/ \
  -H "Authorization: Bearer <access_token>"
```

### Student - View My Attendance Statistics
```bash
curl http://localhost:8000/api/v1/student/attendance/ \
  -H "Authorization: Bearer <access_token>"
```

### Student - View My Grades
```bash
curl http://localhost:8000/api/v1/student/performance/ \
  -H "Authorization: Bearer <access_token>"
```

### Student - View My Balance and Payments
```bash
curl http://localhost:8000/api/v1/student/payments/ \
  -H "Authorization: Bearer <access_token>"
```

---

## Error Responses

### 401 Unauthorized
When JWT token is missing or invalid:
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
When user doesn't have required role (e.g., student trying to access teacher endpoint):
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
When resource doesn't exist or user doesn't have access:
```json
{
  "error": "Student not found in your groups"
}
```

---

## Statistics Features

### Attendance Statistics (for both Teacher and Student)
- **total_classes**: Total number of classes recorded
- **present**: Number of classes attended
- **absent**: Number of classes missed
- **attendance_rate**: Percentage attendance (0-100%)

### Performance Statistics (for both Teacher and Student)
- **total_assessments**: Total number of grades recorded
- **average_grade**: Average of all grades
- **records**: List of all assessment records with grades and comments

---

## Implementation Details

### Permission Classes Used
- `IsAuthenticated`: Base requirement for all endpoints
- `IsTeacher`: User must have teacher_profile
- `IsStudent`: User must have student_profile

### QuerySet Filtering
All endpoints implement automatic filtering:
- **Teacher ViewSets**: Filter by `teacher=current_user.teacher_profile`
- **Student ViewSets**: Filter by `student=current_user.student_profile`

This ensures users can only access their own data and their students/groups' data.

### Data Isolation
- Teachers cannot see students from other teachers' groups
- Students cannot see attendance/grades of other students
- Both roles have read-only access to their own profile information
- Teachers can create/modify data only for their own groups

---

## Status
✅ All endpoints implemented and tested
✅ Permission checks working correctly
✅ Data isolation enforced
✅ Statistics calculations included
✅ Available in Swagger UI at http://localhost:8000/api/docs/

