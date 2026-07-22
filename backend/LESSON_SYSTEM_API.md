# 🎓 API Документация - Система управления уроками и платежами

## Обзор

Система работает с календарем уроков, где каждый учащийся имеет статус для каждого урока.

### Архитектура

```
Group (группа)
├── schedule_type: "odd" (ПН/СР/ПТ) или "even" (ВТ/ЧТ/СБ)
├── start_date: дата начала
└── 12 Lessons (автоматически созданные уроки)
    └── StudentLesson (статус каждого студента на уроке)
        ├── status: paid ✅ | bonus ⭐ | unpaid 🔴 | removed ❌ | future ⬜
        └── payment: связь с платежом

StudentLesson:
- paid: урок оплачен
- bonus: бонусный урок
- unpaid: урок не оплачен
- removed: урок удален
- future: будущий урок (еще не наступил)

Payment:
- Полный курс: 12 уроков
- Полкурса: 6 уроков  
- Один урок: 1 урок

ActionLog:
- Логирование всех действий админов (платежи, бонусы, удаления)
```

---

## API Endpoints

### 1. Управление группами

#### Создать группу (автогенерство 12 уроков)
```
POST /api/v1/groups/

{
    "name": "English A1",
    "description": "Инструктивный курс",
    "level": "beginner",  // beginner, elementary, intermediate, upper_intermediate, advanced
    "teacher": 1,
    "start_date": "2026-03-16T09:00:00Z",
    "end_date": "2026-05-10T18:00:00Z",
    "max_students": 15,
    "price_per_month": 100,
    "schedule_type": "odd"  // или "even"
}

Response:
{
    "id": 1,
    "name": "English A1",
    "schedule_type": "odd",
    "start_date": "2026-03-16T09:00:00Z",
    ...
}

⚠️ ВАЖНО: При создании группы система АВТОМАТИЧЕСКИ создает 12 уроков!
```

#### Получить таблицу уроков в группе
```
GET /api/v1/groups/{group_id}/lesson-table/

Response:
{
    "group": {
        "id": 1,
        "name": "English A1",
        "schedule_type": "odd"
    },
    "lessons": [
        {
            "id": 1,
            "number": 1,
            "date": "16.03.2026",
            "time": "09:00"
        },
        ...
    ],
    "students": [
        {
            "id": 1,
            "name": "Абдурауф",
            "email": "abd@test.com",
            "lessons_status": ["paid", "paid", "unpaid", "future", ...],
            "is_expired": false
        },
        ...
    ]
}
```

---

### 2. Управление платежами

#### Создать платеж за уроки
```
POST /api/v1/lesson-payments/

{
    "student": 1,
    "group": 1,
    "lessons_purchased": 6,        // 1, 6, или 12
    "total_amount": 30.00,         // цена за все уроки
    "price_per_lesson": 5.00,      // цена за один урок
    "lessons_remaining": 6,
    "status": "completed"
}

Response:
{
    "id": 1,
    "student": 1,
    "group": 1,
    "lessons_purchased": 6,
    "total_amount": "30.00",
    "payment_date": "2026-03-17T15:36:25.593599Z",
    ...
}

⚠️ ВАЖНО: После создания платежа система АВТОМАТИЧЕСКИ:
1. Распределит оплату на уроки студента
2. Если платеж "поздний" (дата платежа > дата уроков),
   то прошлые этапы будут помечены как оплачены
3. Создаст запись в ActionLog
```

#### Получить платежи студента
```
GET /api/v1/lesson-payments/student_lesson_payments/?student_id=1&group_id=1

Response:
{
    "lessons_remaining": 6,
    "payment_history": [
        {
            "id": 1,
            "student": 1,
            "group": 1,
            "lessons_purchased": 6,
            "total_amount": "30.00",
            "payment_date": "2026-03-17T15:36:25Z",
            ...
        }
    ]
}
```

---

### 3. Управление статусами уроков

#### Добавить бонусные уроки
```
POST /api/v1/student-lessons/add_bonus/

{
    "student_id": 1,
    "group_id": 1,
    "bonus_count": 3  // количество бонусных уроков
}

Response:
{
    "message": "Added 3 bonus lessons to John Student",
    "status": "success"
}

⚠️ ЛОГИКА:
- Берет первые N уроков со статусом "future"
- Меняет статус на "bonus"
- Логирует действие в ActionLog
```

#### Удалить урок у студента
```
POST /api/v1/student-lessons/remove_lesson/

{
    "student_id": 1,
    "group_id": 1,
    "lesson_id": 3
}

Response:
{
    "message": "Removed lesson from John Student",
    "status": "success"
}

⚠️ ЛОГИКА:
- Помечает урок как "removed" (❌)
- Логирует действие в ActionLog
```

#### Получить статусы студента на всех уроках
```
GET /api/v1/students/{student_id}/groups/{group_id}/lessons/

Response:
{
    "student": {
        "id": 1,
        "name": "John Student",
        "email": "john@test.com"
    },
    "group": {
        "id": 1,
        "name": "English A1"
    },
    "lessons": [
        {
            "id": 1,
            "student": 1,
            "lesson": 1,
            "status": "paid",
            "payment": 1,
            ...
        },
        {
            "id": 2,
            "student": 1,
            "lesson": 2,
            "status": "bonus",
            ...
        },
        ...
    ],
    "statistics": {
        "paid": 6,
        "bonus": 3,
        "unpaid": 2,
        "removed": 0,
        "future": 1
    },
    "total_lessons": 12
}
```

---

### 4. Управление студентами в группе

#### Добавить студента в группу
```
Via Django ORM или через GroupStudent:

POST /api/v1/group-students/

{
    "student": 1,
    "group": 1,
    "is_active": true
}

Or directly:
from configapp.models import GroupStudent
GroupStudent.objects.get_or_create(student_id=1, group_id=1)
```

---

## Логика платежей (КЛЮЧЕВАЯ)

### Сценарий 1: Ранний платеж (оплачен до урока)
```
Уроки: 16.03, 18.03, 20.03, 23.03
Платеж: 14.03 (за 2 урока)

Результат:
16.03 → ✅ (paid)
18.03 → ✅ (paid)
20.03 → 🔴 (unpaid)
23.03 → 🔴 (unpaid)
```

### Сценарий 2: Поздний платеж (ВАЖНО!)
```
Уроки: 16.03, 18.03, 20.03, 23.03
Платеж: 20.03 (за 2 урока, но уже после первых двух уроков)

Результат:
16.03 → ✅ (paid) - закрыли ретроспективно!
18.03 → ✅ (paid) - закрыли ретроспективно!
20.03 → 🔴 (unpaid)
23.03 → 🔴 (unpaid)

ЛОГИКА: Если платеж поздний, закрываем прошлые уроки первыми!
```

### Сценарий 3: Бонусы
```
Платеж за 6, потом +3 бонуса

16.03 → ✅ (paid)
...
28.03 → ✅ (paid - последний из 6)
30.03 → ⭐ (bonus)
01.04 → ⭐ (bonus)
03.04 → ⭐ (bonus)
05.04 → 🔴 (unpaid)
...
```

### Сценарий 4: Удаление урока
```
После создания платежа админ может удалить урок:

20.03 → ❌ (removed)

Этот урок больше не считается!
```

### Сценарий 5: Переплата (продление)
```
Оплачено: 12 уроков
Закончилось: 28.03

Студент оплачивает еще +12

Результат:
29.03 → ✅ (следующие 12 уроков помечены как оплачено)
...
```

---

## Логирование (ActionLog)

Каждое действие логируется:

```python
ActionLog:
- action_type: 'payment' | 'bonus' | 'remove_lesson' | 'transfer_student'
- lessons_affected: количество уроков
- amount: сумма (для платежей)
- created_by: админ, который совершил действие
- payment: связь с платежом
- created_at: время действия
```

Пример:
```
Student: John Student
Action: payment
Lessons Affected: 6
Amount: 30.00
Created By: superadmin
Date: 2026-03-17 15:36:25
```

---

## Статусы студентов

```
is_expired: true  - если нет оплаченных уроков на текущую/будущие даты

Определяется в StudentLesson.is_expired():
return timezone.now().date() > self.lesson.scheduled_date.date() and self.status == 'unpaid'
```

---

## Пример полного цикла

```python
# 1. Создать группу
group_data = {
    "name": "English A1",
    "start_date": "2026-03-16T09:00:00Z",
    "schedule_type": "odd",  # Пн, Ср, Пт
    ...
}
group = Group.objects.create(**group_data)
# → Автоматически создано 12 уроков!

# 2. Добавить студентов
GroupStudent.objects.get_or_create(student_id=1, group=group)

# 3. Создать платеж
payment = LessonPayment.objects.create(
    student_id=1,
    group=group,
    lessons_purchased=6,
    total_amount=30,
    price_per_lesson=5,
    status='completed'
)

# 4. Распределить платеж (автоматически или вручную)
from configapp.lesson_utils import distribute_payment_to_lessons
distribute_payment_to_lessons(student, group, 6, payment, admin)

# 5. Получить таблицу
from configapp.lesson_utils import get_student_lesson_table
table = get_student_lesson_table(group)

# Вывести таблицу
for lesson in table['lessons']:
    print(f"Урок {lesson['number']}: {lesson['date']}")
    
for student_data in table['students']:
    statuses = student_data['lessons_status']
    print(f"{student_data['name']}: {' '.join(statuses)}")
```

---

## Ежедневные задачи (Celery/Cron)

```python
# Проверить просроченных студентов
check_expired_students()

# Отметить уроки как использованные
mark_lessons_consumed_today()
```

---

## Производительность

- Используется `select_related()` для оптимизации запросов
- Теория индекса на (`student`, `group`, `lesson`)
- Кэширование возможно на уровне `lesson-table`

---

## Обработка ошибок

```
400 Bad Request: Отсутствуют обязательные поля
401 Unauthorized: Требуется аутентификация
402 Payment Required: Недостаточно средств в балансе
403 Forbidden: Нет прав доступа (нужны права админа)
404 Not Found: Ресурс не найден
500 Internal Server Error: Ошибка сервера
```

---

## HTML/UI Интеграция

Таблица уроков выглядит так:

```
              16.03    18.03    20.03    23.03
Абдурауф      ✅       ✅       🔴       🔴
Алишер        ✅       ⭐       ⬜       ⬜
Джон          🔴       🔴       🔴       ❌
```

Где:
- ✅ = paid (оплачено)
- ⭐ = bonus (бонус)
- 🔴 = unpaid (не оплачено)
- ❌ = removed (удалено)
- ⬜ = future (еще не наступило)
- Красная строка = expired (просроченный студент)

---

## Примеры запросов (curl)

```bash
# Получить таблицу уроков группы
curl -X GET "http://localhost:8000/api/v1/groups/1/lesson-table/" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Создать платеж
curl -X POST "http://localhost:8000/api/v1/lesson-payments/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "student": 1,
    "group": 1,
    "lessons_purchased": 6,
    "total_amount": 30,
    "price_per_lesson": 5
  }'

# Добавить бонусы
curl -X POST "http://localhost:8000/api/v1/student-lessons/add_bonus/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "student_id": 1,
    "group_id": 1,
    "bonus_count": 3
  }'

# Удалить урок
curl -X POST "http://localhost:8000/api/v1/student-lessons/remove_lesson/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "student_id": 1,
    "group_id": 1,
    "lesson_id": 3
  }'
```
