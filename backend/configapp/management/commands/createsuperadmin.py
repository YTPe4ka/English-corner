from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from configapp.models import Admin, TwoFactorAuth


class Command(BaseCommand):
    help = 'Create a SuperAdmin user with 2FA enabled'

    def add_arguments(self, parser):
        parser.add_argument(
            'username',
            type=str,
            help='Username for SuperAdmin'
        )
        parser.add_argument(
            'email',
            type=str,
            help='Email for SuperAdmin (for 2FA codes)'
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Password for SuperAdmin (will be prompted if not provided)',
            default=None
        )

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']

        # Get password if not provided
        if not password:
            from getpass import getpass
            password = getpass('Password: ')
            password_confirm = getpass('Confirm password: ')
            if password != password_confirm:
                self.stdout.write(self.style.ERROR('Passwords do not match'))
                return

        try:
            # Check if user exists
            if User.objects.filter(username=username).exists():
                self.stdout.write(self.style.ERROR(f'User {username} already exists'))
                return

            # Create user
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=username.title(),
                last_name='SuperAdmin'
            )

            # Create admin profile
            admin = Admin.objects.create(
                user=user,
                role='super_admin'
            )

            # Create 2FA profile
            TwoFactorAuth.objects.create(
                admin=admin,
                email=email
            )

            self.stdout.write(self.style.SUCCESS(
                f'Successfully created SuperAdmin: {username}'
            ))
            self.stdout.write(self.style.SUCCESS(
                f'Email: {email}'
            ))
            self.stdout.write(self.style.SUCCESS(
                f'2FA enabled: codes will be sent to {email}'
            ))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))
