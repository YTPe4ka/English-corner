from datetime import datetime, timedelta
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Admin, Group, GroupStudent, Lesson, Payment, Student, StudentLesson, Teacher, Notification, Attendance
from .lesson_utils import create_group_lessons, initialize_student_lessons, remove_last_lessons, create_unpaid_lesson_notifications
from .serializers import GroupSerializer, LessonSerializer


class LessonStatusLogicTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='teacher1',
            email='teacher1@example.com',
            password='testpass123'
        )
        self.teacher = Teacher.objects.create(
            user=self.user,
            personal_id='T001',
            specialization='English'
        )
        self.admin_user = User.objects.create_user(
            username='admin1',
            email='admin1@example.com',
            password='testpass123'
        )
        self.admin = Admin.objects.create(
            user=self.admin_user,
            role='super_admin'
        )
        self.student_user = User.objects.create_user(
            username='student1',
            email='student1@example.com',
            password='testpass123'
        )
        self.student = Student.objects.create(
            user=self.student_user,
            personal_id='S001'
        )

    def _create_group_with_lessons(self, start_date, schedule_type='odd'):
        group = Group.objects.create(
            name='Test Group',
            description='Test desc',
            level='beginner',
            teacher=self.teacher,
            start_date=start_date,
            end_date=start_date + timedelta(days=60),
            max_students=10,
            price_per_month=100,
            schedule_type=schedule_type,
            is_active=True,
        )
        create_group_lessons(group)
        return group

    def test_late_added_student_uses_unpaid_for_old_lessons_and_future_for_new_lessons(self):
        start = timezone.make_aware(datetime(2026, 12, 1, 9, 0))
        group = self._create_group_with_lessons(start)

        group_student = GroupStudent.objects.create(
            student=self.student,
            group=group,
            is_active=True,
        )
        join_date = timezone.make_aware(datetime(2026, 12, 10, 9, 0))
        group_student.joined_at = join_date
        group_student.save(update_fields=['joined_at'])

        initialize_student_lessons(self.student, group)

        student_lessons = StudentLesson.objects.filter(
            student=self.student,
            group=group
        ).order_by('lesson__lesson_number')

        for student_lesson in student_lessons:
            lesson_date = student_lesson.lesson.scheduled_date.date()
            if lesson_date < join_date.date():
                self.assertEqual(student_lesson.status, 'unpaid')
            else:
                self.assertEqual(student_lesson.status, 'future')

    def test_remove_lesson_never_changes_unpaid_or_future_statuses(self):
        start = timezone.make_aware(datetime(2026, 12, 1, 9, 0))
        group = self._create_group_with_lessons(start)

        lessons = list(Lesson.objects.filter(group=group).order_by('lesson_number'))

        StudentLesson.objects.update_or_create(
            student=self.student,
            lesson=lessons[0],
            group=group,
            defaults={'status': 'paid'}
        )
        StudentLesson.objects.update_or_create(
            student=self.student,
            lesson=lessons[1],
            group=group,
            defaults={'status': 'bonus'}
        )

        for lesson in lessons[2:4]:
            StudentLesson.objects.update_or_create(
                student=self.student,
                lesson=lesson,
                group=group,
                defaults={'status': 'unpaid'}
            )

        StudentLesson.objects.update_or_create(
            student=self.student,
            lesson=lessons[4],
            group=group,
            defaults={'status': 'future'}
        )

        removed = remove_last_lessons(self.student, group, lesson_count=2, admin=self.admin)
        self.assertEqual(removed, 2)

        self.assertEqual(
            StudentLesson.objects.get(student=self.student, lesson=lessons[0]).status,
            'removed'
        )
        self.assertEqual(
            StudentLesson.objects.get(student=self.student, lesson=lessons[1]).status,
            'removed'
        )
        self.assertEqual(
            StudentLesson.objects.get(student=self.student, lesson=lessons[2]).status,
            'unpaid'
        )
        self.assertEqual(
            StudentLesson.objects.get(student=self.student, lesson=lessons[4]).status,
            'future'
        )


class GroupAndNotificationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='teacher2',
            email='teacher2@example.com',
            password='testpass123'
        )
        self.teacher = Teacher.objects.create(
            user=self.user,
            personal_id='T002',
            specialization='English'
        )
        self.student_user = User.objects.create_user(
            username='student2',
            email='student2@example.com',
            password='testpass123'
        )
        self.student = Student.objects.create(
            user=self.student_user,
            personal_id='S003'
        )

    def test_create_unpaid_lesson_notifications_is_one_time(self):
        start = timezone.make_aware(datetime(2025, 1, 1, 9, 0))
        group = Group.objects.create(
            name='Test Notifications',
            description='desc',
            level='beginner',
            teacher=self.teacher,
            start_date=start,
            end_date=start + timedelta(days=60),
            max_students=10,
            price_per_month=100,
            schedule_type='odd',
            is_active=True,
        )
        lesson = Lesson.objects.filter(group=group).order_by('lesson_number').first()
        lesson.scheduled_date = start - timedelta(days=2)
        lesson.duration_minutes = 90
        lesson.save(update_fields=['scheduled_date', 'duration_minutes'])
        GroupStudent.objects.create(student=self.student, group=group, is_active=True)
        StudentLesson.objects.create(student=self.student, lesson=lesson, group=group, status='unpaid')

        create_unpaid_lesson_notifications(self.student.user)
        create_unpaid_lesson_notifications(self.student.user)

        self.assertEqual(Notification.objects.count(), 1)
        notification = Notification.objects.get()
        self.assertEqual(notification.recipient, self.student.user)
        self.assertEqual(notification.group, group)
        self.assertIn('unpaid', notification.message.lower())

    def test_group_serializer_includes_lesson_time_fields(self):
        group = Group.objects.create(
            name='Time Group',
            description='desc',
            level='beginner',
            teacher=self.teacher,
            start_date=timezone.make_aware(datetime(2026, 1, 1, 9, 0)),
            end_date=timezone.make_aware(datetime(2026, 2, 1, 9, 0)),
            max_students=10,
            price_per_month=100,
            schedule_type='odd',
            start_time='16:00:00',
            end_time='18:00:00',
            is_active=True,
        )

        serializer = GroupSerializer(group)
        self.assertEqual(serializer.data['start_time'], '16:00:00')
        self.assertEqual(serializer.data['end_time'], '18:00:00')

    def test_lesson_serializer_includes_topic_description_and_homework(self):
        group = Group.objects.create(
            name='Lesson Detail Group',
            description='desc',
            level='beginner',
            teacher=self.teacher,
            start_date=timezone.make_aware(datetime(2026, 1, 1, 9, 0)),
            end_date=timezone.make_aware(datetime(2026, 2, 1, 9, 0)),
            max_students=10,
            price_per_month=100,
            schedule_type='odd',
            is_active=True,
        )
        lesson = Lesson.objects.create(
            group=group,
            lesson_number=99,
            scheduled_date=timezone.make_aware(datetime(2026, 1, 5, 16, 0)),
            duration_minutes=120,
            topic='React Hooks',
            description='Study useState and useEffect.',
            homework='Build a Todo App.',
        )

        serializer = LessonSerializer(lesson)
        self.assertEqual(serializer.data['topic'], 'React Hooks')
        self.assertEqual(serializer.data['description'], 'Study useState and useEffect.')
        self.assertEqual(serializer.data['homework'], 'Build a Todo App.')

    def test_attendance_list_can_be_filtered_by_group(self):
        group = Group.objects.create(
            name='Attendance Group',
            description='desc',
            level='beginner',
            teacher=self.teacher,
            start_date=timezone.make_aware(datetime(2026, 1, 1, 9, 0)),
            end_date=timezone.make_aware(datetime(2026, 2, 1, 9, 0)),
            max_students=10,
            price_per_month=100,
            schedule_type='odd',
            is_active=True,
        )
        other_group = Group.objects.create(
            name='Other Group',
            description='desc',
            level='beginner',
            teacher=self.teacher,
            start_date=timezone.make_aware(datetime(2026, 1, 1, 9, 0)),
            end_date=timezone.make_aware(datetime(2026, 2, 1, 9, 0)),
            max_students=10,
            price_per_month=100,
            schedule_type='odd',
            is_active=True,
        )
        Attendance.objects.create(student=self.student, group=group, class_date=timezone.make_aware(datetime(2026, 1, 5, 16, 0)), is_present=True)
        Attendance.objects.create(student=self.student, group=other_group, class_date=timezone.make_aware(datetime(2026, 1, 6, 16, 0)), is_present=False)

        token = RefreshToken.for_user(self.student_user).access_token
        response = self.client.get(
            reverse('configapp:attendance-list'),
            {'group_id': group.id},
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]['group'], group.id)

    def test_student_can_list_only_their_notifications(self):
        other_user = User.objects.create_user(username='student3', email='student3@example.com', password='testpass123')
        Notification.objects.create(
            recipient=self.student_user,
            group=None,
            notification_type='general',
            message='Your lesson is unpaid',
            is_read=False,
        )
        Notification.objects.create(
            recipient=other_user,
            group=None,
            notification_type='general',
            message='Another notification',
            is_read=False,
        )

        token = RefreshToken.for_user(self.student_user).access_token
        response = self.client.get(
            reverse('configapp:notification-list'),
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        if isinstance(payload, dict):
            self.assertEqual(payload['count'], 1)
            messages = [item['message'] for item in payload.get('results', [])]
        else:
            messages = [item['message'] for item in payload]

        self.assertEqual(messages, ['Your lesson is unpaid'])

    def test_mark_read_action_updates_notification_state(self):
        notification = Notification.objects.create(
            recipient=self.student_user,
            group=None,
            notification_type='general',
            message='Your lesson is unpaid',
            is_read=False,
        )

        token = RefreshToken.for_user(self.student_user).access_token
        response = self.client.post(
            reverse('configapp:notification-mark-read', kwargs={'pk': notification.id}),
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )

        self.assertEqual(response.status_code, 200)
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)


class AdminFinanceHistoryTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin_finance',
            email='admin_finance@example.com',
            password='testpass123'
        )
        self.admin = Admin.objects.create(
            user=self.admin_user,
            role='super_admin'
        )
        self.student_user = User.objects.create_user(
            username='student_finance',
            email='student_finance@example.com',
            password='testpass123'
        )
        self.student = Student.objects.create(
            user=self.student_user,
            personal_id='S002'
        )

    def test_finance_history_handles_large_payment_amounts(self):
        Payment.objects.create(
            student=self.student,
            amount=Decimal('60000000000000'),
            payment_type='enrollment',
            description='Large amount payment',
            processed_by=self.admin,
        )

        token = RefreshToken.for_user(self.admin_user).access_token
        response = self.client.get(
            reverse('configapp:admin-finance-history'),
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(payload['summary']['total_operations'], 1)
        self.assertTrue(
            any(record['source'] == 'payment' for record in payload['records'])
        )

