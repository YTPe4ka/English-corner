JWT AUTHENTICATION IMPLEMENTATION
=================================

## Выполнено:

✅ Установлен пакет djangorestframework-simplejwt
✅ Добавлен rest_framework_simplejwt в INSTALLED_APPS (с token_blacklist)
✅ Настроен SIMPLE_JWT в settings.py:
   - ACCESS_TOKEN_LIFETIME: 2 часа (timedelta(hours=2))
   - REFRESH_TOKEN_LIFETIME: 1 день (timedelta(days=1))
   - ALGORITHM: HS256
   - BLACKLIST_AFTER_ROTATION: True (для logout функциональности)

✅ Создан файл configapp/auth_views.py с 4 основными views:
   1. UserLoginView - вход в систему (username + password → access + refresh tokens)
   2. UserLogoutView - выход из системы (инвалидирует refresh token)
   3. TokenRefreshView - обновление access token (refresh token → новый access token)
   4. CurrentUserView - получить информацию текущего пользователя

✅ Добавлены маршруты в configapp/urls.py:
   - POST /api/v1/auth/login/ - вход
   - POST /api/v1/auth/logout/ - выход
   - POST /api/v1/auth/token/refresh/ - обновление token
   - GET /api/v1/auth/me/ - текущий пользователь

✅ Обновлены все ViewSets в configapp/views.py:
   - permission_classes изменены с [AllowAny] на [IsAuthenticated]
   - Теперь все endpoint-ы требуют аутентификацию (JWT token в заголовке)

✅ Применены миграции для token_blacklist (13 миграций)

## SECURITY FEATURES:

🔐 2-часовой срок действия access token (как требовалось)
🔐 1-дневной срок действия refresh token
🔐 Token blacklist для logout (prevent token reuse after logout)
🔐 JWT подпись с использованием SECRET_KEY
🔐 Все data endpoints требуют IsAuthenticated permission

## USAGE:

1. ВХОД В СИСТЕМУ (Get tokens):
   POST /api/v1/auth/login/
   {
     "username": "admin",
     "password": "admin@test.com"
   }
   
   Ответ:
   {
     "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
     "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
     "user": {
       "id": 1,
       "username": "admin",
       "email": "admin@test.com",
       "first_name": "Admin",
       "last_name": "User"
     }
   }

2. ИСПОЛЬЗОВАНИЕ TOKEN для защищённых endpoint-ов:
   GET /api/v1/students/
   Header: Authorization: Bearer {access_token}
   
   Без token или с неверным token → ошибка 401 Unauthorized

3. ОБНОВЛЕНИЕ ACCESS TOKEN (когда истечёт через 2 часа):
   POST /api/v1/auth/token/refresh/
   {
     "refresh": "{refresh_token}"
   }
   
   Ответ:
   {
     "access": "new_access_token"
   }

4. ПОЛУЧИТЬ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ:
   GET /api/v1/auth/me/
   Header: Authorization: Bearer {access_token}

5. ВЫХОД ИЗ СИСТЕМЫ (Logout):
   POST /api/v1/auth/logout/
   Header: Authorization: Bearer {access_token}
   {
     "refresh": "{refresh_token}"
   }
   
   После logout старый refresh_token будет в чёрном списке (blacklist)

## ENDPOINTS ТРЕБУЮЩИЕ AUTHENTICATION:

Все data endpoints теперь требуют JWT token:
- /api/v1/students/ (GET, POST, PUT, DELETE)
- /api/v1/teachers/ (GET, POST, PUT, DELETE)
- /api/v1/groups/ (GET, POST, PUT, DELETE)
- /api/v1/payments/ (GET, POST, PUT, DELETE)
- /api/v1/attendance/ (GET, POST, PUT, DELETE)
- /api/v1/performance/ (GET, POST, PUT, DELETE)
- /api/v1/admins/ (GET, POST, PUT, DELETE)
- /api/v1/permissions/ (GET, POST, PUT, DELETE)
- /api/v1/admin-permissions/ (GET, POST, PUT, DELETE)
- /api/v1/admin-logs/ (GET - read-only)

## PUBLIC ENDPOINTS (без требования authentication):

- POST /api/v1/auth/login/ - получить tokens
- POST /api/v1/auth/token/refresh/ - обновить access token
- GET /api/schema/ - OpenAPI schema
- GET /api/docs/ - Swagger UI
- GET /api/redoc/ - ReDoc UI

## TESTING:

Запусти файл test_jwt.py для полного тестирования:
python test_jwt.py

Тесты проверяют:
1. Login - получение tokens
2. Get current user - получение информации пользователя
3. Access protected endpoint - использование access token
4. Access without token - попытка без token (должен быть отказ)
5. Refresh token - обновление expired access token
6. Invalid token - попытка с неверным token
7. Logout - инвалидация token

## SWAGGER UI:

Все новые endpoints доступны в Swagger UI: http://localhost:8000/api/docs/

Можешь прямо там тестировать:
1. Кликни на POST /api/v1/auth/login/
2. Нажми "Try it out"
3. Введи username и password
4. Скопируй access token
5. Используй для других endpoint-ов через "Authorize" кнопку

## ФРОНТЕНД ИНТЕГРАЦИЯ:

При запросе к любому защищённому endpoint-у, клиент должен:

1. Получить tokens через /auth/login/
2. Сохранить их (обычно в localStorage)
3. При каждом запросе добавить header:
   Authorization: Bearer {access_token}

4. Если получишь 401 (token expired):
   - Используй refresh_token для получения нового access_token
   - Если и refresh token expired → переводи на login страницу

Пример JavaScript:

```javascript
// Login
const response = await fetch('/api/v1/auth/login/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});
const data = await response.json();
localStorage.setItem('access_token', data.access);
localStorage.setItem('refresh_token', data.refresh);

// Запрос с token
const studentsResponse = await fetch('/api/v1/students/', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});
```

## TIMING:

- Access token истекает через: 2 часа (как требовалось)
- Refresh token истекает через: 1 день
- После logout: токены в чёрном списке (не могут быть использованы снова)

## Файлы изменены:

1. configapp/auth_views.py - новый файл с auth views
2. configapp/urls.py - добавлены auth endpoints
3. configapp/views.py - обновлены permission_classes
4. config/settings.py - добавлены JWT и token_blacklist конфигурация
5. test_jwt.py - тесты для JWT функциональности
6. requirements.txt (неявно) - добавлен djangorestframework-simplejwt

---
JWT Security Ready! 🔐
Token expiration: 2 hours ✅
