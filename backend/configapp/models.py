from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Student(models.Model):
    """Модель студента"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    personal_id = models.CharField(max_length=20, unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    balance = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Student'
        verbose_name_plural = 'Students'
        ordering = ['personal_id']
    
    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} (ID: {self.personal_id})"


class Teacher(models.Model):
    """Модель учителя"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile')
    personal_id = models.CharField(max_length=20, unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    specialization = models.CharField(max_length=200, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Teacher'
        verbose_name_plural = 'Teachers'
        ordering = ['personal_id']
    
    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} (ID: {self.personal_id})"


class Group(models.Model):
    """Модель группы учащихся"""
    LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('elementary', 'Elementary'),
        ('intermediate', 'Intermediate'),
        ('upper_intermediate', 'Upper Intermediate'),
        ('advanced', 'Advanced'),
    ]
    
    SCHEDULE_TYPE_CHOICES = [
        ('odd', 'Odd days (Mon/Wed/Fri)'),
        ('even', 'Even days (Tue/Thu/Sat)'),
    ]
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, related_name='groups')
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    start_time = models.TimeField(blank=True, null=True)
    end_time = models.TimeField(blank=True, null=True)
    max_students = models.IntegerField(default=15)
    price_per_month = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    schedule_type = models.CharField(max_length=10, choices=SCHEDULE_TYPE_CHOICES, default='odd')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Group'
        verbose_name_plural = 'Groups'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.get_level_display()})"
    
    def get_students_count(self):
        return self.students.count()


class GroupStudent(models.Model):
    """Модель связи студентов с группой"""
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='groups')
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='students')
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('student', 'group')
        verbose_name = 'Group Student'
        verbose_name_plural = 'Group Students'
    
    def __str__(self):
        return f"{self.student} - {self.group}"


class Payment(models.Model):
    """Модель платежей студентов"""
    PAYMENT_TYPE_CHOICES = [
        ('enrollment', 'Enrollment'),
        ('monthly', 'Monthly'),
        ('discount', 'Discount'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='payments')
    group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES)
    description = models.TextField(blank=True, null=True)
    payment_date = models.DateTimeField(auto_now_add=True)
    processed_by = models.ForeignKey('Admin', on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        ordering = ['-payment_date']
    
    def __str__(self):
        return f"{self.student} - {self.amount} ({self.get_payment_type_display()})"


class Attendance(models.Model):
    """Модель отслеживания посещаемости"""
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendances')
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='attendances')
    class_date = models.DateTimeField()
    is_present = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Attendance'
        verbose_name_plural = 'Attendances'
        ordering = ['-class_date']
        unique_together = ('student', 'group', 'class_date')
    
    def __str__(self):
        return f"{self.student} - {self.group} - {self.class_date}"


class Performance(models.Model):
    """Модель отслеживания успеваемости"""
    GRADE_CHOICES = [
        (5, 'Excellent'),
        (4, 'Good'),
        (3, 'Satisfactory'),
        (2, 'Poor'),
        (1, 'Very Poor'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='performance_records')
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='performance_records')
    assessment_date = models.DateTimeField(auto_now_add=True)
    grade = models.IntegerField(choices=GRADE_CHOICES)
    subject = models.CharField(max_length=100)
    comments = models.TextField(blank=True, null=True)
    assessed_by = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = 'Performance'
        verbose_name_plural = 'Performances'
        ordering = ['-assessment_date']
    
    def __str__(self):
        return f"{self.student} - {self.subject} - {self.get_grade_display()}"


class Admin(models.Model):
    """Модель администратора"""
    ROLE_CHOICES = [
        ('super_admin', 'Super Administrator'),
        ('admin', 'Administrator'),
        ('moderator', 'Moderator'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='admin_profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='admin')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Administrator'
        verbose_name_plural = 'Administrators'
    
    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.get_role_display()}"


class Permission(models.Model):
    """Модель прав доступа"""
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Permission'
        verbose_name_plural = 'Permissions'
    
    def __str__(self):
        return self.name


class AdminPermission(models.Model):
    """Модель связи прав доступа администраторов"""
    admin = models.ForeignKey(Admin, on_delete=models.CASCADE, related_name='permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)
    granted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('admin', 'permission')
        verbose_name = 'Admin Permission'
        verbose_name_plural = 'Admin Permissions'
    
    def __str__(self):
        return f"{self.admin} - {self.permission}"


class AdminLog(models.Model):
    """Модель логирования действий администраторов"""
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('view', 'View'),
        ('login', 'Login'),
        ('logout', 'Logout'),
    ]
    
    admin = models.ForeignKey(Admin, on_delete=models.SET_NULL, null=True, related_name='logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.IntegerField(null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Admin Log'
        verbose_name_plural = 'Admin Logs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.admin} - {self.get_action_display()} - {self.model_name}"


class Notification(models.Model):
    """Модель системных уведомлений для пользователей"""
    NOTIFICATION_TYPE_CHOICES = [
        ('unpaid_lessons', 'Unpaid Lessons'),
        ('general', 'General'),
    ]

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPE_CHOICES, default='general')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        unique_together = ('recipient', 'group', 'notification_type', 'message')

    def __str__(self):
        return f"Notification to {self.recipient.username}: {self.message[:50]}"


class TwoFactorAuth(models.Model):
    """Модель двухфакторной аутентификации для SuperAdmin"""
    admin = models.OneToOneField(Admin, on_delete=models.CASCADE, related_name='two_factor_auth')
    email = models.EmailField(unique=True)
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Two Factor Auth'
        verbose_name_plural = 'Two Factor Auths'
    
    def __str__(self):
        return f"2FA for {self.admin.user.username}"


class VerificationCode(models.Model):
    """Модель кодов подтверждения для 2FA"""
    two_factor = models.ForeignKey(TwoFactorAuth, on_delete=models.CASCADE, related_name='codes')
    code = models.CharField(max_length=6)  # 6-значный код
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()  # Код действителен 10 минут
    
    class Meta:
        verbose_name = 'Verification Code'
        verbose_name_plural = 'Verification Codes'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Code for {self.two_factor.admin.user.username}"
    
    def is_valid(self):
        """Проверить валидность кода"""
        return not self.is_used and timezone.now() < self.expires_at
    
    def is_expired(self):
        """Проверить истекел ли код"""
        return timezone.now() > self.expires_at


class Lesson(models.Model):
    """Модель урока в группе (всего 12 уроков за курс)"""
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='lessons')
    lesson_number = models.IntegerField()  # номер урока 1-12
    scheduled_date = models.DateTimeField()  # дата и время урока
    duration_minutes = models.IntegerField(default=60)  # длительность урока в минутах
    topic = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    homework = models.TextField(blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Lesson'
        verbose_name_plural = 'Lessons'
        ordering = ['group', 'lesson_number']
        unique_together = ('group', 'lesson_number')
    
    def __str__(self):
        return f"{self.group.name} - Lesson {self.lesson_number}"


class LessonPayment(models.Model):
    """Модель платежа за уроки студента"""
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('refunded', 'Refunded'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='lesson_payments')
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='lesson_payments')
    lessons_purchased = models.IntegerField()  # количество купленных уроков (1, 6, или 12)
    total_amount = models.DecimalField(max_digits=20, decimal_places=2)  # сумма платежа
    price_per_lesson = models.DecimalField(max_digits=20, decimal_places=2)  # цена за один урок
    lessons_remaining = models.IntegerField(default=0)  # осталось уроков для обучения
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='completed')
    payment_date = models.DateTimeField(auto_now_add=True)
    processed_by = models.ForeignKey(Admin, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        verbose_name = 'Lesson Payment'
        verbose_name_plural = 'Lesson Payments'
        ordering = ['-payment_date']
    
    def __str__(self):
        return f"{self.student} - {self.lessons_purchased} lessons - {self.group.name}"


class StudentLesson(models.Model):
    """
    Модель статуса ученика на каждом уроке
    Отслеживает: оплачен ли урок, дан ли бонус, удален ли, и т.д.
    """
    STATUS_CHOICES = [
        ('paid', 'Paid ✅'),
        ('bonus', 'Bonus ⭐'),
        ('unpaid', 'Unpaid 🔴'),
        ('removed', 'Removed ❌'),
        ('future', 'Future ⬜'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='student_lessons')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='student_lessons')
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='student_lessons')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='future')
    payment = models.ForeignKey(LessonPayment, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_lessons')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Student Lesson'
        verbose_name_plural = 'Student Lessons'
        ordering = ['lesson__scheduled_date']
        unique_together = ('student', 'lesson')
    
    def __str__(self):
        return f"{self.student} - Lesson {self.lesson.lesson_number} - {self.get_status_display()}"
    
    def is_expired(self):
        """Проверить, истек ли срок урока (текущая дата > дата урока)"""
        return timezone.now().date() > self.lesson.scheduled_date.date() and self.status == 'unpaid'


class ActionLog(models.Model):
    """
    Модель для логирования действий админов/суперадминов
    Записывает: платежи, бонусы, удаления, переводы студентов, действия группы
    """
    ACTION_TYPES = [
        ('payment', 'Payment'),
        ('bonus', 'Bonus Added'),
        ('remove_lesson', 'Lesson Removed'),
        ('student_added', 'Student Added'),
        ('student_removed', 'Student Removed'),
        ('group_status_changed', 'Group Status Changed'),
        ('transfer_student', 'Student Transferred'),
        ('mark_attended', 'Marked Attended'),
        ('mark_expired', 'Marked Expired'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='action_logs', null=True, blank=True)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='action_logs', null=True, blank=True)
    action_type = models.CharField(max_length=30, choices=ACTION_TYPES)
    lessons_affected = models.IntegerField(null=True, blank=True)  # сколько уроков на которые влияет действие
    amount = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)  # сумма для платежей
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(Admin, on_delete=models.SET_NULL, null=True, blank=True)
    payment = models.ForeignKey(LessonPayment, on_delete=models.SET_NULL, null=True, blank=True, related_name='action_logs')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Action Log'
        verbose_name_plural = 'Action Logs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.student} - {self.get_action_type_display()} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
