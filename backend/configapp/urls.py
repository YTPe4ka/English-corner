from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StudentViewSet, TeacherViewSet, GroupViewSet, PaymentViewSet,
    AttendanceViewSet, PerformanceViewSet, AdminViewSet,
    PermissionViewSet, AdminPermissionViewSet, AdminLogViewSet, NotificationViewSet,
    # Teacher API
    TeacherGroupViewSet, TeacherAttendanceViewSet, TeacherPerformanceViewSet, TeacherProfileViewSet,
    # Student API
    StudentGroupViewSet, StudentAttendanceViewSet, StudentPerformanceViewSet, StudentPaymentViewSet, StudentProfileViewSet,
    # Lesson API
    LessonViewSet, LessonPaymentViewSet, StudentLessonViewSet,
    StudentLessonTableView, StudentLessonStatusView
)
from .auth_views import (
    UserLoginView, UserLogoutView, TokenRefreshView, CurrentUserView,
    SuperAdminLoginView, SuperAdminVerifyCodeView, SuperAdminResendCodeView
)

# Import AdminViewSet to create dashboard endpoint
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

# Создать маршрутизатор и зарегистрировать вьюсеты
router = DefaultRouter()

# Students and Teachers
router.register(r'students', StudentViewSet, basename='student')
router.register(r'teachers', TeacherViewSet, basename='teacher')

# Groups
router.register(r'groups', GroupViewSet, basename='group')

# Finance
router.register(r'payments', PaymentViewSet, basename='payment')

# Analytics
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'performance', PerformanceViewSet, basename='performance')

# Admin
router.register(r'admins', AdminViewSet, basename='admin')
router.register(r'permissions', PermissionViewSet, basename='permission')
router.register(r'admin-permissions', AdminPermissionViewSet, basename='admin-permission')
router.register(r'admin-logs', AdminLogViewSet, basename='admin-log')

# Teacher API (только для учителей)
router.register(r'teacher/groups', TeacherGroupViewSet, basename='teacher-groups')
router.register(r'teacher/attendance', TeacherAttendanceViewSet, basename='teacher-attendance')
router.register(r'teacher/performance', TeacherPerformanceViewSet, basename='teacher-performance')
router.register(r'teacher/profile', TeacherProfileViewSet, basename='teacher-profile')

# Student API (только для студентов)
router.register(r'student/groups', StudentGroupViewSet, basename='student-groups')
router.register(r'student/attendance', StudentAttendanceViewSet, basename='student-attendance')
router.register(r'student/performance', StudentPerformanceViewSet, basename='student-performance')
router.register(r'student/payments', StudentPaymentViewSet, basename='student-payments')
router.register(r'student/profile', StudentProfileViewSet, basename='student-profile')

# Lessons API
router.register(r'lessons', LessonViewSet, basename='lesson')
router.register(r'lesson-payments', LessonPaymentViewSet, basename='lesson-payment')
router.register(r'student-lessons', StudentLessonViewSet, basename='student-lesson')
router.register(r'notifications', NotificationViewSet, basename='notification')                                                          

app_name = 'configapp'

urlpatterns = [
    # Аутентификация (обычный User)
    path('auth/login/', UserLoginView.as_view(), name='login'),
    path('auth/logout/', UserLogoutView.as_view(), name='logout'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='current-user'),
    
    # SuperAdmin 2FA аутентификация
    path('auth/superadmin/login/', SuperAdminLoginView.as_view(), name='superadmin-login'),
    path('auth/superadmin/verify/', SuperAdminVerifyCodeView.as_view(), name='superadmin-verify'),
    path('auth/superadmin/resend/', SuperAdminResendCodeView.as_view(), name='superadmin-resend'),
    
    # Admin 2FA endpoints (альтернативный путь)
    path('admin/2fa/login/', SuperAdminLoginView.as_view(), name='admin-2fa-login'),
    path('admin/2fa/verify/', SuperAdminVerifyCodeView.as_view(), name='admin-2fa-verify'),
    path('admin/2fa/resend/', SuperAdminResendCodeView.as_view(), name='admin-2fa-resend'),
    
    # Admin Dashboard
    path('admin/dashboard/', AdminViewSet.as_view({'get': 'dashboard_stats'}), name='admin-dashboard'),
    path('admin/finance-history/', AdminViewSet.as_view({'get': 'finance_history'}), name='admin-finance-history'),
    
    # Lesson Management APIs
    path('groups/<int:group_id>/lesson-table/', StudentLessonTableView.as_view(), name='lesson-table'),
    path('students/<int:student_id>/groups/<int:group_id>/lessons/', StudentLessonStatusView.as_view(), name='student-lesson-status'),
    
    # API endpoints
    path('', include(router.urls)),
]

