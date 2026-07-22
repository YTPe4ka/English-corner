from rest_framework.permissions import BasePermission
from django.contrib.auth.models import User
from configapp.models import Admin, Teacher, Student


class IsTeacher(BasePermission):
    """Разрешение для учителей"""
    message = "You must be a teacher to access this resource."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and hasattr(request.user, 'teacher_profile')


class IsStudent(BasePermission):
    """Разрешение для студентов"""
    message = "You must be a student to access this resource."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and hasattr(request.user, 'student_profile')


class IsAdmin(BasePermission):
    """Разрешение для администраторов"""
    message = "You must be an admin to access this resource."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        try:
            admin = Admin.objects.get(user=request.user)
            return admin.is_active
        except Admin.DoesNotExist:
            return False


class IsSuperAdmin(BasePermission):
    """Разрешение для супер-администраторов"""
    message = "You must be a SuperAdmin to access this resource."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        try:
            admin = Admin.objects.get(user=request.user, role='super_admin', is_active=True)
            return True
        except Admin.DoesNotExist:
            return False


class IsAdminOrSuperAdmin(BasePermission):
    """Разрешение для администраторов и супер-администраторов"""
    message = "You must be an admin or superadmin to access this resource."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        try:
            admin = Admin.objects.get(user=request.user)
            return admin.is_active and admin.role in ['admin', 'super_admin']
        except Admin.DoesNotExist:
            return False


class IsTeacherOfGroup(BasePermission):
    """Разрешение для учителя, который преподаёт в группе"""
    message = "You can only access your own groups."

    def has_object_permission(self, request, view, obj):
        """Проверить что это группа этого учителя"""
        try:
            teacher = Teacher.objects.get(user=request.user)
            return obj.teacher == teacher
        except Teacher.DoesNotExist:
            return False


class IsStudentInGroup(BasePermission):
    """Разрешение для студента, который учится в группе"""
    message = "You can only access groups you are enrolled in."

    def has_object_permission(self, request, view, obj):
        """Проверить что студент учится в этой группе"""
        try:
            student = Student.objects.get(user=request.user)
            from configapp.models import GroupStudent
            return GroupStudent.objects.filter(
                student=student,
                group=obj,
                is_active=True
            ).exists()
        except Student.DoesNotExist:
            return False


class IsStudentOwner(BasePermission):
    """Разрешение для владельца данных студента"""
    message = "You can only access your own data."

    def has_object_permission(self, request, view, obj):
        """Проверить что это данные этого студента"""
        try:
            student = Student.objects.get(user=request.user)
            return obj.student == student
        except Student.DoesNotExist:
            return False


class IsTeacherOrSuperAdmin(BasePermission):
    """Разрешение для учителя или супер-админа"""
    message = "You must be a teacher or superadmin to access this resource."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        # Проверить что это учитель
        if hasattr(request.user, 'teacher_profile'):
            return True
        
        # Проверить что это супер-админ
        try:
            admin = Admin.objects.get(user=request.user, role='super_admin', is_active=True)
            return True
        except Admin.DoesNotExist:
            pass
        
        return False


class CanManagePayments(BasePermission):
    """Разрешение для управления платежами (только админ и супер-админ)"""
    message = "You don't have permission to manage payments."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        try:
            admin = Admin.objects.get(user=request.user)
            return admin.is_active and admin.role in ['admin', 'super_admin']
        except Admin.DoesNotExist:
            return False
