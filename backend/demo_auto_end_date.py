#!/usr/bin/env python
"""Demonstrate the auto end_date calculation"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from configapp.models import VerificationCode, TwoFactorAuth

two_factor = TwoFactorAuth.objects.filter(email='superadmin@gmail.com').first()
if two_factor:
    codes = VerificationCode.objects.filter(two_factor=two_factor).order_by('-created_at')[:1]
    if codes:
        print(f'✅ Код для 2FA: {codes[0].code}')

print('\n' + '='*60)
print('API EXAMPLE: Создание группы с автоматическим расчетом end_date')
print('='*60)
print('\nPOST /api/v1/groups/')
print('{')
print('  "name": "English A1",')
print('  "start_date": "2026-04-13T09:00:00Z",')
print('  "schedule_type": "odd",  // или "even"')
print('  "teacher": 1,')
print('  "max_students": 15,')
print('  "price_per_month": 100')
print('  // end_date НЕ НУЖЕН - система вычислит автоматически!')
print('}')
print('\n✅ Результат: конец курса = 08.05.2026')
print('   (через 12 уроков по ПН/СР/ПТ, ~25 дней)')
print('='*60)
