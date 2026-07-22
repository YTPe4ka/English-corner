 # English Corner API - Примеры использования

## Для тестирования в Postman/Insomnia или curl

### 1. Создание Студента

```bash
curl -X POST http://localhost:8000/api/v1/students/ \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "username": "student1",
      "email": "student1@test.com",
      "first_name": "Anna",
      "last_name": "Smith"
    },
    "personal_id": "STU001",
    "phone": "+1234567890"
  }'
```

### 2. Создание Учителя

```bash
curl -X POST http://localhost:8000/api/v1/teachers/ \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "username": "teacher1",
      "email": "teacher1@test.com",
      "first_name": "John",
      "last_name": "Brown"
    },
    "personal_id": "TCH001",
    "specialization": "English Literature",
    "phone": "+1234567890"
  }'
```

### 3. Создание Группы

```bash
curl -X POST http://localhost:8000/api/v1/groups/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "English for Beginners",
    "description": "Basic English course for absolute beginners",
    "level": "beginner",
    "teacher": 1,
    "start_date": "2026-02-01T10:00:00Z",
    "end_date": "2026-05-01T10:00:00Z",
    "max_students": 15,
    "price_per_month": 100
  }'
```

### 4. Добавить Студента в Группу

```bash
curl -X POST http://localhost:8000/api/v1/groups/1/add_student/ \
  -H "Content-Type: application/json" \
  -d '{"student_id": 1}'
```

### 5. Пополнить Баланс Студента

```bash
curl -X POST http://localhost:8000/api/v1/payments/add_balance/ \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "amount": 500
  }'
```

### 6. Списать Плату за Месяц

```bash
curl -X POST http://localhost:8000/api/v1/payments/deduct_balance/ \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "group_id": 1
  }'
```

### 7. Получить Платежи Студента

```bash
curl http://localhost:8000/api/v1/payments/student_payments/?student_id=1
```

### 8. Добавить Посещаемость

```bash
curl -X POST http://localhost:8000/api/v1/attendance/ \
  -H "Content-Type: application/json" \
  -d '{
    "student": 1,
    "group": 1,
    "class_date": "2026-02-05T10:00:00Z",
    "is_present": true,
    "notes": "Good participation"
  }'
```

### 9. Получить Посещаемость Студента

```bash
curl http://localhost:8000/api/v1/attendance/student_attendance/?student_id=1
```

### 10. Добавить Оценку

```bash
curl -X POST http://localhost:8000/api/v1/performance/ \
  -H "Content-Type: application/json" \
  -d '{
    "student": 1,
    "group": 1,
    "grade": 5,
    "subject": "Speaking",
    "comments": "Excellent performance",
    "assessed_by": 1
  }'
```

### 11. Получить Успеваемость Студента

```bash
curl http://localhost:8000/api/v1/performance/student_performance/?student_id=1
```

### 12. Получить Dashboard Статистику

```bash
curl http://localhost:8000/api/v1/admins/dashboard_stats/
```

### 13. Изменить Учителя Группы

```bash
curl -X PATCH http://localhost:8000/api/v1/groups/1/change_teacher/ \
  -H "Content-Type: application/json" \
  -d '{"teacher_id": 2}'
```

### 14. Удалить Студента из Группы

```bash
curl -X POST http://localhost:8000/api/v1/groups/1/remove_student/ \
  -H "Content-Type: application/json" \
  -d '{"student_id": 1}'
```

### 15. Поиск Студентов

```bash
curl "http://localhost:8000/api/v1/students/search/?q=anna"
```

### 16. Поиск Учителей

```bash
curl "http://localhost:8000/api/v1/teachers/search/?q=john"
```

---

## Тестирование через Python requests

```python
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

# Создание студента
student_data = {
    "user": {
        "username": "student2",
        "email": "student2@test.com",
        "first_name": "Bob",
        "last_name": "Johnson"
    },
    "personal_id": "STU002",
    "phone": "+1987654321"
}

response = requests.post(f"{BASE_URL}/students/", json=student_data)
print(response.json())

# Получить всех студентов
response = requests.get(f"{BASE_URL}/students/")
print(response.json())

# Пополнить баланс
payment_data = {
    "student_id": 1,
    "amount": 750
}

response = requests.post(f"{BASE_URL}/payments/add_balance/", json=payment_data)
print(response.json())

# Dashboard статистика
response = requests.get(f"{BASE_URL}/admins/dashboard_stats/")
print(response.json())
```

---

## Структура базы данных

### Students
- `id` - Primary Key
- `user` - OneToOne с User
- `personal_id` - Уникальный ID студента (STU001, STU002, ...)
- `phone` - Телефон
- `balance` - Баланс студента
- `is_active` - Активен ли студент
- `created_at`, `updated_at` - Timestamps

### Teachers
- `id` - Primary Key
- `user` - OneToOne с User
- `personal_id` - Уникальный ID учителя (TCH001, TCH002, ...)
- `phone` - Телефон
- `specialization` - Специализация
- `is_active` - Активен ли учитель
- `created_at`, `updated_at` - Timestamps

### Groups
- `id` - Primary Key
- `name` - Название группы
- `description` - Описание
- `level` - Уровень (beginner, elementary, intermediate, upper_intermediate, advanced)
- `teacher` - ForeignKey на Teacher
- `start_date`, `end_date` - Время начала и конца
- `max_students` - Максимум студентов
- `price_per_month` - Стоимость в месяц
- `is_active` - Активна ли группа
- `created_at`, `updated_at` - Timestamps

### Payments
- `id` - Primary Key
- `student` - ForeignKey на Student
- `group` - ForeignKey на Group (опционально)
- `amount` - Сумма платежа
- `payment_type` - Тип (enrollment, monthly, discount)
- `description` - Описание платежа
- `payment_date` - Дата платежа
- `processed_by` - Admin кто обработал платеж

### Attendance
- `id` - Primary Key
- `student` - ForeignKey на Student
- `group` - ForeignKey на Group
- `class_date` - Дата класса
- `is_present` - Присутствовал ли студент
- `notes` - Заметки

### Performance
- `id` - Primary Key
- `student` - ForeignKey на Student
- `group` - ForeignKey на Group
- `assessment_date` - Дата оценки
- `grade` - Оценка (1-5)
- `subject` - Предмет
- `comments` - Комментарии
- `assessed_by` - ForeignKey на Teacher

---

## Типы Ошибок

| Код | Значение |
|-----|----------|
| 200 | OK - Успешно |
| 201 | Created - Объект создан |
| 204 | No Content - Успешно удалено |
| 400 | Bad Request - Ошибка в запросе |
| 404 | Not Found - Объект не найден |
| 500 | Server Error - Ошибка сервера |

---

## Сортировка и Фильтрация

Большинство GET endpoints поддерживают стандартную фильтрацию DRF:

```bash
# Фильтрация по полю
GET /api/v1/students/?is_active=true

# Сортировка
GET /api/v1/students/?ordering=-created_at

# Поиск (для endpoints которые это поддерживают)
GET /api/v1/students/search/?q=anna
```

