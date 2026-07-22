#!/usr/bin/env python
import os
import django
import sqlite3

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings

# Get database path
db_path = settings.DATABASES['default']['NAME']

print(f"Connecting to SQLite database: {db_path}")

# Connect directly to SQLite to fix invalid Decimal values
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check what values exist in balance column
print("\nChecking Student.balance values...")
cursor.execute("SELECT id, balance FROM configapp_student LIMIT 20")
rows = cursor.fetchall()
print(f"Sample values: {rows}")

# Fix values: convert large integers to decimal format (likely cents that should be dollars)
# If balance > 1000, it's probably in cents (e.g., 123601135 cents = $1236011.35)
# Otherwise format as decimal with 2 places
print("\nFixing balance values...")
cursor.execute("""
    UPDATE configapp_student 
    SET balance = CAST(CAST(balance AS REAL) / 100.0 AS TEXT)
    WHERE CAST(balance AS INTEGER) > 1000
""")
print(f"Converted large values: {cursor.rowcount} records")

# Fix NULL and empty to 0
cursor.execute("""
    UPDATE configapp_student 
    SET balance = '0.00'
    WHERE balance IS NULL OR balance = ''
""")
print(f"Fixed NULL values: {cursor.rowcount} records")

conn.commit()

# Show fixed values
print("\nVerifying fixed values...")
cursor.execute("SELECT id, balance FROM configapp_student LIMIT 10")
rows = cursor.fetchall()
for row_id, balance in rows:
    print(f"  Student {row_id}: {balance}")

conn.close()

print("\nDone! Database cleaned up. Try the API again.")


