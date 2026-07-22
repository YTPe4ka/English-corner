# 🎯 Complete Setup Guide - English Corner Platform

## Prerequisites

Before starting, ensure you have:
- Node.js v16+ (for frontend)
- Python 3.8+ (for backend)
- pip (Python package manager)
- Git (for version control)
- Text editor (VS Code recommended)

## Part 1: Backend Setup (Django)

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Create & Activate Virtual Environment
```bash
# Windows
python -m venv venv_new
venv_new\Scripts\activate

# macOS/Linux
python3 -m venv venv_new
source venv_new/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

Expected packages:
- Django 5.2
- Django REST Framework
- PyJWT
- python-decouple
- django-cors-headers
- Pillow
- python-docx

### Step 4: Apply Migrations
```bash
python manage.py migrate
```

Expected output:
```
Operations to perform:
  Apply all migrations: admin, auth, configapp, contenttypes, sessions
Running migrations:
  Applying configapp.0001_initial... OK
  Applying configapp.0002_... OK
  Applying configapp.0003_... OK
```

### Step 5: Create SuperAdmin User
```bash
python manage.py createsuperadmin
```

Or use the provided credentials:
- Email: superadmin@englishcorner.com
- Password: superadmin@englishcorner.com

### Step 6: Run Development Server
```bash
python manage.py runserver
```

Expected output:
```
Django version 5.2, using settings 'config.settings'
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

### Step 7: Verify Backend is Running
Visit these URLs in your browser:
- Main page: http://127.0.0.1:8000/ (should show Django info)
- API docs: http://127.0.0.1:8000/api/docs/ (Swagger UI)
- API list: http://127.0.0.1:8000/api/v1/auth/login/ (should show 405 Method Not Allowed)

---

## Part 2: Frontend Setup (React)

### Step 1: Open New Terminal (Keep Backend Running)

### Step 2: Navigate to Frontend Directory
```bash
cd frontend
```

### Step 3: Install Dependencies
```bash
npm install
```

Expected output:
```
added 200 packages in 15s
```

### Step 4: Create Environment File (Optional)
Create `.env.local` in `frontend/` directory:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

If not created, defaults will be used.

### Step 5: Start Development Server
```bash
npm run dev
```

Expected output:
```
  VITE v7.2.4  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### Step 6: Open in Browser
Visit: http://localhost:5173/

You should see the Landing Page with three login cards:
- **Login as Student**
- **Login as Teacher**
- **Login as Admin**

---

## Part 3: Testing the Application

### Test 1: Student Login Flow

1. **Go to Frontend**
   - URL: http://localhost:5173/

2. **Click "Login as Student"**
   - You'll be redirected to: http://localhost:5173/login/student

3. **Enter Student Credentials**
   - Username: `student1`
   - Password: `student123`

4. **Click "Sign In"**
   - System will authenticate with backend
   - On success: Redirected to http://localhost:5173/student/dashboard

5. **Verify Student Dashboard**
   - Should display:
     - Your username in header
     - Attendance card with stats
     - Grades card with average
     - Balance card with current balance
     - Groups card with enrolled classes

6. **Test Logout**
   - Click "Logout" button (top right)
   - Should return to landing page

### Test 2: Teacher Login Flow

1. **Click "Login as Teacher"**
   - URL: http://localhost:5173/login/teacher

2. **Enter Teacher Credentials**
   - Username: `teacher1`
   - Password: `teacher123`

3. **Verify Teacher Dashboard**
   - Should display:
     - Teacher username in header
     - Three tabs: Overview, Attendance, Grades
     - My Classes section showing assigned groups
     - Quick stats (classes, records, grades)

### Test 3: Admin Login Flow

1. **Click "Login as Admin"**
   - URL: http://localhost:5173/login/admin

2. **Enter Admin Credentials**
   - Username: `admin`
   - Password: `admin123`

3. **Verify Admin Dashboard**
   - Should display:
     - Admin badge in header
     - Two tabs: Overview, Activity Logs
     - 6 stat cards:
       - Total Users
       - Teachers count
       - Students count
       - Groups count
       - Revenue
       - Conversion rate
     - Quick action buttons

### Test 4: Protected Routes

1. **Try to Access Dashboard Without Login**
   - Type in browser: http://localhost:5173/student/dashboard
   - Should redirect to: http://localhost:5173/

2. **Try to Access Wrong Role Dashboard**
   - Login as Student
   - Type in browser: http://localhost:5173/teacher/dashboard
   - Should redirect to: http://localhost:5173/

3. **Token Expiry**
   - Wait 2 hours (or manually delete localStorage tokens)
   - Try to navigate to dashboard
   - Should redirect to login

### Test 5: API Integration

1. **Open Browser DevTools**
   - Press F12
   - Go to Network tab

2. **Login and Watch Requests**
   - Login to student
   - Watch API calls:
     - POST /api/v1/auth/login/
     - GET /api/v1/student/groups/
     - GET /api/v1/student/attendance/
     - GET /api/v1/student/performance/
     - GET /api/v1/student/payments/

3. **Check Bearer Token**
   - Click on any API request
   - Check Headers
   - Should see: `Authorization: Bearer {token}`

4. **Monitor Error Handling**
   - Disable internet temporarily
   - Try to load dashboard
   - Should show error message

---

## Troubleshooting Guide

### Issue: "Cannot find module 'react-router-dom'"

**Solution:**
```bash
cd frontend
npm install react-router-dom
```

### Issue: "Port 5173 already in use"

**Solution:**
```bash
# Kill process using port 5173
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :5173
kill -9 <PID>
```

### Issue: "Port 8000 already in use"

**Solution:**
```bash
# Run on different port
python manage.py runserver 8001
# Update frontend .env.local:
VITE_API_BASE_URL=http://localhost:8001/api/v1
```

### Issue: "API connection failed"

**Debugging:**
1. Check backend is running: `python manage.py runserver`
2. Check API URL in .env.local or App.tsx
3. Check network tab in DevTools
4. Check Django console for errors

### Issue: "Login fails with blank error"

**Debugging:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Check for JavaScript errors
4. Check Network tab for response
5. Look at response details

### Issue: "Database migration error"

**Solution:**
```bash
# Check migration status
python manage.py showmigrations

# If stuck, reset (for development only)
python manage.py migrate configapp zero
python manage.py migrate
```

### Issue: "Stuck on Loading page"

**Debugging:**
1. Check if backend is running
2. Check browser console for errors
3. Open DevTools → Network tab
4. Refresh page and watch network requests
5. Check if API responses are successful

### Issue: "localStorage not persisting tokens"

**Solution:**
1. Clear browser cache: Ctrl+Shift+Delete
2. Allow localStorage: Check browser privacy settings
3. Check DevTools → Application → localStorage
4. Verify tokens are being saved

---

## Common Commands

### Backend
```bash
# Navigate to backend
cd backend

# Activate virtual environment
source venv_new/bin/activate  # macOS/Linux
venv_new\Scripts\activate      # Windows

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperadmin

# Start development server
python manage.py runserver

# Run tests
python manage.py test

# Create new migration
python manage.py makemigrations

# Check migration status
python manage.py showmigrations
```

### Frontend
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Format code
npx prettier --write src/**/*.tsx
```

---

## File Locations Reference

### Backend Important Files
```
backend/
├── manage.py              # Django management
├── db.sqlite3            # Database file
├── requirements.txt      # Python dependencies
├── config/
│   ├── settings.py      # Django settings
│   ├── urls.py          # URL routing
│   └── wsgi.py          # Production server
├── configapp/
│   ├── models.py        # Database models
│   ├── views.py         # API views
│   ├── serializers.py   # Data serializers
│   ├── permissions.py   # Permission classes
│   └── urls.py          # App routes
└── migrations/          # Database migrations
```

### Frontend Important Files
```
frontend/
├── package.json         # Dependencies
├── src/
│   ├── main.tsx        # Entry point
│   ├── App.tsx         # Routes
│   ├── index.css       # Global styles
│   ├── pages/          # Page components
│   ├── context/        # Auth state
│   ├── components/     # Reusable components
│   ├── api/            # API client
│   └── types/          # TypeScript types
├── index.html          # HTML template
├── vite.config.ts      # Vite config
└── tsconfig.json       # TypeScript config
```

---

## Environment Variables

### Backend (.env or settings.py)
```
DEBUG=True              # False in production
ALLOWED_HOSTS=localhost,127.0.0.1
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///db.sqlite3
EMAIL_BACKEND=console.EmailBackend  # For development
```

### Frontend (.env.local)
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## Performance Optimization

### Frontend
```bash
# Build for production
npm run build

# Check bundle size
npm run build -- --analyze

# Output to dist/ folder
# Ready for deployment
```

### Backend
```bash
# Collect static files (production)
python manage.py collectstatic

# Create production settings
# Set DEBUG=False
# Use production database
# Configure allowed hosts
```

---

## Next Steps After Setup

### Immediate
1. ✅ Test all three login flows
2. ✅ Verify all dashboards load
3. ✅ Check responsive design on mobile
4. ✅ Test token refresh after 2 hours

### Short Term
- [ ] Run all tests
- [ ] Set up Git repository
- [ ] Create deployment checklist
- [ ] Document API changes

### Long Term
- [ ] Deploy to production
- [ ] Set up CI/CD pipeline
- [ ] Configure monitoring
- [ ] Plan scaling strategy

---

## Getting Help

### Documentation Files
- `FRONTEND_README.md` - Frontend guide
- `FRONTEND_QUICKSTART.md` - Quick setup
- `FRONTEND_IMPLEMENTATION.md` - Implementation details
- `ARCHITECTURE.md` - System design
- Backend docs in `backend/` folder

### API Documentation
- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/
- OpenAPI JSON: http://localhost:8000/api/schema/

### Browser DevTools
- Network tab: Monitor API calls
- Console: Check JavaScript errors
- Application: Inspect localStorage
- Elements: Debug HTML structure

---

## Deployment Checklist

Before deploying to production:

- [ ] Update DEBUG=False in Django settings
- [ ] Set strong SECRET_KEY
- [ ] Configure ALLOWED_HOSTS
- [ ] Use production database (PostgreSQL)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Run collectstatic
- [ ] Update frontend .env for production API
- [ ] Run npm run build
- [ ] Test thoroughly on staging
- [ ] Set up monitoring and logging
- [ ] Create backup strategy
- [ ] Document deployment process

---

## Support

For issues or questions:
1. Check troubleshooting section
2. Review documentation files
3. Check browser console (F12)
4. Check network requests (DevTools)
5. Review Django/Node logs

---

**Status:** ✅ Ready to Setup and Deploy!

**Estimated Time:** 15 minutes (npm install + backend setup)

Generated: 2024
Version: 1.0.0
