"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()

# Automatic startup setup: Ensure database schema is migrated and demo accounts exist
try:
    from django.db import connection
    from django.core.management import call_command
    table_names = connection.introspection.table_names()
    if 'auth_user' not in table_names:
        print("[WSGI STARTUP] Database tables missing. Running migrations...")
        call_command('migrate', interactive=False)
    print("[WSGI STARTUP] Running create_superadmin command...")
    call_command('create_superadmin')
except Exception as e:
    print(f"[WSGI STARTUP WARNING] {e}")

