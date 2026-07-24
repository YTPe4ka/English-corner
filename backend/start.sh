#!/bin/sh
echo "=== Running Database Migrations ==="
python manage.py migrate --noinput

echo "=== Running Create Superadmin & Demo Accounts ==="
python manage.py create_superadmin

echo "=== Starting Gunicorn Web Server ==="
exec gunicorn config.wsgi:application --log-file -
