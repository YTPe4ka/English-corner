from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from configapp.models import Admin


class Command(BaseCommand):
    help = 'Create default superadmin user if it does not exist'

    def handle(self, *args, **options):
        username = 'admin'
        email = 'admin@example.com'
        password = 'admin123'

        if not User.objects.filter(username=username).exists():
            user = User.objects.create_superuser(username, email, password)
            Admin.objects.get_or_create(
                user=user,
                defaults={'role': 'superadmin', 'is_active': True}
            )
            self.stdout.write(self.style.SUCCESS(f'Superadmin "{username}" created'))
        else:
            user = User.objects.get(username=username)
            # Ensure Admin record exists
            admin, created = Admin.objects.get_or_create(
                user=user,
                defaults={'role': 'superadmin', 'is_active': True}
            )
            if not admin.role in ['superadmin', 'super_admin']:
                admin.role = 'superadmin'
                admin.save()
            if not user.is_superuser:
                user.is_superuser = True
                user.is_staff = True
                user.save()
            self.stdout.write(self.style.SUCCESS(f'Superadmin "{username}" already exists'))
