from datetime import datetime
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from django.db.models import Q, Count, Sum, F
from django.utils import timezone
from decimal import Decimal, InvalidOperation
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from .models import (
    Student, Teacher, Group, GroupStudent, Payment,
    Attendance, Performance, Admin, Permission, AdminPermission, AdminLog,
    Lesson, LessonPayment, StudentLesson, ActionLog, Notification
)


def ensure_group_status(group):
    if group and group.is_active and group.end_date and group.end_date < timezone.now():
        group.is_active = False
        group.save()
        ActionLog.objects.create(
            student=None,
            group=group,
            action_type='group_status_changed',
            description='Group automatically deactivated after end date',
            created_by=None
        )

from .serializers import (
    StudentSerializer, StudentDetailSerializer,
    TeacherSerializer, TeacherDetailSerializer,
    GroupSerializer, GroupDetailSerializer, GroupStudentSerializer,
    PaymentSerializer, AttendanceSerializer, PerformanceSerializer,
    AdminSerializer, AdminDetailSerializer,
    PermissionSerializer, AdminPermissionSerializer, AdminLogSerializer,
    AdminStatsSerializer, DashboardStatsSerializer, FinanceLogEntrySerializer,
    LessonSerializer, LessonPaymentSerializer, StudentLessonSerializer,
    StudentLessonTableSerializer, NotificationSerializer
)
from .permissions import IsTeacher, IsStudent, IsAdmin, IsSuperAdmin, IsSuperAdmin



# Student ViewSet
class StudentViewSet(viewsets.ModelViewSet):
    """ViewSet для управления студентами"""
    queryset = Student.objects.select_related('user')
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return StudentDetailSerializer
        return StudentSerializer

    def get_permissions(self):
        """Only superadmins can delete students (other actions are open to authenticated users)."""
        if self.action == 'destroy':
            return [IsSuperAdmin()]
        return super().get_permissions()
    
    def filter_queryset(self, queryset):
        """Filter by name, email, username, personal_id"""
        queryset = super().filter_queryset(queryset)
        query = self.request.query_params.get('search') or self.request.query_params.get('q')
        
        if query:
            queryset = queryset.filter(
                Q(user__username__icontains=query) |
                Q(user__email__icontains=query) |
                Q(user__first_name__icontains=query) |
                Q(user__last_name__icontains=query) |
                Q(personal_id__icontains=query)
            )
        
        return queryset
    
    @extend_schema(summary="Поиск студентов", description="Поиск студентов по id, username, email")
    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        if not query:
            return Response({'error': 'Query parameter "q" is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        students = Student.objects.filter(
            Q(user__username__icontains=query) |
            Q(user__email__icontains=query) |
            Q(personal_id__icontains=query) |
            Q(user__first_name__icontains=query) |
            Q(user__last_name__icontains=query)
        ).select_related('user')
        
        serializer = self.get_serializer(students, many=True)
        return Response(serializer.data)

    @extend_schema(summary="Список групп студента", description="Получить список групп, в которых состоит студент (по id)")
    @action(detail=True, methods=['get'])
    def groups(self, request, pk=None):
        try:
            student = Student.objects.get(id=pk)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)

        group_students = GroupStudent.objects.filter(student=student).select_related('group__teacher__user')
        serializer = GroupStudentSerializer(group_students, many=True)
        return Response(serializer.data)


# Teacher ViewSet
class TeacherViewSet(viewsets.ModelViewSet):
    """ViewSet для управления учителями"""
    queryset = Teacher.objects.select_related('user')
    serializer_class = TeacherSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return TeacherDetailSerializer
        return TeacherSerializer

    def get_permissions(self):
        """Only superadmins can delete teachers (other actions are available to any authenticated user)."""
        if self.action == 'destroy':
            return [IsSuperAdmin()]
        return super().get_permissions()
    
    def filter_queryset(self, queryset):
        """Filter by name, email, username, personal_id, specialization"""
        queryset = super().filter_queryset(queryset)
        query = self.request.query_params.get('search') or self.request.query_params.get('q')
        
        if query:
            queryset = queryset.filter(
                Q(user__username__icontains=query) |
                Q(user__email__icontains=query) |
                Q(user__first_name__icontains=query) |
                Q(user__last_name__icontains=query) |
                Q(personal_id__icontains=query) |
                Q(specialization__icontains=query)
            )
        
        return queryset
    
    @extend_schema(summary="Поиск учителей")
    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        if not query:
            return Response({'error': 'Query parameter "q" is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        teachers = Teacher.objects.filter(
            Q(user__username__icontains=query) |
            Q(user__email__icontains=query) |
            Q(personal_id__icontains=query) |
            Q(specialization__icontains=query)
        ).select_related('user')
        
        serializer = self.get_serializer(teachers, many=True)
        return Response(serializer.data)


# Group ViewSet
class GroupViewSet(viewsets.ModelViewSet):
    """ViewSet для управления группами"""
    queryset = Group.objects.select_related('teacher')
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        now = timezone.now()
        expired_groups = Group.objects.filter(is_active=True, end_date__lt=now)
        for group in expired_groups:
            self._ensure_group_status(group)
        return super().get_queryset()

    def get_object(self):
        group = super().get_object()
        self._ensure_group_status(group)
        return group

    def _ensure_group_status(self, group):
        ensure_group_status(group)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return GroupDetailSerializer
        return GroupSerializer

    def perform_update(self, serializer):
        group = self.get_object()
        was_active = group.is_active
        updated_group = serializer.save()
        if 'is_active' in serializer.validated_data and was_active != updated_group.is_active:
            ActionLog.objects.create(
                student=None,
                group=updated_group,
                action_type='group_status_changed',
                description=(
                    f'Group status changed from {"active" if was_active else "inactive"} '
                    f'to {"active" if updated_group.is_active else "inactive"}.'
                ),
                created_by=self.request.user.admin_profile if hasattr(self.request.user, 'admin_profile') else None
            )
        return updated_group
    
    @extend_schema(summary="Добавить студента в группу")
    @action(detail=True, methods=['post'])
    def add_student(self, request, pk=None):
        group = self.get_object()
        student_id = request.data.get('student_id')
        
        if not student_id:
            return Response({'error': 'student_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        if not group.is_active or (group.end_date and group.end_date < timezone.now()):
            return Response({'error': 'Cannot add students to an inactive or expired group'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
        
        group_student, created = GroupStudent.objects.get_or_create(
            student=student, group=group,
            defaults={'is_active': True}
        )

        if created:
            from .lesson_utils import initialize_student_lessons
            initialize_student_lessons(student, group)
            ActionLog.objects.create(
                student=student,
                group=group,
                action_type='student_added',
                description=f'Student {student} added to group {group.name}',
                created_by=request.user.admin_profile if hasattr(request.user, 'admin_profile') else None
            )
            return Response({'message': 'Student added to group'}, status=status.HTTP_201_CREATED)
        else:
            return Response({'message': 'Student already in group'}, status=status.HTTP_200_OK)
    
    @extend_schema(summary="Удалить студента из группы")
    @action(detail=True, methods=['post'])
    def remove_student(self, request, pk=None):
        group = self.get_object()
        student_id = request.data.get('student_id')
        
        if not student_id:
            return Response({'error': 'student_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        if not group.is_active or (group.end_date and group.end_date < timezone.now()):
            return Response({'error': 'Cannot remove students from an inactive or expired group'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            group_student = GroupStudent.objects.get(student_id=student_id, group=group)
            group_student.is_active = False
            group_student.left_at = timezone.now()
            group_student.save()
            ActionLog.objects.create(
                student=group_student.student,
                group=group,
                action_type='student_removed',
                description=f'Student {group_student.student} removed from group {group.name}',
                created_by=request.user.admin_profile if hasattr(request.user, 'admin_profile') else None
            )
            return Response({'message': 'Student removed from group'}, status=status.HTTP_200_OK)
        except GroupStudent.DoesNotExist:
            return Response({'error': 'Student not in this group'}, status=status.HTTP_404_NOT_FOUND)
    
    @extend_schema(summary="Изменить учителя группы")
    @action(detail=True, methods=['patch'])
    def change_teacher(self, request, pk=None):
        group = self.get_object()
        teacher_id = request.data.get('teacher_id')
        
        if not teacher_id:
            return Response({'error': 'teacher_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            teacher = Teacher.objects.get(id=teacher_id)
            group.teacher = teacher
            group.save()
            serializer = self.get_serializer(group)
            return Response(serializer.data)
        except Teacher.DoesNotExist:
            return Response({'error': 'Teacher not found'}, status=status.HTTP_404_NOT_FOUND)


# Payment ViewSet
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для управления уведомлениями"""
    queryset = Notification.objects.select_related('recipient', 'group')
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        if Admin.objects.filter(user=self.request.user, is_active=True).exists():
            return queryset
        return queryset.filter(recipient=self.request.user)

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            is_read_value = is_read.lower() in ['1', 'true', 'yes']
            queryset = queryset.filter(is_read=is_read_value)
        group_id = self.request.query_params.get('group_id')
        if group_id:
            queryset = queryset.filter(group_id=group_id)
        return queryset

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response(self.get_serializer(notification).data)


class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet для управления платежами"""
    queryset = Payment.objects.select_related('student', 'group')
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    
    @extend_schema(summary="Пополнить баланс студента")
    @action(detail=False, methods=['post'])
    def add_balance(self, request):
        student_id = request.data.get('student_id')
        amount = request.data.get('amount')
        
        if not student_id or not amount:
            return Response({'error': 'student_id and amount are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            student = Student.objects.get(id=student_id)
            try:
                amt = Decimal(str(amount))
            except (InvalidOperation, TypeError, ValueError):
                return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

            student.balance = (student.balance or Decimal('0')) + amt
            student.save()

            # attach admin if available
            admin_obj = None
            try:
                from .models import Admin as AdminModel
                admin_obj = AdminModel.objects.filter(user=request.user).first()
            except Exception:
                admin_obj = None

            Payment.objects.create(
                student=student,
                amount=amt,
                payment_type='enrollment',
                description='Balance top-up',
                processed_by=admin_obj
            )
            
            return Response({'message': 'Balance updated', 'new_balance': str(student.balance)})
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @extend_schema(summary="Списать баланс за месяц")
    @action(detail=False, methods=['post'])
    def deduct_balance(self, request):
        student_id = request.data.get('student_id')
        group_id = request.data.get('group_id')
        
        if not student_id or not group_id:
            return Response({'error': 'student_id and group_id are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            student = Student.objects.get(id=student_id)
            group = Group.objects.get(id=group_id)
            ensure_group_status(group)
            
            price = group.price_per_month
            # ensure group is active and not finished
            now = timezone.now()
            if not group.is_active or (group.end_date and group.end_date < now):
                return Response({'error': 'Group is not active or has ended'}, status=status.HTTP_400_BAD_REQUEST)

            if student.balance >= price:
                student.balance = (student.balance or Decimal('0')) - price
                student.save()

                admin_obj = None
                try:
                    from .models import Admin as AdminModel
                    admin_obj = AdminModel.objects.filter(user=request.user).first()
                except Exception:
                    admin_obj = None

                payment = Payment.objects.create(
                    student=student,
                    group=group,
                    amount=price,
                    payment_type='monthly',
                    description=f'Monthly payment for {group.name}',
                    processed_by=admin_obj
                )

                if admin_obj:
                    ActionLog.objects.create(
                        student=student,
                        group=group,
                        action_type='payment',
                        amount=price,
                        description=f'Monthly payment for {group.name}',
                        created_by=admin_obj
                    )

                # ensure student's membership is active
                try:
                    gs = GroupStudent.objects.get(student=student, group=group)
                    gs.is_active = True
                    gs.save()
                except GroupStudent.DoesNotExist:
                    pass

                return Response({'message': 'Payment processed', 'new_balance': str(student.balance)})
            else:
                return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)
        except (Student.DoesNotExist, Group.DoesNotExist):
            return Response({'error': 'Student or Group not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @extend_schema(summary="Получить платежи студента")
    @action(detail=False, methods=['get'])
    def student_payments(self, request):
        student_id = request.query_params.get('student_id')
        group_id = request.query_params.get('group_id')
        if not student_id:
            return Response({'error': 'student_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        payments = Payment.objects.filter(student_id=student_id)
        if group_id:
            payments = payments.filter(group_id=group_id)
        payments = payments.select_related('student', 'group')
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)

    @extend_schema(summary="Списать плату за группу и обработать недостаток средств")
    @action(detail=False, methods=['post'])
    def charge_group(self, request):
        student_id = request.data.get('student_id')
        group_id = request.data.get('group_id')
        if not student_id or not group_id:
            return Response({'error': 'student_id and group_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            student = Student.objects.get(id=student_id)
            group = Group.objects.get(id=group_id)
            ensure_group_status(group)
        except (Student.DoesNotExist, Group.DoesNotExist):
            return Response({'error': 'Student or Group not found'}, status=status.HTTP_404_NOT_FOUND)

        price = group.price_per_month
        now = timezone.now()
        # don't charge if group inactive or finished
        if not group.is_active or (group.end_date and group.end_date < now):
            return Response({'error': 'Group is not active or has ended'}, status=status.HTTP_400_BAD_REQUEST)

        # prevent double monthly charge for same month
        from django.utils.timezone import localtime
        start_of_month = localtime(now).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        existing = Payment.objects.filter(
            student=student,
            group=group,
            payment_type='monthly',
            payment_date__gte=start_of_month
        ).exists()
        if existing:
            return Response({'error': 'Already charged for this month'}, status=status.HTTP_400_BAD_REQUEST)

        # Sufficient funds
        if student.balance >= price:
            student.balance = (student.balance or Decimal('0')) - price
            student.save()
            admin_obj = None
            try:
                from .models import Admin as AdminModel
                admin_obj = AdminModel.objects.filter(user=request.user).first()
            except Exception:
                admin_obj = None

            Payment.objects.create(
                student=student,
                group=group,
                amount=price,
                payment_type='monthly',
                description=f'Charge for {group.name}',
                processed_by=admin_obj
            )

            if admin_obj:
                ActionLog.objects.create(
                    student=student,
                    action_type='payment',
                    amount=price,
                    description=f'Charge for {group.name}',
                    created_by=admin_obj
                )

            # activate membership on successful payment
            try:
                gs = GroupStudent.objects.get(student=student, group=group)
                gs.is_active = True
                gs.save()
            except GroupStudent.DoesNotExist:
                pass

            return Response({'message': 'Payment processed', 'new_balance': str(student.balance)})

        # Insufficient funds -> deactivate student's membership in group
        try:
            gs = GroupStudent.objects.get(student=student, group=group)
            gs.is_active = False
            gs.left_at = timezone.now()
            gs.save()
        except GroupStudent.DoesNotExist:
            pass

        return Response({'message': 'Insufficient balance, removed from group', 'removed_from_group': True, 'current_balance': str(student.balance)})


# Attendance ViewSet
class AttendanceViewSet(viewsets.ModelViewSet):
    """ViewSet для управления посещаемостью"""
    queryset = Attendance.objects.select_related('student', 'group')
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'student_profile', None):
            return Attendance.objects.filter(student=user.student_profile).select_related('student', 'group')
        if getattr(user, 'teacher_profile', None):
            return Attendance.objects.filter(group__teacher=user.teacher_profile).select_related('student', 'group')
        return Attendance.objects.select_related('student', 'group')

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        group_id = self.request.query_params.get('group_id')
        student_id = self.request.query_params.get('student_id')
        if group_id:
            queryset = queryset.filter(group_id=group_id)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        return queryset
    
    @extend_schema(summary="Статистика посещаемости студента")
    @action(detail=False, methods=['get'])
    def student_attendance(self, request):
        student_id = request.query_params.get('student_id')
        group_id = request.query_params.get('group_id')
        if not student_id:
            return Response({'error': 'student_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        attendances = Attendance.objects.filter(student_id=student_id)
        if group_id:
            attendances = attendances.filter(group_id=group_id)
        attendances = attendances.select_related('student', 'group')
        total = attendances.count()
        present = attendances.filter(is_present=True).count()
        absent = total - present
        
        serializer = self.get_serializer(attendances, many=True)
        return Response({
            'total_classes': total,
            'present': present,
            'absent': absent,
            'attendance_rate': f'{(present / total * 100):.1f}%' if total > 0 else '0%',
            'records': serializer.data
        })


# Performance ViewSet
class PerformanceViewSet(viewsets.ModelViewSet):
    """ViewSet для управления успеваемостью"""
    queryset = Performance.objects.select_related('student', 'group', 'assessed_by')
    serializer_class = PerformanceSerializer
    permission_classes = [IsAuthenticated]
    
    @extend_schema(summary="Статистика успеваемости студента")
    @action(detail=False, methods=['get'])
    def student_performance(self, request):
        student_id = request.query_params.get('student_id')
        group_id = request.query_params.get('group_id')
        if not student_id:
            return Response({'error': 'student_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        performances = Performance.objects.filter(student_id=student_id)
        if group_id:
            performances = performances.filter(group_id=group_id)
        performances = performances.select_related('student', 'group', 'assessed_by')
        avg_grade = performances.aggregate(avg_grade=Sum('grade') / Count('id'))['avg_grade'] or 0
        
        serializer = self.get_serializer(performances, many=True)
        return Response({
            'average_grade': round(avg_grade, 2),
            'total_assessments': performances.count(),
            'records': serializer.data
        })


# Admin ViewSet
class AdminViewSet(viewsets.ModelViewSet):
    """ViewSet для управления администраторами"""
    queryset = Admin.objects.select_related('user').prefetch_related('permissions')
    serializer_class = AdminSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return AdminDetailSerializer
        return AdminSerializer
    
    def get_permissions(self):
        """SuperAdmins имеют полный доступ к управлению админами"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Только SuperAdmins могут создавать/изменять/удалять админов
            return [IsSuperAdmin()]
        return super().get_permissions()
    
    @extend_schema(summary="Статистика панели")
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        total_payments_agg = Payment.objects.aggregate(total=Sum('amount'))['total']
        # Convert to float to avoid Decimal serialization issues
        total_payments = float(total_payments_agg) if total_payments_agg else 0.0
        
        stats_data = {
            'total_students': Student.objects.count(),
            'active_students': Student.objects.filter(is_active=True).count(),
            'total_teachers': Teacher.objects.count(),
            'active_teachers': Teacher.objects.filter(is_active=True).count(),
            'total_groups': Group.objects.count(),
            'active_groups': Group.objects.filter(is_active=True).count(),
            'total_payments': round(total_payments, 2),
            'pending_payments': Student.objects.filter(balance__lt=0).count(),
        }
        serializer = DashboardStatsSerializer(stats_data)
        return Response(serializer.data)

    @extend_schema(summary="Глобальная история финансов и операций уроков")
    @action(detail=False, methods=['get'])
    def finance_history(self, request):
        search = (request.query_params.get('search') or '').strip()
        group_id = request.query_params.get('group_id')
        student_id = request.query_params.get('student_id')
        admin_id = request.query_params.get('admin_id')
        action_type = request.query_params.get('action_type')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        records = []

        payments = Payment.objects.select_related('student', 'group', 'processed_by')
        for payment in payments.order_by('-payment_date'):
            student = payment.student
            group = payment.group
            admin = payment.processed_by
            records.append({
                'id': f'payment-{payment.id}',
                'date': payment.payment_date,
                'student_id': student.id,
                'student_name': student.user.get_full_name() or student.user.username,
                'group_id': group.id if group else None,
                'group_name': group.name if group else None,
                'action_type': payment.payment_type,
                'action_label': payment.get_payment_type_display(),
                'lessons_affected': None,
                'amount': payment.amount,
                'admin_id': admin.id if admin else None,
                'admin_name': (admin.user.get_full_name() or admin.user.username) if admin else None,
                'description': payment.description or payment.get_payment_type_display(),
                'source': 'payment'
            })

        lesson_payments = LessonPayment.objects.select_related('student', 'group', 'processed_by')
        for payment in lesson_payments.order_by('-payment_date'):
            student = payment.student
            group = payment.group
            admin = payment.processed_by
            records.append({
                'id': f'lesson-{payment.id}',
                'date': payment.payment_date,
                'student_id': student.id,
                'student_name': student.user.get_full_name() or student.user.username,
                'group_id': group.id,
                'group_name': group.name,
                'action_type': 'lesson_payment',
                'action_label': 'Lesson Payment',
                'lessons_affected': payment.lessons_purchased,
                'amount': payment.total_amount,
                'admin_id': admin.id if admin else None,
                'admin_name': (admin.user.get_full_name() or admin.user.username) if admin else None,
                'description': f"Paid for {payment.lessons_purchased} lesson(s)",
                'source': 'lesson_payment'
            })

        action_logs = ActionLog.objects.select_related('student', 'group', 'created_by').filter(
            action_type__in=['payment', 'bonus', 'remove_lesson']
        )
        for log in action_logs.order_by('-created_at'):
            student = log.student
            group = log.group
            if not group and student:
                # Try finding student's enrolled group if log.group is missing
                from .models import GroupStudent
                gs = GroupStudent.objects.filter(student=student).select_related('group').first()
                if gs:
                    group = gs.group
            
            admin = log.created_by
            records.append({
                'id': f'action-{log.id}',
                'date': log.created_at,
                'student_id': student.id if student else None,
                'student_name': (student.user.get_full_name() or student.user.username) if student else None,
                'group_id': group.id if group else None,
                'group_name': group.name if group else None,
                'action_type': log.action_type,
                'action_label': dict(log.ACTION_TYPES).get(log.action_type, log.action_type),
                'lessons_affected': log.lessons_affected if log.lessons_affected is not None else 1,
                'amount': log.amount,
                'admin_id': admin.id if admin else None,
                'admin_name': (admin.user.get_full_name() or admin.user.username) if admin else None,
                'description': log.description or '',
                'source': 'action_log'
            })

        def matches_text(value):
            return search.lower() in (value or '').lower()

        records = [
            record for record in records
            if (
                (not search) or
                matches_text(record['student_name']) or
                matches_text(record['group_name']) or
                matches_text(record['admin_name']) or
                matches_text(record['action_label']) or
                matches_text(record['description'])
            )
            and (not group_id or str(record['group_id']) == str(group_id))
            and (not student_id or str(record['student_id']) == str(student_id))
            and (not admin_id or str(record['admin_id']) == str(admin_id))
            and (not action_type or record['action_type'] == action_type)
            and (not date_from or record['date'].date() >= datetime.strptime(date_from, '%Y-%m-%d').date())
            and (not date_to or record['date'].date() <= datetime.strptime(date_to, '%Y-%m-%d').date())
        ]

        records.sort(key=lambda item: item['date'], reverse=True)

        total_amount = sum((record['amount'] or Decimal('0')) for record in records)
        payment_count = sum(
            1 for record in records
            if record['source'] in ('payment', 'lesson_payment') or record['action_type'] in ('payment', 'lesson_payment')
        )
        bonus_count = sum(1 for record in records if record['action_type'] == 'bonus')
        removed_count = sum(1 for record in records if record['action_type'] == 'remove_lesson')

        summary = {
            'total_amount': float(total_amount),
            'total_operations': len(records),
            'payment_count': payment_count,
            'bonus_count': bonus_count,
            'removed_count': removed_count,
            'period_count': len(records),
        }

        return Response({
            'summary': summary,
            'records': FinanceLogEntrySerializer(records, many=True).data,
        })
    
    @extend_schema(summary="Статистика администраторов")
    @action(detail=False, methods=['get'])
    def stats(self, request):
        stats_data = {
            'total_admins': Admin.objects.count(),
            'active_admins': Admin.objects.filter(is_active=True).count(),
            'total_permissions': Permission.objects.count(),
            'total_logs': AdminLog.objects.count(),
        }
        serializer = AdminStatsSerializer(stats_data)
        return Response(serializer.data)
    
    @extend_schema(summary="Поиск администраторов")
    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        if not query:
            return Response({'error': 'Query parameter "q" is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        admins = Admin.objects.filter(
            Q(user__username__icontains=query) |
            Q(user__email__icontains=query) |
            Q(user__first_name__icontains=query) |
            Q(user__last_name__icontains=query)
        ).select_related('user').prefetch_related('permissions')
        
        serializer = self.get_serializer(admins, many=True)
        return Response(serializer.data)


# Permission ViewSet
class PermissionViewSet(viewsets.ModelViewSet):
    """ViewSet для управления правами доступа"""
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated]
    
    @extend_schema(summary="Поиск прав доступа")
    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        if not query:
            return Response({'error': 'Query parameter "q" is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        permissions = Permission.objects.filter(
            Q(name__icontains=query) |
            Q(code__icontains=query)
        )
        
        serializer = self.get_serializer(permissions, many=True)
        return Response(serializer.data)


# AdminPermission ViewSet
class AdminPermissionViewSet(viewsets.ModelViewSet):
    """ViewSet для управления правами администраторов"""
    queryset = AdminPermission.objects.select_related('admin', 'permission')
    serializer_class = AdminPermissionSerializer
    permission_classes = [IsAuthenticated]


# AdminLog ViewSet
class AdminLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для просмотра логирования действий администраторов"""
    queryset = AdminLog.objects.select_related('admin').order_by('-created_at')
    serializer_class = AdminLogSerializer
    permission_classes = [IsAuthenticated]
    
    @extend_schema(summary="Фильтр логов по администратору")
    @action(detail=False, methods=['get'])
    def filter_by_admin(self, request):
        admin_id = request.query_params.get('admin_id')
        if not admin_id:
            return Response({'error': 'Query parameter "admin_id" is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        logs = AdminLog.objects.filter(admin_id=admin_id).select_related('admin')
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)
    
    @extend_schema(summary="Фильтр логов по действию")
    @action(detail=False, methods=['get'])
    def filter_by_action(self, request):
        action_type = request.query_params.get('action')
        if not action_type:
            return Response({'error': 'Query parameter "action" is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        logs = AdminLog.objects.filter(action=action_type).select_related('admin')
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)


# ===== TEACHER API VIEWSETS =====

class TeacherGroupViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для просмотра групп учителем"""
    serializer_class = GroupDetailSerializer
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get_queryset(self):
        """Учитель видит только свои группы"""
        teacher = self.request.user.teacher_profile
        return Group.objects.filter(teacher=teacher).select_related('teacher__user')
    
    @extend_schema(summary="Список моих групп", description="Получить список всех групп учителя")
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @extend_schema(summary="Деталь группы", description="Получить информацию о конкретной группе")
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)


class TeacherAttendanceViewSet(viewsets.ModelViewSet):
    """ViewSet для управления посещаемостью (только своих групп)"""
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get_queryset(self):
        """Учитель видит посещаемость только своих групп"""
        teacher = self.request.user.teacher_profile
        return Attendance.objects.filter(
            group__teacher=teacher
        ).select_related('student__user', 'group')
    
    def perform_create(self, serializer):
        """Отмечать посещаемость может только учитель этой группы"""
        serializer.save()
    
    @extend_schema(summary="Посещаемость по ученику", description="Получить историю посещаемости конкретного ученика")
    @action(detail=False, methods=['get'])
    def student_attendance(self, request):
        """Получить посещаемость ученика"""
        student_id = request.query_params.get('student_id')
        
        if not student_id:
            return Response({'error': 'student_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        teacher = request.user.teacher_profile
        
        # Проверить что ученик в группе этого учителя
        attendances = Attendance.objects.filter(
            student_id=student_id,
            group__teacher=teacher
        ).select_related('student__user')
        
        if not attendances.exists():
            return Response(
                {'error': 'Student not found in your groups'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(attendances, many=True)
        total = attendances.count()
        present = attendances.filter(is_present=True).count()
        
        return Response({
            'total_classes': total,
            'present': present,
            'absent': total - present,
            'attendance_rate': round((present / total * 100) if total > 0 else 0, 1),
            'records': serializer.data
        })


class TeacherPerformanceViewSet(viewsets.ModelViewSet):
    """ViewSet для управления успеваемостью (только своих групп)"""
    serializer_class = PerformanceSerializer
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get_queryset(self):
        """Учитель видит оценки только своих групп"""
        teacher = self.request.user.teacher_profile
        return Performance.objects.filter(
            group__teacher=teacher,
            assessed_by=teacher
        ).select_related('student__user', 'assessed_by__user')
    
    def perform_create(self, serializer):
        """Автоматически установить текущего учителя как оценивающего"""
        teacher = self.request.user.teacher_profile
        serializer.save(assessed_by=teacher)
    
    @extend_schema(summary="Оценки ученика", description="Получить все оценки конкретного ученика")
    @action(detail=False, methods=['get'])
    def student_performance(self, request):
        """Получить оценки ученика"""
        student_id = request.query_params.get('student_id')
        
        if not student_id:
            return Response({'error': 'student_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        teacher = request.user.teacher_profile
        
        # Проверить что ученик в группе этого учителя
        performances = Performance.objects.filter(
            student_id=student_id,
            group__teacher=teacher
        ).select_related('student__user')
        
        if not performances.exists():
            return Response(
                {'error': 'Student not found in your groups'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(performances, many=True)
        grades = [p.grade for p in performances]
        
        return Response({
            'total_assessments': len(grades),
            'average_grade': round(sum(grades) / len(grades), 1) if grades else 0,
            'records': serializer.data
        })


class TeacherProfileViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для просмотра своего профиля учителем"""
    serializer_class = TeacherDetailSerializer
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get_queryset(self):
        """Учитель видит только свой профиль"""
        return Teacher.objects.filter(user=self.request.user)
    
    @extend_schema(summary="Мой профиль", description="Получить информацию о своем профиле")
    def list(self, request, *args, **kwargs):
        """Получить свой профиль"""
        try:
            teacher = Teacher.objects.get(user=request.user)
            serializer = self.get_serializer(teacher)
            return Response(serializer.data)
        except Teacher.DoesNotExist:
            return Response({'error': 'Teacher profile not found'}, status=status.HTTP_404_NOT_FOUND)

# ===== STUDENT API VIEWSETS =====

class StudentGroupViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для просмотра групп студентом"""
    serializer_class = GroupDetailSerializer
    permission_classes = [IsAuthenticated, IsStudent]
    
    def get_queryset(self):
        """Студент видит только свои группы"""
        student = self.request.user.student_profile
        return Group.objects.filter(
            students__student=student,
            students__is_active=True
        ).select_related('teacher__user').distinct()
    
    @extend_schema(summary="Мои группы", description="Получить список всех групп студента")
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class StudentAttendanceViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для просмотра посещаемости (только своей)"""
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated, IsStudent]
    
    def get_queryset(self):
        """Студент видит только свою посещаемость"""
        student = self.request.user.student_profile
        return Attendance.objects.filter(
            student=student
        ).select_related('student__user', 'group')
    
    @extend_schema(summary="Моя посещаемость", description="Получить статистику посещаемости")
    def list(self, request, *args, **kwargs):
        student = request.user.student_profile
        attendances = self.get_queryset()
        
        serializer = self.get_serializer(attendances, many=True)
        total = attendances.count()
        present = attendances.filter(is_present=True).count()
        
        return Response({
            'total_classes': total,
            'present': present,
            'absent': total - present,
            'attendance_rate': round((present / total * 100) if total > 0 else 0, 1),
            'records': serializer.data
        })


class StudentPerformanceViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для просмотра оценок (только своих)"""
    serializer_class = PerformanceSerializer
    permission_classes = [IsAuthenticated, IsStudent]
    
    def get_queryset(self):
        """Студент видит только свои оценки"""
        student = self.request.user.student_profile
        return Performance.objects.filter(
            student=student
        ).select_related('student__user', 'assessed_by__user', 'group')
    
    @extend_schema(summary="Мои оценки", description="Получить все оценки и комментарии")
    def list(self, request, *args, **kwargs):
        student = request.user.student_profile
        performances = self.get_queryset()
        
        serializer = self.get_serializer(performances, many=True)
        grades = [p.grade for p in performances]
        
        return Response({
            'total_assessments': len(grades),
            'average_grade': round(sum(grades) / len(grades), 1) if grades else 0,
            'records': serializer.data
        })


class StudentPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для просмотра платежей и баланса (только своих)"""
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsStudent]
    
    def get_queryset(self):
        """Студент видит только свои платежи"""
        student = self.request.user.student_profile
        return Payment.objects.filter(
            student=student
        ).select_related('student__user', 'group')
    
    @extend_schema(summary="Мои платежи", description="Получить историю платежей и текущий баланс")
    def list(self, request, *args, **kwargs):
        student = request.user.student_profile
        payments = self.get_queryset()
        
        serializer = self.get_serializer(payments, many=True)
        total_paid = payments.aggregate(Sum('amount'))['amount__sum'] or 0
        
        return Response({
            'current_balance': float(student.balance),
            'total_paid': float(total_paid),
            'payment_history': serializer.data
        })


class StudentProfileViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для просмотра своего профиля студентом"""
    serializer_class = StudentDetailSerializer
    permission_classes = [IsAuthenticated, IsStudent]
    
    def get_queryset(self):
        """Студент видит только свой профиль"""
        return Student.objects.filter(user=self.request.user)
    
    @extend_schema(summary="Мой профиль", description="Получить информацию о своем профиле")
    def list(self, request, *args, **kwargs):
        """Получить свой профиль"""
        try:
            student = Student.objects.get(user=request.user)
            serializer = self.get_serializer(student)
            return Response(serializer.data)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)

# ===== LESSON VIEWSETS =====

class LessonViewSet(viewsets.ModelViewSet):
    """ViewSet для управления уроками группы"""
    queryset = Lesson.objects.select_related('group')
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """Только админы и суперадмины могут создавать/обновлять/удалять уроки"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return super().get_permissions()
    
    def filter_queryset(self, queryset):
        """Фильтровать уроки по группе"""
        group_id = self.request.query_params.get('group_id')
        if group_id:
            queryset = queryset.filter(group_id=group_id)
        return queryset
    
    @extend_schema(summary="Список уроков группы")
    @action(detail=False, methods=['get'])
    def by_group(self, request):
        """Получить уроки конкретной группы"""
        group_id = request.query_params.get('group_id')
        if not group_id:
            return Response({'error': 'group_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        lessons = Lesson.objects.filter(group_id=group_id).order_by('lesson_number')
        serializer = self.get_serializer(lessons, many=True)
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        """Создать урок"""
        group = serializer.validated_data.get('group')
        if group and (not group.is_active or (group.end_date and group.end_date < timezone.now())):
            raise serializers.ValidationError('Cannot create lessons for an inactive or expired group')
        serializer.save()


class LessonPaymentViewSet(viewsets.ModelViewSet):
    """ViewSet для управления платежами за уроки"""
    queryset = LessonPayment.objects.select_related('student', 'group')
    serializer_class = LessonPaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """Только админы могут создавать платежи"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return super().get_permissions()
    
    def create(self, request, *args, **kwargs):
        """Custom create для платежей - рассчитывает недостающие поля и проверяет баланс"""
        import math
        student_id = request.data.get('student_id')
        group_id = request.data.get('group_id')
        lesson_count = request.data.get('lesson_count')
        amount = request.data.get('amount')

        try:
            lesson_count = int(lesson_count)
        except (TypeError, ValueError):
            return Response(
                {'error': 'lesson_count must be an integer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not all([student_id, group_id]) or lesson_count <= 0:
            return Response(
                {'error': 'student_id, group_id, lesson_count required and lesson_count must be > 0'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            student = Student.objects.get(id=student_id)
            group = Group.objects.get(id=group_id)
            ensure_group_status(group)
        except (Student.DoesNotExist, Group.DoesNotExist):
            return Response(
                {'error': 'Student or Group not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not group.is_active or (group.end_date and group.end_date < timezone.now()):
            return Response(
                {'error': 'Cannot create lesson payments for an inactive or expired group'},
                status=status.HTTP_400_BAD_REQUEST
            )

        removed_lessons_count = StudentLesson.objects.filter(
            student=student,
            group=group,
            status='removed'
        ).count()

        active_paid_lessons = StudentLesson.objects.filter(
            student=student,
            group=group,
            status__in=['paid', 'bonus']
        ).count()
        max_lessons = 12
        if active_paid_lessons >= max_lessons:
            return Response(
                {'error': 'Student already has 12 active lessons for this group. Payment is blocked.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        latest_payment = LessonPayment.objects.filter(student=student, group=group).order_by('-payment_date').first()
        
        if removed_lessons_count > 0:
            if lesson_count > removed_lessons_count:
                return Response(
                    {'error': f'Only {removed_lessons_count} removed lesson(s) can be repaid.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif latest_payment and latest_payment.lessons_remaining > 0:
            return Response(
                {'error': 'Student already has remaining paid lessons. Remove lessons before making a new payment.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if active_paid_lessons + lesson_count > max_lessons:
            return Response(
                {
                    'error': f'Payment would exceed the 12-lesson limit. Current active lessons: {active_paid_lessons}, maximum additional lessons: {max_lessons - active_paid_lessons}.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Рассчитываем цену за урок если не указана
        # Система: за 12 уроков - полная цена группы за месяц, за 6 - половина, за 1 - 1/12 с округлением вверх
        if not amount:
            base_price = Decimal(str(group.price_per_month or 0))
            if lesson_count == 12:
                amount = base_price
            elif lesson_count == 6:
                amount = base_price / Decimal('2')
            elif lesson_count == 1:
                amount = Decimal(math.ceil(base_price / Decimal('12') * Decimal('100'))) / Decimal('100')
            else:
                amount = Decimal(math.ceil(base_price * Decimal(lesson_count) / Decimal('12') * Decimal('100'))) / Decimal('100')
        else:
            amount = Decimal(str(amount))

        price_per_lesson = amount / Decimal(lesson_count) if lesson_count > 0 else Decimal('0')
        
        # Проверяем баланс студента
        if student.balance < amount:
            required_amount = amount - student.balance
            return Response(
                {
                    'error': f'Insufficient balance. Current balance: ${student.balance:.2f}, required: ${amount:.2f}, shortfall: ${required_amount:.2f}',
                    'current_balance': str(student.balance),
                    'required_amount': str(amount),
                    'shortfall': str(required_amount),
                    'lesson_count': lesson_count,
                    'price_breakdown': {
                        '12_lessons': str(Decimal(str(group.price_per_month or 0))),
                        '6_lessons': str(Decimal(str(group.price_per_month or 0)) / 2),
                        '1_lesson': str(math.ceil(float(group.price_per_month or 0) / 12 * 100) / 100),
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Вычитаем деньги из баланса студента
        student.balance -= amount
        student.save()
        
        # Получаем последний платеж для расчета remaining lessons
        latest_payment = LessonPayment.objects.filter(
            student=student,
            group=group
        ).order_by('-payment_date').first()
        
        lessons_remaining = (latest_payment.lessons_remaining if latest_payment else 0) + lesson_count
        
        payment = LessonPayment.objects.create(
            student=student,
            group=group,
            lessons_purchased=lesson_count,
            total_amount=amount,
            price_per_lesson=price_per_lesson,
            lessons_remaining=lessons_remaining,
            status='completed',
            processed_by=request.user.admin_profile if hasattr(request.user, 'admin_profile') else None
        )
        
        # Распределяем платеж по урокам
        from .lesson_utils import distribute_payment_to_lessons
        distribute_payment_to_lessons(
            student,
            group,
            lesson_count,
            payment,
            admin=request.user.admin_profile if hasattr(request.user, 'admin_profile') else None
        )
        
        serializer = self.get_serializer(payment)
        return Response({
            **serializer.data,
            'new_balance': str(student.balance),
            'price_breakdown': {
                '12_lessons': str(Decimal(str(group.price_per_month or 0))),
                '6_lessons': str(Decimal(str(group.price_per_month or 0)) / Decimal('2')),
                '1_lesson': str(Decimal(math.ceil(Decimal(str(group.price_per_month or 0)) / Decimal('12') * Decimal('100'))) / Decimal('100')),
            }
        }, status=status.HTTP_201_CREATED)
    
    def filter_queryset(self, queryset):
        """Фильтровать платежи"""
        student_id = self.request.query_params.get('student_id')
        group_id = self.request.query_params.get('group_id')
        
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if group_id:
            queryset = queryset.filter(group_id=group_id)
        
        return queryset
    
    @extend_schema(summary="Платежи за уроки студента")
    @action(detail=False, methods=['get'])
    def student_lesson_payments(self, request):
        """Получить платежи студента за уроки в конкретной группе"""
        student_id = request.query_params.get('student_id')
        group_id = request.query_params.get('group_id')
        
        if not student_id or not group_id:
            return Response(
                {'error': 'student_id and group_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payments = LessonPayment.objects.filter(
            student_id=student_id,
            group_id=group_id
        ).order_by('-payment_date')
        
        serializer = self.get_serializer(payments, many=True)
        
        latest_payment = payments.first()
        lessons_remaining = latest_payment.lessons_remaining if latest_payment else 0
        removed_lessons_count = StudentLesson.objects.filter(
            student_id=student_id,
            group_id=group_id,
            status='removed'
        ).count()
        paid_lessons_count = StudentLesson.objects.filter(
            student_id=student_id,
            group_id=group_id,
            status='paid'
        ).count()
        bonus_lessons_count = StudentLesson.objects.filter(
            student_id=student_id,
            group_id=group_id,
            status='bonus'
        ).count()
        active_lessons_count = paid_lessons_count + bonus_lessons_count

        return Response({
            'lessons_remaining': lessons_remaining,
            'removed_lessons_count': removed_lessons_count,
            'paid_lessons_count': paid_lessons_count,
            'bonus_lessons_count': bonus_lessons_count,
            'active_lessons_count': active_lessons_count,
            'max_lessons': 12,
            'payment_history': serializer.data
        })
    
    @extend_schema(summary="Продлить обучение студента")
    @action(detail=False, methods=['post'])
    def extend_learning(self, request):
        """Продлить обучение студента (добавить уроки при наличии средств)"""
        student_id = request.data.get('student_id')
        group_id = request.data.get('group_id')
        lessons_to_add = request.data.get('lessons_to_add', 1)
        
        if not all([student_id, group_id]):
            return Response(
                {'error': 'student_id, group_id, lessons_to_add required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            student = Student.objects.get(id=student_id)
            group = Group.objects.get(id=group_id)
            ensure_group_status(group)
        except (Student.DoesNotExist, Group.DoesNotExist):
            return Response({'error': 'Student or Group not found'}, status=status.HTTP_404_NOT_FOUND)

        if not group.is_active or (group.end_date and group.end_date < timezone.now()):
            return Response({'error': 'Cannot extend learning for an inactive or expired group'}, status=status.HTTP_400_BAD_REQUEST)
        
        latest_payment = LessonPayment.objects.filter(
            student=student,
            group=group
        ).order_by('-payment_date').first()
        
        if not latest_payment:
            return Response(
                {'error': 'No existing lesson payments'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cost = latest_payment.price_per_lesson * lessons_to_add
        
        if student.balance < cost:
            return Response(
                {
                    'error': 'Insufficient balance',
                    'required': float(cost),
                    'available': float(student.balance)
                },
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        student.balance -= cost
        student.save()
        
        new_payment = LessonPayment.objects.create(
            student=student,
            group=group,
            lessons_purchased=lessons_to_add,
            total_amount=cost,
            price_per_lesson=latest_payment.price_per_lesson,
            lessons_remaining=latest_payment.lessons_remaining + lessons_to_add,
            status='completed',
            processed_by=request.user.admin_profile if hasattr(request.user, 'admin_profile') else None
        )
        
        serializer = self.get_serializer(new_payment)
        return Response({
            'message': f'Added {lessons_to_add} lessons successfully',
            'payment': serializer.data,
            'new_balance': float(student.balance)
        })


class StudentLessonViewSet(viewsets.ModelViewSet):
    """ViewSet для управления статусами уроков студентов"""
    queryset = StudentLesson.objects.select_related('student', 'lesson', 'group', 'payment')
    serializer_class = StudentLessonSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """Только админы могут изменять статусы"""
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'add_bonus', 'remove_lesson']:
            return [IsAdmin()]
        return super().get_permissions()
    
    def filter_queryset(self, queryset):
        """Фильтровать по студенту и группе"""
        student_id = self.request.query_params.get('student_id')
        group_id = self.request.query_params.get('group_id')
        
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if group_id:
            queryset = queryset.filter(group_id=group_id)
        
        return queryset
    
    @extend_schema(summary="Добавить бонусные уроки")
    @action(detail=False, methods=['post'])
    def add_bonus(self, request):
        """Добавить бонусные уроки студенту"""
        from .lesson_utils import add_bonus_lessons
        
        student_id = request.data.get('student_id')
        group_id = request.data.get('group_id')
        bonus_count = request.data.get('bonus_count', 1)
        
        if not all([student_id, group_id]):
            return Response(
                {'error': 'student_id and group_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            student = Student.objects.get(id=student_id)
            group = Group.objects.get(id=group_id)
            ensure_group_status(group)
            admin = request.user.admin_profile if hasattr(request.user, 'admin_profile') else None
        except (Student.DoesNotExist, Group.DoesNotExist):
            return Response({'error': 'Student or Group not found'}, status=status.HTTP_404_NOT_FOUND)

        if not group.is_active or (group.end_date and group.end_date < timezone.now()):
            return Response({'error': 'Cannot modify lessons for an inactive or expired group'}, status=status.HTTP_400_BAD_REQUEST)
        
        add_bonus_lessons(student, group, bonus_count, admin)
        
        return Response({
            'message': f'Added {bonus_count} bonus lessons to {student.user.get_full_name()}',
            'status': 'success'
        })
    
    @extend_schema(summary="Удалить урок у студента")
    @action(detail=False, methods=['post'])
    def remove_lesson(self, request):
        """Удалить (пометить как removed) урок у студента"""
        from .lesson_utils import remove_lesson as remove_lesson_util, remove_last_lessons
        
        student_id = request.data.get('student_id')
        group_id = request.data.get('group_id')
        lesson_number = request.data.get('lesson_number')  # например, 1 для первого урока
        lesson_count = int(request.data.get('lesson_count') or 1)
        
        if not all([student_id, group_id]):
            return Response(
                {'error': 'student_id and group_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if lesson_count < 1:
            return Response(
                {'error': 'lesson_count must be at least 1'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            student = Student.objects.get(id=student_id)
            group = Group.objects.get(id=group_id)
            ensure_group_status(group)
            admin = request.user.admin_profile if hasattr(request.user, 'admin_profile') else None
        except (Student.DoesNotExist, Group.DoesNotExist):
            return Response({'error': 'Student or Group not found'}, status=status.HTTP_404_NOT_FOUND)

        if not group.is_active or (group.end_date and group.end_date < timezone.now()):
            return Response({'error': 'Cannot modify lessons for an inactive or expired group'}, status=status.HTTP_400_BAD_REQUEST)
        
        if lesson_number:
            if lesson_count != 1:
                return Response(
                    {'error': 'lesson_count cannot be used together with lesson_number'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Find lesson by number
            try:
                lesson = Lesson.objects.get(group=group, lesson_number=lesson_number)
                lesson_id = lesson.id
            except Lesson.DoesNotExist:
                return Response(
                    {'error': f'Lesson {lesson_number} not found in group'},
                    status=status.HTTP_404_NOT_FOUND
                )

            success = remove_lesson_util(student, group, lesson_id, admin)
            if not success:
                return Response({'error': 'Lesson not found'}, status=status.HTTP_404_NOT_FOUND)

            return Response({
                'message': f'Removed lesson {lesson_number} from {student.user.get_full_name()}',
                'status': 'success'
            })

        removed_count = remove_last_lessons(student, group, lesson_count, admin)
        if removed_count == 0:
            return Response(
                {'error': 'No removable lessons found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'message': f'Removed {removed_count} last lesson(s) from {student.user.get_full_name()}',
            'removed_count': removed_count,
            'status': 'success'
        })


class StudentLessonTableView(APIView):
    """
    API для получения таблицы выставки уроков студентов в группе
    
    Возвращает:
    {
        'group': {...},
        'lessons': [
            {'id': 1, 'number': 1, 'date': '16.03.2026', 'time': '09:00'},
            ...
        ],
        'students': [
            {
                'id': 1,
                'name': 'Абдурауф',
                'email': 'abd@test.com',
                'lessons_status': ['paid', 'paid', 'unpaid', ...],
                'is_expired': False
            },
            ...
        ]
    }
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(summary="Таблица статусов уроков в группе")
    def get(self, request, group_id):
        """Получить таблицу выставки уроков для группы"""
        from .lesson_utils import get_student_lesson_table
        
        try:
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            table_data = get_student_lesson_table(group)
            serializer = StudentLessonTableSerializer(table_data)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class StudentLessonStatusView(APIView):
    """API для получения статуса студента в группе"""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(summary="Статус студента на всех уроках группы")
    def get(self, request, student_id, group_id):
        """Получить статусы студента на всех уроках группы"""
        try:
            student = Student.objects.get(id=student_id)
            group = Group.objects.get(id=group_id)
        except (Student.DoesNotExist, Group.DoesNotExist):
            return Response({'error': 'Student or Group not found'}, status=status.HTTP_404_NOT_FOUND)
        
        student_lessons = StudentLesson.objects.filter(
            student=student,
            group=group
        ).order_by('lesson__scheduled_date')
        
        serializer = StudentLessonSerializer(student_lessons, many=True)
        
        # Подсчитаем статистику
        statuses = {}
        for sl in student_lessons:
            status_key = sl.status
            statuses[status_key] = statuses.get(status_key, 0) + 1
        
        return Response({
            'student': {
                'id': student.id,
                'name': student.user.get_full_name(),
                'email': student.user.email,
            },
            'group': {
                'id': group.id,
                'name': group.name,
            },
            'lessons': serializer.data,
            'statistics': statuses,
            'total_lessons': len(student_lessons),
        })
