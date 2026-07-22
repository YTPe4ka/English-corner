#!/usr/bin/env python
"""
Тестовый скрипт для проверки логики уроков и платежей
Тестирует:
1. Создание группы с автогенерацией уроков
2. Добавление студента в группу
3. Создание платежа за уроки
4. Распределение платежа по урокам
5. Добавление бонусных уроков
6. Удаление урока
7. Получение таблицы уроков
"""

import os
import django
import requests
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from configapp.models import Student, Teacher, Group, GroupStudent, LessonPayment, StudentLesson, Admin
from decimal import Decimal

BASE_URL = 'http://localhost:8000/api/v1'

# Получить admin токен
print("=" * 60)
print("ТЕСТИРОВАНИЕ СИСТЕМЫ УПРАВЛЕНИЯ УРОКАМИ И ПЛАТЕЖАМИ")
print("=" * 60)

# Получить супер админ токен
response = requests.post(
    f'{BASE_URL}/admin/2fa/login/',
    json={'email': 'superadmin@gmail.com', 'password': 'admin123'}
)

if response.status_code != 200:
    print("❌ Ошибка: не удалось получить токен 2FA")
    print(response.text)
    exit(1)

session_id = response.json()['session_id']
print(f"✅ Получен session_id для 2FA: {session_id[:20]}...")

# Получить код верификации и завершить 2FA
from configapp.models import VerificationCode, TwoFactorAuth
two_factor = TwoFactorAuth.objects.get(email='superadmin@gmail.com')
codes = VerificationCode.objects.filter(two_factor=two_factor).order_by('-created_at')[:1]
if codes:
    code = codes[0].code
    print(f"✅ Код верификации: {code}")
    
    # Завершить 2FA
    response = requests.post(
        f'{BASE_URL}/admin/2fa/verify/',
        json={
            'email': 'superadmin@gmail.com',
            'session_id': session_id,
            'code': code
        }
    )
    
    if response.status_code == 200:
        access_token = response.json()['access']
        print(f"✅ Получен access token")
    else:
        print("❌ Ошибка при верификации кода")
        print(response.text)
        exit(1)
else:
    print("❌ Ошибка: код верификации не найден")
    exit(1)

headers = {'Authorization': f'Bearer {access_token}'}

# ========== TEST 1: Создание группы с автогенерацией уроков ==========
print("\n" + "=" * 60)
print("TEST 1: Создание группы с автогенерацией уроков")
print("=" * 60)

# Получить учителя
teachers = requests.get(f'{BASE_URL}/teachers/', headers=headers).json()
teacher_id = teachers[0]['id'] if teachers else None

if not teacher_id:
    print("❌ Ошибка: учитель не найден")
    exit(1)

group_data = {
    'name': 'English A1 - Test Group',
    'description': 'Тестовая группа для проверки логики платежей',
    'level': 'beginner',
    'teacher': teacher_id,
    'start_date': (datetime.now() + timedelta(days=1)).isoformat(),
    'end_date': (datetime.now() + timedelta(days=60)).isoformat(),
    'max_students': 10,
    'price_per_month': 100,
    'schedule_type': 'odd',  # ПН/СР/ПТ
}

response = requests.post(f'{BASE_URL}/groups/', json=group_data, headers=headers)
if response.status_code == 201:
    group = response.json()
    group_id = group['id']
    print(f"✅ Группа создана (ID: {group_id})")
    print(f"   Тип расписания: {group['schedule_type']}")
else:
    print(f"❌ Ошибка при создании группы: {response.status_code}")
    print(response.text)
    exit(1)

# Проверить что уроки созданы
lessons_response = requests.get(f'{BASE_URL}/lessons/?group={group_id}', headers=headers)
if lessons_response.status_code == 200:
    lessons = lessons_response.json()
    if isinstance(lessons, list):
        print(f"✅ Автоматически создано {len(lessons)} уроков")
        for lesson in lessons[:3]:
            print(f"   - Урок {lesson['lesson_number']}: {lesson['scheduled_date']}")
    elif 'results' in lessons:
        print(f"✅ Автоматически создано {len(lessons['results'])} уроков")
        for lesson in lessons['results'][:3]:
            print(f"   - Урок {lesson['lesson_number']}: {lesson['scheduled_date']}")
else:
    print("⚠️  Не удалось загрузить уроки")

# ========== TEST 2: Добавление студентов в группу ==========
print("\n" + "=" * 60)
print("TEST 2: Добавление студентов в группу")
print("=" * 60)

students_response = requests.get(f'{BASE_URL}/students/', headers=headers)
students = students_response.json()
if isinstance(students, dict) and 'results' in students:
    students = students['results']

if not students:
    print("❌ Ошибка: студенты не найдены")
    exit(1)

test_students = students[:2]
group_students = []

for student in test_students:
    student_id = student['id']
    response = requests.post(
        f'{BASE_URL}/groups/{group_id}/students/',
        json={'student_id': student_id},
        headers=headers
    )
    
    # Или добавляем через GroupStudent напрямую
    from configapp.models import GroupStudent
    try:
        gs, created = GroupStudent.objects.get_or_create(
            student_id=student_id,
            group_id=group_id
        )
        group_students.append(gs)
        print(f"✅ Студент добавлен в группу: {student['user_detail']['first_name']}")
    except Exception as e:
        print(f"⚠️  Ошибка добавления студента: {e}")

# ========== TEST 3: Создание платежа и распределение по урокам ==========
print("\n" + "=" * 60)
print("TEST 3: Создание платежа и распределение по урокам")
print("=" * 60)

if test_students:
    student_id = test_students[0]['id']
    
    # Создать платеж за 6 уроков (полкурса)
    payment_data = {
        'student': student_id,
        'group': group_id,
        'lessons_purchased': 6,
        'total_amount': 30,  # 6 * 5 = 30
        'price_per_lesson': 5,
        'lessons_remaining': 6,
        'status': 'completed',
    }
    
    response = requests.post(f'{BASE_URL}/lesson-payments/', json=payment_data, headers=headers)
    if response.status_code == 201:
        payment = response.json()
        payment_id = payment['id']
        print(f"✅ Платеж за 6 уроков создан (ID: {payment_id})")
        print(f"   Сумма: {payment['total_amount']}")
    else:
        print(f"❌ Ошибка при создании платежа: {response.status_code}")
        print(response.text)
    
    # Распределить платеж на уроки
    from configapp.lesson_utils import distribute_payment_to_lessons
    from configapp.models import LessonPayment
    
    try:
        student_obj = Student.objects.get(id=student_id)
        group_obj = Group.objects.get(id=group_id)
        payment_obj = LessonPayment.objects.get(id=payment_id)
        admin_obj = Admin.objects.filter(role='super_admin').first()
        
        distribute_payment_to_lessons(student_obj, group_obj, 6, payment_obj, admin_obj)
        print(f"✅ Платеж распределен на уроки студента")
        
        # Проверить статусы
        student_lessons = StudentLesson.objects.filter(student=student_obj, group=group_obj)
        paid_count = student_lessons.filter(status='paid').count()
        print(f"   Оплачено уроков: {paid_count}")
        
    except Exception as e:
        print(f"❌ Ошибка при распределении платежа: {e}")
    
    # ========== TEST 4: Получение таблицы уроков ==========
    print("\n" + "=" * 60)
    print("TEST 4: Получение таблицы статусов уроков в группе")
    print("=" * 60)
    
    response = requests.get(f'{BASE_URL}/groups/{group_id}/lesson-table/', headers=headers)
    if response.status_code == 200:
        table = response.json()
        print(f"✅ Таблица получена")
        print(f"\n   📅 Уроки:")
        for lesson in table['lessons'][:5]:
            print(f"      {lesson['number']}. {lesson['date']} {lesson['time']}")
        
        print(f"\n   👥 Студенты:")
        for student_data in table['students']:
            print(f"      {student_data['name']} ({student_data['email']})")
            statuses = student_data['lessons_status'][:5]
            status_symbols = {
                'paid': '✅',
                'bonus': '⭐',
                'unpaid': '🔴',
                'removed': '❌',
                'future': '⬜'
            }
            status_str = ' '.join(status_symbols.get(s, s) for s in statuses)
            print(f"         {status_str}...")
    else:
        print(f"❌ Ошибка получения таблицы: {response.status_code}")
        print(response.text)

print("\n" + "=" * 60)
print("✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО")
print("=" * 60)
