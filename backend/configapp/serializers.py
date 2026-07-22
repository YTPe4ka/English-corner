from rest_framework import serializers
from django.contrib.auth.models import User
from django.db import OperationalError
from django.db.models import Q, Sum
from django.utils import timezone
from .models import (
    Student, Teacher, Group, GroupStudent, Payment, 
    Attendance, Performance, Admin, Permission, AdminPermission, AdminLog,
    Lesson, LessonPayment, StudentLesson, ActionLog, Notification
)


# User Serializers
# User Serializers
class UserSerializer(serializers.ModelSerializer):
    """Сериализатор пользователя"""
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'is_active', 'date_joined']
        read_only_fields = ['id', 'date_joined']
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create_user(**validated_data, password=password)
        return user


# Helper function to get next sequential personal_id (1, 2, 3...)
def get_next_student_personal_id():
    import re
    max_num = 0
    for p_id in Student.objects.values_list('personal_id', flat=True):
        if p_id:
            nums = re.findall(r'\d+', str(p_id))
            if nums:
                val = int(nums[-1])
                if val > max_num:
                    max_num = val
    if max_num == 0:
        max_num = Student.objects.count()
    return str(max_num + 1)


def get_next_teacher_personal_id():
    import re
    max_num = 0
    for p_id in Teacher.objects.values_list('personal_id', flat=True):
        if p_id:
            nums = re.findall(r'\d+', str(p_id))
            if nums:
                val = int(nums[-1])
                if val > max_num:
                    max_num = val
    if max_num == 0:
        max_num = Teacher.objects.count()
    return str(max_num + 1)


# Student Serializers
class StudentSerializer(serializers.ModelSerializer):
    """Основной сериализатор студента"""
    user_detail = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = Student
        fields = ['id', 'user', 'user_detail', 'personal_id', 'phone', 'date_of_birth', 'balance', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'balance', 'created_at', 'updated_at']


class StudentDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор студента"""
    user = UserSerializer()
    personal_id = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=True)
    payments = serializers.SerializerMethodField()
    lesson_payments = serializers.SerializerMethodField()
    action_logs = serializers.SerializerMethodField()
    financial_summary = serializers.SerializerMethodField()
    lesson_summary = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            'id', 'user', 'personal_id', 'phone', 'date_of_birth', 'balance', 'is_active',
            'created_at', 'updated_at', 'payments', 'lesson_payments', 'action_logs',
            'financial_summary', 'lesson_summary'
        ]
        read_only_fields = ['id', 'balance', 'created_at', 'updated_at']

    def get_payments(self, obj):
        return PaymentSerializer(obj.payments.all().order_by('-payment_date'), many=True).data

    def get_lesson_payments(self, obj):
        return LessonPaymentSerializer(obj.lesson_payments.all().order_by('-payment_date'), many=True).data

    def get_action_logs(self, obj):
        return ActionLogSerializer(obj.action_logs.all().order_by('-created_at'), many=True).data

    def get_financial_summary(self, obj):
        total_topups = obj.payments.filter(payment_type='enrollment').aggregate(total=Sum('amount'))['total'] or 0
        total_monthly = obj.payments.filter(payment_type='monthly').aggregate(total=Sum('amount'))['total'] or 0
        total_discounts = obj.payments.filter(payment_type='discount').aggregate(total=Sum('amount'))['total'] or 0
        total_lesson_spent = obj.lesson_payments.aggregate(total=Sum('total_amount'))['total'] or 0
        total_paid = total_monthly + total_lesson_spent - total_discounts

        return {
            'total_topups': float(total_topups),
            'total_monthly_payments': float(total_monthly),
            'total_lesson_spent': float(total_lesson_spent),
            'total_discounts': float(total_discounts),
            'total_paid': float(total_paid),
            'current_balance': float(obj.balance or 0),
        }

    def get_lesson_summary(self, obj):
        lessons_remaining = obj.lesson_payments.aggregate(total=Sum('lessons_remaining'))['total'] or 0
        bonus_lessons = obj.student_lessons.filter(status='bonus').count()
        removed_lessons = obj.student_lessons.filter(status='removed').count()
        paid_lessons = obj.student_lessons.filter(status='paid').count()
        unpaid_lessons = obj.student_lessons.filter(status='unpaid').count()
        future_lessons = obj.student_lessons.filter(status='future').count()

        return {
            'lessons_remaining': int(lessons_remaining),
            'bonus_lessons': bonus_lessons,
            'removed_lessons': removed_lessons,
            'paid_lessons': paid_lessons,
            'unpaid_lessons': unpaid_lessons,
            'future_lessons': future_lessons,
            'lesson_balance': int(lessons_remaining) + bonus_lessons,
        }

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        
        # 1. Auto-generate personal_id sequentially: 1, 2, 3...
        if not validated_data.get('personal_id'):
            validated_data['personal_id'] = get_next_student_personal_id()

        # 2. Auto-generate username if not supplied
        if not user_data.get('username'):
            first = (user_data.get('first_name') or '').strip().lower()
            last = (user_data.get('last_name') or '').strip().lower()
            pid = validated_data['personal_id']
            base_name = f"{first}_{last}".strip('_') or 'student'
            user_data['username'] = f"{base_name}_{pid}"

        # 3. Default password if not supplied
        if not user_data.get('password'):
            user_data['password'] = 'student123'

        user_serializer = UserSerializer(data=user_data)
        user_serializer.is_valid(raise_exception=True)
        user = user_serializer.save()
        student = Student.objects.create(user=user, **validated_data)
        return student
     
    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        if user_data:
            user = instance.user
            for attr, value in user_data.items():
                if hasattr(user, attr):
                    setattr(user, attr, value)
            user.save()

        for attr, value in validated_data.items():
            if hasattr(instance, attr):
                setattr(instance, attr, value)
        instance.save()
        return instance


# Teacher Serializers
class TeacherSerializer(serializers.ModelSerializer):
    """Основной сериализатор учителя"""
    user_detail = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = Teacher
        fields = ['id', 'user', 'user_detail', 'personal_id', 'phone', 'specialization', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class TeacherDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор учителя"""
    user = UserSerializer()
    personal_id = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=True)
    
    class Meta:
        model = Teacher
        fields = ['id', 'user', 'personal_id', 'phone', 'specialization', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        
        if not validated_data.get('personal_id'):
            validated_data['personal_id'] = get_next_teacher_personal_id()

        if not user_data.get('username'):
            first = (user_data.get('first_name') or '').strip().lower()
            last = (user_data.get('last_name') or '').strip().lower()
            pid = validated_data['personal_id']
            base_name = f"{first}_{last}".strip('_') or 'teacher'
            user_data['username'] = f"{base_name}_{pid}"

        if not user_data.get('password'):
            user_data['password'] = 'teacher123'

        user_serializer = UserSerializer(data=user_data)
        user_serializer.is_valid(raise_exception=True)
        user = user_serializer.save()
        teacher = Teacher.objects.create(user=user, **validated_data)
        return teacher
    
    def update(self, instance, validated_data):
        # Handle nested user updates
        user_data = validated_data.pop('user', None)
        if user_data:
            user = instance.user
            for attr, value in user_data.items():
                if hasattr(user, attr):
                    setattr(user, attr, value)
            user.save()

        # Update teacher fields
        for attr, value in validated_data.items():
            if hasattr(instance, attr):
                setattr(instance, attr, value)
        instance.save()
        return instance


# Group Serializers
class GroupSerializer(serializers.ModelSerializer):
    """Основной сериализатор группы"""
    level = serializers.ChoiceField(choices=Group.LEVEL_CHOICES, required=False, default='beginner')
    teacher_detail = TeacherSerializer(source='teacher', read_only=True)
    students_count = serializers.SerializerMethodField()
    end_date = serializers.DateTimeField(required=False, allow_null=True)
    
    class Meta:
        model = Group
        fields = ['id', 'name', 'description', 'level', 'teacher', 'teacher_detail', 
                  'start_date', 'start_time', 'end_date', 'end_time', 'max_students', 'students_count', 'price_per_month',
                  'schedule_type', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'students_count', 'created_at', 'updated_at']
    
    def get_students_count(self, obj):
        return obj.get_students_count()
    
    def create(self, validated_data):
        """При создании группы, если end_date не указан, вычислить его автоматически"""
        from .lesson_utils import calculate_end_date
        
        # Если end_date не передан, вычисляем его
        if not validated_data.get('end_date'):
            start_date = validated_data.get('start_date')
            schedule_type = validated_data.get('schedule_type', 'odd')
            if start_date:
                end_date = calculate_end_date(start_date, 12, schedule_type)
                validated_data['end_date'] = end_date
        
        return super().create(validated_data)


class GroupStudentSerializer(serializers.ModelSerializer):
    """Сериализатор связи студент-группа"""
    student_detail = StudentSerializer(source='student', read_only=True)
    group_detail = GroupSerializer(source='group', read_only=True)
    
    class Meta:
        model = GroupStudent
        fields = ['id', 'student', 'student_detail', 'group', 'group_detail', 'joined_at', 'left_at', 'is_active']
        read_only_fields = ['id', 'joined_at']


# Permission Serializers (moved before Admin to avoid forward reference)
class PermissionSerializer(serializers.ModelSerializer):
    """Сериализатор прав доступа"""
    class Meta:
        model = Permission
        fields = ['id', 'name', 'code', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


# AdminPermission Serializers (moved before Admin to avoid forward reference)
class AdminPermissionSerializer(serializers.ModelSerializer):
    """Сериализатор прав доступа администратора"""
    permission_detail = PermissionSerializer(source='permission', read_only=True)
    
    class Meta:
        model = AdminPermission
        fields = ['id', 'permission', 'permission_detail', 'granted_at']
        read_only_fields = ['id', 'granted_at']


# Admin Serializers (moved before Payment to support processed_by_detail)
class AdminSerializer(serializers.ModelSerializer):
    """Основной сериализатор для администратора"""
    user_detail = UserSerializer(source='user', read_only=True)
    permissions = AdminPermissionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Admin
        fields = ['id', 'user', 'user_detail', 'role', 'is_active', 'permissions', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class AdminDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор администратора со всей информацией"""
    user = UserSerializer()
    permissions = AdminPermissionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Admin
        fields = ['id', 'user', 'role', 'is_active', 'permissions', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        user_serializer = UserSerializer(data=user_data)
        user_serializer.is_valid(raise_exception=True)
        user = user_serializer.save()
        admin = Admin.objects.create(user=user, **validated_data)
        return admin


# Payment Serializers
class PaymentSerializer(serializers.ModelSerializer):
    """Сериализатор платежей"""
    student_detail = StudentSerializer(source='student', read_only=True)
    group_detail = GroupSerializer(source='group', read_only=True)
    processed_by_detail = AdminSerializer(source='processed_by', read_only=True)
    
    class Meta:
        model = Payment
        fields = ['id', 'student', 'student_detail', 'group', 'group_detail', 
                  'amount', 'payment_type', 'description', 'payment_date', 'processed_by', 'processed_by_detail']
        read_only_fields = ['id', 'payment_date']


# Attendance Serializers
class AttendanceSerializer(serializers.ModelSerializer):
    """Сериализатор посещаемости"""
    student_detail = StudentSerializer(source='student', read_only=True)
    group_detail = GroupSerializer(source='group', read_only=True)
    
    class Meta:
        model = Attendance
        fields = ['id', 'student', 'student_detail', 'group', 'group_detail', 
                  'class_date', 'is_present', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']


# Performance Serializers
class PerformanceSerializer(serializers.ModelSerializer):
    """Сериализатор успеваемости"""
    student_detail = StudentSerializer(source='student', read_only=True)
    group_detail = GroupSerializer(source='group', read_only=True)
    teacher_detail = TeacherSerializer(source='assessed_by', read_only=True)
    
    class Meta:
        model = Performance
        fields = ['id', 'student', 'student_detail', 'group', 'group_detail', 
                  'assessment_date', 'grade', 'subject', 'comments', 'assessed_by', 'teacher_detail']
        read_only_fields = ['id', 'assessment_date']


class GroupDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор группы со студентами"""
    teacher_detail = TeacherSerializer(source='teacher', read_only=True)
    students = GroupStudentSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    performance_records = PerformanceSerializer(many=True, read_only=True)
    attendances = AttendanceSerializer(many=True, read_only=True)
    action_logs = serializers.SerializerMethodField()
    students_count = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()
    
    class Meta:
        model = Group
        fields = ['id', 'name', 'description', 'level', 'teacher', 'teacher_detail', 
              'start_date', 'start_time', 'end_date', 'end_time', 'schedule_type', 'max_students', 'students_count', 'students',
              'price_per_month', 'is_active', 'created_at', 'updated_at',
              'payments', 'action_logs', 'performance_records', 'attendances']
        read_only_fields = ['id', 'students_count', 'created_at', 'updated_at']
    
    def get_students_count(self, obj):
        return obj.get_students_count()

    def get_is_active(self, obj):
        if obj.end_date and obj.end_date < timezone.now():
            return False
        return obj.is_active

    def get_action_logs(self, obj):
        try:
            logs = ActionLog.objects.filter(group_id=obj.pk).select_related('student', 'created_by', 'payment')
        except OperationalError:
            return []
        return ActionLogSerializer(logs, many=True).data


# AdminLog Serializers
class AdminLogSerializer(serializers.ModelSerializer):
    """Сериализатор логирования действий администраторов"""
    admin_detail = AdminSerializer(source='admin', read_only=True)
    
    class Meta:
        model = AdminLog
        fields = ['id', 'admin', 'admin_detail', 'action', 'model_name', 'object_id', 'description', 'ip_address', 'created_at']
        read_only_fields = ['id', 'created_at']


# Statistics Serializers
class AdminStatsSerializer(serializers.Serializer):
    """Сериализатор статистики администраторов"""
    total_admins = serializers.IntegerField()
    active_admins = serializers.IntegerField()
    total_permissions = serializers.IntegerField()
    total_logs = serializers.IntegerField()


class DashboardStatsSerializer(serializers.Serializer):
    """Сериализатор статистики панели"""
    total_students = serializers.IntegerField()
    active_students = serializers.IntegerField()
    total_teachers = serializers.IntegerField()
    active_teachers = serializers.IntegerField()
    total_groups = serializers.IntegerField()
    active_groups = serializers.IntegerField()
    total_payments = serializers.FloatField()
    pending_payments = serializers.IntegerField()


class FinanceLogEntrySerializer(serializers.Serializer):
    """Сериализатор глобальной истории финансовых операций"""
    id = serializers.CharField()
    date = serializers.DateTimeField()
    student_id = serializers.IntegerField(allow_null=True)
    student_name = serializers.CharField(allow_null=True)
    group_id = serializers.IntegerField(allow_null=True)
    group_name = serializers.CharField(allow_null=True)
    action_type = serializers.CharField()
    action_label = serializers.CharField()
    lessons_affected = serializers.IntegerField(allow_null=True)
    amount = serializers.DecimalField(max_digits=20, decimal_places=2, allow_null=True)
    admin_id = serializers.IntegerField(allow_null=True)
    admin_name = serializers.CharField(allow_null=True)
    description = serializers.CharField(allow_null=True)
    source = serializers.CharField()


# Lesson Serializers
class LessonSerializer(serializers.ModelSerializer):
    """Сериализатор урока"""
    class Meta:
        model = Lesson
        fields = ['id', 'group', 'lesson_number', 'scheduled_date', 'duration_minutes', 'topic', 'description', 'homework', 'is_completed', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class LessonPaymentSerializer(serializers.ModelSerializer):
    """Сериализатор платежа за уроки"""
    student_detail = StudentSerializer(source='student', read_only=True)
    group_detail = serializers.SerializerMethodField()
    
    class Meta:
        model = LessonPayment
        fields = ['id', 'student', 'student_detail', 'group', 'group_detail', 'lessons_purchased', 'total_amount', 'price_per_lesson', 'lessons_remaining', 'status', 'payment_date', 'processed_by']
        read_only_fields = ['id', 'payment_date']
    
    def get_group_detail(self, obj):
        return GroupSerializer(obj.group, read_only=True).data


class StudentLessonSerializer(serializers.ModelSerializer):
    """Сериализатор статуса студента на уроке"""
    student_detail = StudentSerializer(source='student', read_only=True)
    lesson_detail = LessonSerializer(source='lesson', read_only=True)
    payment_detail = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentLesson
        fields = ['id', 'student', 'student_detail', 'lesson', 'lesson_detail', 'group', 'status', 'payment', 'payment_detail', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_payment_detail(self, obj):
        if obj.payment:
            return LessonPaymentSerializer(obj.payment, read_only=True).data
        return None


class ActionLogSerializer(serializers.ModelSerializer):
    """Сериализатор логирования действий"""
    student_detail = StudentSerializer(source='student', read_only=True)
    group_detail = GroupSerializer(source='group', read_only=True)
    admin_detail = AdminSerializer(source='created_by', read_only=True)
    payment_detail = serializers.SerializerMethodField()

    class Meta:
        model = ActionLog
        fields = ['id', 'student', 'student_detail', 'group', 'group_detail', 'action_type', 'lessons_affected', 'amount', 'description', 'created_by', 'admin_detail', 'payment', 'payment_detail', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_payment_detail(self, obj):
        if obj.payment:
            return LessonPaymentSerializer(obj.payment, read_only=True).data
        return None


class NotificationSerializer(serializers.ModelSerializer):
    """Сериализатор уведомлений"""
    recipient_detail = UserSerializer(source='recipient', read_only=True)
    group_detail = GroupSerializer(source='group', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'recipient_detail', 'group', 'group_detail', 'notification_type', 'message', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']


class StudentLessonTableSerializer(serializers.Serializer):
    """Сериализатор таблицы выставки уроков студентов в группе"""
    group = serializers.DictField()
    lessons = serializers.ListField()
    students = serializers.ListField()
