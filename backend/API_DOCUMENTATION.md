# API Документация - English Corner Platform

## Обзор

Полный REST API для платформи English Corner з управлінням адміністраторів, учителів, студентів, груп та фінансів.

**Інтерактивна документація:** http://localhost:8000/api/docs/

## Базовий URL

```
http://localhost:8000/api/v1/
```

---

## 📚 ADMIN PANEL API

### Управління адміністраторами

#### Отримати список адміністраторів
```
GET /api/v1/admins/
```

#### Створити адміністратора
```
POST /api/v1/admins/
```

**Тіло запиту:**
```json
{
  "user": {
    "username": "newadmin",
    "email": "newadmin@test.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "role": "admin"
}
```

#### Отримати статистику адміністраторів
```
GET /api/v1/admins/stats/
```

#### Пошук адміністраторів
```
GET /api/v1/admins/search/?q=admin
```

#### Панель управління (Dashboard)
```
GET /api/v1/admins/dashboard_stats/
```

**Ответ:**
```json
{
  "total_students": 50,
  "active_students": 45,
  "total_teachers": 10,
  "active_teachers": 9,
  "total_groups": 5,
  "active_groups": 4,
  "total_payments": 15000,
  "pending_payments": 3
}
```

---

## 👨‍🎓 STUDENTS API

### Управління студентами

#### Отримати список студентів
```
GET /api/v1/students/
```

#### Створити студента
```
POST /api/v1/students/
```

**Тіло запиту:**
```json
{
  "user": {
    "username": "student1",
    "email": "student1@test.com",
    "first_name": "Anna",
    "last_name": "Smith"
  },
  "personal_id": "STU001",
  "phone": "+1234567890"
}
```

#### Отримати студента
```
GET /api/v1/students/{id}/
```

#### Оновити студента
```
PUT /api/v1/students/{id}/
```

#### Пошук студентів
```
GET /api/v1/students/search/?q=anna
```

---

## 👨‍🏫 TEACHERS API

### Управління учителями

#### Отримати список учителів
```
GET /api/v1/teachers/
```

#### Створити учителя
```
POST /api/v1/teachers/
```

**Тіло запиту:**
```json
{
  "user": {
    "username": "teacher1",
    "email": "teacher1@test.com",
    "first_name": "John",
    "last_name": "Brown"
  },
  "personal_id": "TCH001",
  "specialization": "English Literature",
  "phone": "+1234567890"
}
```

#### Отримати учителя
```
GET /api/v1/teachers/{id}/
```

#### Пошук учителів
```
GET /api/v1/teachers/search/?q=john
```

---

## 📚 GROUPS API

### Управління групами

#### Отримати список груп
```
GET /api/v1/groups/
```

**Параметри фільтра:**
- `level` - Рівень (beginner, elementary, intermediate, upper_intermediate, advanced)
- `is_active` - Активна група (true/false)

#### Створити групу
```
POST /api/v1/groups/
```

**Тіло запиту:**
```json
{
  "name": "English for Beginners",
  "description": "Basic English course",
  "level": "beginner",
  "teacher": 1,
  "start_date": "2026-02-01T10:00:00Z",
  "end_date": "2026-05-01T10:00:00Z",
  "max_students": 15,
  "price_per_month": 100
}
```

#### Отримати деталі групи
```
GET /api/v1/groups/{id}/
```

#### Оновити групу
```
PUT /api/v1/groups/{id}/
```

#### Додати студента до групи
```
POST /api/v1/groups/{id}/add_student/
```

**Тіло запиту:**
```json
{
  "student_id": 1
}
```

#### Видалити студента з групи
```
POST /api/v1/groups/{id}/remove_student/
```

**Тіло запиту:**
```json
{
  "student_id": 1
}
```

#### Змінити учителя групи
```
PATCH /api/v1/groups/{id}/change_teacher/
```

**Тіло запиту:**
```json
{
  "teacher_id": 2
}
```

---

## 💰 FINANCE API

### Управління платежами

#### Отримати список платежів
```
GET /api/v1/payments/
```

#### Пополнити баланс студента
```
POST /api/v1/payments/add_balance/
```

**Тіло запиту:**
```json
{
  "student_id": 1,
  "amount": 500
}
```

#### Списати баланс за месяц
```
POST /api/v1/payments/deduct_balance/
```

**Тіло запиту:**
```json
{
  "student_id": 1,
  "group_id": 1
}
```

#### Отримати платежі студента
```
GET /api/v1/payments/student_payments/?student_id=1
```

**Ответ:**
```json
[
  {
    "id": 1,
    "student": 1,
    "student_detail": {...},
    "group": 1,
    "amount": 100,
    "payment_type": "monthly",
    "description": "Monthly payment",
    "payment_date": "2026-01-16T10:00:00Z",
    "processed_by": 1
  }
]
```

---

## 📊 ANALYTICS API

### Посещаемость

#### Отримати посещаемость студента
```
GET /api/v1/attendance/student_attendance/?student_id=1
```

**Ответ:**
```json
{
  "total_classes": 10,
  "present": 8,
  "absent": 2,
  "attendance_rate": "80.0%",
  "records": [...]
}
```

#### Добавить запись о посещаемости
```
POST /api/v1/attendance/
```

**Тіло запиту:**
```json
{
  "student": 1,
  "group": 1,
  "class_date": "2026-01-16T10:00:00Z",
  "is_present": true,
  "notes": "Good attendance"
}
```

### Успеваемость

#### Отримати успеваемость студента
```
GET /api/v1/performance/student_performance/?student_id=1
```

**Ответ:**
```json
{
  "average_grade": 4.2,
  "total_assessments": 5,
  "records": [...]
}
```

#### Добавить оценку
```
POST /api/v1/performance/
```

**Тіло запиту:**
```json
{
  "student": 1,
  "group": 1,
  "grade": 5,
  "subject": "Speaking",
  "comments": "Excellent performance",
  "assessed_by": 1
}
```

---

## 🔐 PERMISSIONS API

### Управління правами доступу

#### Отримати список прав
```
GET /api/v1/permissions/
```

#### Створити право
```
POST /api/v1/permissions/
```

**Тіло запиту:**
```json
{
  "name": "Edit Students",
  "code": "edit_students",
  "description": "Permission to edit student information"
}
```

#### Пошук прав
```
GET /api/v1/permissions/search/?q=manage
```

---

## 📝 ADMIN LOGS API

#### Отримати логи
```
GET /api/v1/admin-logs/
```

#### Фільтр логів по адміністратору
```
GET /api/v1/admin-logs/filter_by_admin/?admin_id=1
```

#### Фільтр логів по дії
```
GET /api/v1/admin-logs/filter_by_action/?action=login
```

**Доступні дії:**
- `create` - Создание
- `update` - Обновление
- `delete` - Удаление
- `view` - Просмотр
- `login` - Вход
- `logout` - Выход

---

## 📊 Рівні груп (Level Choices)

- `beginner` - Початківець
- `elementary` - Елементарний
- `intermediate` - Середній
- `upper_intermediate` - Вище середнього
- `advanced` - Продвинутий

---

## 💾 Типи платежів

- `enrollment` - Реєстрація/Поповнення балансу
- `monthly` - Місячний платіж
- `discount` - Знижка

---

## 📈 Оцінки (Grades)

- `5` - Excellent
- `4` - Good
- `3` - Satisfactory
- `2` - Poor
- `1` - Very Poor

---

## Ролі адміністраторів

- `super_admin` - Супер адміністратор (повний доступ)
- `admin` - Адміністратор (основні права)
- `moderator` - Модератор (обмежені права)

---

## Примеры использования

### Создание группы и добавления студентов

```bash
# 1. Создать учителя
curl -X POST http://localhost:8000/api/v1/teachers/ \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "username": "teacher1",
      "email": "teacher1@test.com",
      "first_name": "John",
      "last_name": "Brown"
    },
    "personal_id": "TCH001"
  }'

# 2. Создать группу
curl -X POST http://localhost:8000/api/v1/groups/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "English Beginners",
    "level": "beginner",
    "teacher": 1,
    "start_date": "2026-02-01T10:00:00Z",
    "end_date": "2026-05-01T10:00:00Z",
    "price_per_month": 100
  }'

# 3. Добавить студентов
curl -X POST http://localhost:8000/api/v1/groups/1/add_student/ \
  -H "Content-Type: application/json" \
  -d '{"student_id": 1}'

# 4. Пополнить баланс студента
curl -X POST http://localhost:8000/api/v1/payments/add_balance/ \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "amount": 500
  }'

# 5. Списать плату за месяц
curl -X POST http://localhost:8000/api/v1/payments/deduct_balance/ \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "group_id": 1
  }'
```

---

## Статус кодов

- `200 OK` - Успешно
- `201 Created` - Объект создан
- `204 No Content` - Успешно удалено
- `400 Bad Request` - Ошибка в запросе
- `404 Not Found` - Объект не найден
- `500 Internal Server Error` - Ошибка сервера

---

## Доступные Swagger URL

- **Swagger UI:** http://localhost:8000/api/docs/
- **ReDoc:** http://localhost:8000/api/redoc/
- **OpenAPI Schema:** http://localhost:8000/api/schema/


