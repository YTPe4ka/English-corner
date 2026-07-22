SUPERADMIN 2FA IMPLEMENTATION
=============================

## Что было сделано:

✅ Созданы модели для 2FA:
   - TwoFactorAuth: профиль с email адресом для отправки кодов
   - VerificationCode: 6-значные коды подтверждения (действительны 10 минут)

✅ Созданы endpoints для SuperAdmin с 2FA:
   1. POST /api/v1/auth/superadmin/login/
      - Вход SuperAdmin с username/password
      - Отправка 6-значного кода на email
      - Ответ: email, user_id, message
   
   2. POST /api/v1/auth/superadmin/verify/
      - Подтверждение кода полученного на email
      - Входные данные: user_id, code
      - Ответ: access token, refresh token, user info
      - Если код неверный или истёк: 401 Unauthorized
   
   3. POST /api/v1/auth/superadmin/resend/
      - Повторная отправка кода на email
      - Входные данные: user_id
      - Используется если пользователь потерял или не получил первый код

✅ Создана команда для создания SuperAdmin:
   python manage.py createsuperadmin username email [--password=password]

✅ Настроена отправка email:
   - Development: console backend (коды выводятся в консоль)
   - Production: configure EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD

## ИСПОЛЬЗОВАНИЕ:

### 1. СОЗДАТЬ SUPERADMIN:

```bash
python manage.py createsuperadmin superadmin superadmin@example.com --password=MyPassword123!
```

Ответ:
```
Successfully created SuperAdmin: superadmin
Email: superadmin@example.com
2FA enabled: codes will be sent to superadmin@example.com
```

### 2. ВХОД SUPERADMIN (STEP 1):

```bash
curl -X POST http://localhost:8000/api/v1/auth/superadmin/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "MyPassword123!"
  }'
```

Ответ:
```json
{
  "message": "Verification code sent to superadmin@example.com",
  "email": "superadmin@example.com",
  "user_id": 3
}
```

В консоли сервера (development) вы увидите 6-значный код:
```
Verification code: 123456
```

### 3. ПОДТВЕРДИТЬ КОД (STEP 2):

```bash
curl -X POST http://localhost:8000/api/v1/auth/superadmin/verify/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 3,
    "code": "123456"
  }'
```

Ответ:
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 3,
    "username": "superadmin",
    "email": "superadmin@example.com",
    "first_name": "Superadmin",
    "last_name": "SuperAdmin"
  }
}
```

### 4. ПОВТОРНАЯ ОТПРАВКА КОДА (OPTIONAL):

Если код потерян:
```bash
curl -X POST http://localhost:8000/api/v1/auth/superadmin/resend/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 3
  }'
```

Ответ:
```json
{
  "message": "New verification code sent to superadmin@example.com"
}
```

## НАСТРОЙКА EMAIL ДЛЯ PRODUCTION:

В config/settings.py обновить:

```python
# Production SMTP configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'  # или другой SMTP сервер
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'  # NOT regular password
DEFAULT_FROM_EMAIL = 'noreply@englishcorner.com'
```

Для Gmail:
1. Enable 2-factor authentication
2. Create App Password at https://myaccount.google.com/apppasswords
3. Use generated password в EMAIL_HOST_PASSWORD

## SECURITY FEATURES:

🔒 6-значный код - достаточно для email
🔒 Коды действительны только 10 минут
🔒 Каждый код можно использовать только один раз
🔒 Access token выдаётся только после правильного кода
🔒 Неправильный код возвращает 401 Unauthorized
🔒 Все коды хранятся в БД для аудита
🔒 SuperAdmin может повторно отправить код

## REQUIREMENTS:

✅ Только SuperAdmin может использовать эти endpoints
✅ Обычные админы используют обычный login
✅ Коды отправляются на email указанный при создании SuperAdmin
✅ Консоль (development) выводит коды для тестирования
✅ Production должен быть настроен на реальный SMTP сервер

## JAVASCRIPT ПРИМЕР:

```javascript
// Step 1: Login SuperAdmin
const loginRes = await fetch('/api/v1/auth/superadmin/login/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'superadmin',
    password: 'password'
  })
});

const { email, user_id } = await loginRes.json();
console.log(`Code sent to: ${email}`);

// Get code from user (prompt or input field)
const code = prompt('Enter verification code:');

// Step 2: Verify code
const verifyRes = await fetch('/api/v1/auth/superadmin/verify/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id, code })
});

const { access, refresh } = await verifyRes.json();

// Store tokens
localStorage.setItem('access_token', access);
localStorage.setItem('refresh_token', refresh);

// Now can use access token for protected endpoints
const apiRes = await fetch('/api/v1/admins/', {
  headers: { 'Authorization': `Bearer ${access}` }
});
```

## ДОКУМЕНТАЦИЯ ДЛЯ FRONTEND:

SuperAdmin Flow:
1. Пользователь вводит username + password
2. POST /api/v1/auth/superadmin/login/
3. Система отправляет код на email
4. Пользователь вводит код из email
5. POST /api/v1/auth/superadmin/verify/ с кодом
6. Получает access + refresh tokens
7. Использует tokens как обычный JWT

Обычный User Flow (безизменений):
1. Пользователь вводит username + password
2. POST /api/v1/auth/login/
3. Сразу получает tokens
4. Использует tokens

## СТАТУС:

✅ Models созданы и мигрированы
✅ Views реализованы
✅ URLs добавлены
✅ Email настроен (console backend для development)
✅ Management command создан
✅ SuperAdmin создан и протестирован
✅ Endpoints видны в Swagger UI

ГОТОВО К ИСПОЛЬЗОВАНИЮ! 🚀
