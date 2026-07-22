#!/usr/bin/env python
"""Test end_date calculation"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from datetime import datetime
from configapp.lesson_utils import calculate_end_date

start = datetime(2026, 4, 13)  # Пн
end_odd = calculate_end_date(start, 12, 'odd')  # ПН/СР/ПТ
end_even = calculate_end_date(start, 12, 'even')  # ВТ/ЧТ/СБ

print('✅ TEST: calculate_end_date')
print(f'Start: {start.strftime("%d.%m.%Y")}')
print(f'End (odd days Mon/Wed/Fri): {end_odd.strftime("%d.%m.%Y")}')
print(f'End (even days Tue/Thu/Sat): {end_even.strftime("%d.%m.%Y")}')
print(f'Duration (odd): {(end_odd - start).days} days')
print(f'Duration (even): {(end_even - start).days} days')
