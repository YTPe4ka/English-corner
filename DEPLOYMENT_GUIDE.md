# 🚀 Полное руководство по деплою English Corner (GitHub + Supabase + Railway + Vercel)

Весь проект уже полностью подготовлен к деплою! Вся конфигурация PostgreSQL, Gunicorn, Whitenoise, CORS и Vercel настроена.

---

## 1️⃣ Шаг 1: Заливаем код на GitHub

1. Зайди на [github.com/new](https://github.com/new) и создай новый репозиторий с именем `english-corner`.
2. В терминале в папке проекта выполни команды:
```bash
git remote add origin https://github.com/ВАШ_ЛОГИН_GITHUB/english-corner.git
git branch -M main
git push -u origin main
```

---

## 2️⃣ Шаг 2: Создаем базу данных PostgreSQL в Supabase

1. Зайди на [supabase.com](https://supabase.com) и создай бесплатный проект.
2. Перейди в **Project Settings** ➔ **Database** ➔ скопируй **Connection String (URI)**.
   - Пример: `postgresql://postgres.xxx:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`

---

## 3️⃣ Шаг 3: Деплоим Django Бэкенд на Railway (или Render)

1. Зайди на [railway.app](https://railway.app) ➔ **New Project** ➔ **Deploy from GitHub repo**.
2. Выбери репозиторий `english-corner`.
3. В настройках **Root Directory** укажи: `backend`
4. Добавь Переменные Окружения (**Variables**):
   - `DATABASE_URL`: *(Вставь скопированную ссылку из Supabase)*
   - `SECRET_KEY`: `super-secret-django-key-2026`
   - `DEBUG`: `False`
5. Нажми **Deploy**. Railway автоматически соберет проект через `gunicorn`.
6. В Railway открываешь вкладку **Variables** ➔ скопируй созданный публичный домен бэкенда (например `https://english-corner-production.up.railway.app`).
7. В терминале Railway выполни миграции и создай суперадмина:
```bash
python manage.py migrate
python manage.py createsuperadmin
```

---

## 4️⃣ Шаг 4: Деплоим React Фронтенд на Vercel

1. Зайди на [vercel.com](https://vercel.com) ➔ **Add New Project** ➔ выбери `english-corner`.
2. В настройках **Root Directory** выбери: `frontend`
3. В разделе **Environment Variables** добавь:
   - `VITE_API_BASE_URL`: `https://english-corner-production.up.railway.app/api/v1` *(Ссылка на бэкенд из Railway)*
4. Нажми **Deploy**!

Через 1 минуту твой сайт будет работать в интернете 24/7! 🎉
