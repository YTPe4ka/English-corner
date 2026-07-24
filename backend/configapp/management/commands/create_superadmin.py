from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from configapp.models import Admin, Teacher, Student


class Command(BaseCommand):
    help = 'Create default superadmin and demo users if they do not exist'

    def handle(self, *args, **options):
        # 1. Superadmin (admin / admin123)
        username = 'admin'
        email = 'admin@example.com'
        password = 'admin123'

        user = User.objects.filter(username=username).first()
        if not user:
            user = User.objects.create_superuser(username, email, password)
            self.stdout.write(self.style.SUCCESS(f'Superadmin "{username}" created'))
        else:
            user.set_password(password)
            user.is_superuser = True
            user.is_staff = True
            user.email = email
            user.save()

        Admin.objects.get_or_create(
            user=user,
            defaults={'role': 'superadmin', 'is_active': True}
        )

        # 2. Demo Teacher (teacher1 / teacher123)
        t_user = User.objects.filter(username='teacher1').first()
        if not t_user:
            t_user = User.objects.create_user('teacher1', 'teacher1@example.com', 'teacher123', first_name='John', last_name='Teacher')
            Teacher.objects.create(user=t_user, phone='+1234567890', is_active=True, personal_id='T1')
            self.stdout.write(self.style.SUCCESS('Teacher "teacher1" created'))
        else:
            t_user.set_password('teacher123')
            t_user.save()

        # 3. Demo Student (student1 / student123)
        s_user = User.objects.filter(username='student1').first()
        if not s_user:
            s_user = User.objects.create_user('student1', 'student1@example.com', 'student123', first_name='Alex', last_name='Student')
            Student.objects.create(user=s_user, phone='+1987654321', is_active=True, personal_id='1')
            self.stdout.write(self.style.SUCCESS('Student "student1" created'))
        else:
            s_user.set_password('student123')
            s_user.save()

