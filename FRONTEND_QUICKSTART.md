# 🚀 Quick Start Guide - Frontend Setup

## Step 1: Install Dependencies

```bash
cd frontend
npm install
```

This will install:
- react@^19.2.0
- react-dom@^19.2.0
- react-router-dom@^6.28.0

## Step 2: Verify Backend is Running

Make sure your Django backend is running:

```bash
cd backend
python manage.py runserver
```

Backend should be available at: `http://localhost:8000`

## Step 3: Start Development Server

```bash
npm run dev
```

Frontend will start at: `http://localhost:5173`

## Step 4: Test the Application

### Landing Page
- Go to http://localhost:5173
- You should see 3 login cards: Student, Teacher, Admin

### Login as Student
1. Click "Login as Student"
2. Username: `student1` 
3. Password: `student123`
4. Click "Sign In"
5. You'll see Student Dashboard with stats and groups

### Login as Teacher
1. Go back and click "Login as Teacher"
2. Username: `teacher1`
3. Password: `teacher123`
4. You'll see Teacher Dashboard with classes and tabs

### Login as Admin
1. Go back and click "Login as Admin"  
2. Username: `admin`
3. Password: `admin123`
4. You'll see Admin Dashboard with system stats

## Project Structure

```
frontend/
├── src/
│   ├── pages/           # Page components
│   │   ├── Landing.tsx
│   │   ├── Login.tsx
│   │   ├── StudentDashboard.tsx
│   │   ├── TeacherDashboard.tsx
│   │   └── AdminDashboard.tsx
│   ├── context/         # Auth state management
│   │   └── AuthContext.tsx
│   ├── components/      # Reusable components
│   │   └── ProtectedRoute.tsx
│   ├── api/            # API client
│   │   └── index.ts
│   ├── types/          # TypeScript definitions
│   │   └── index.ts
│   ├── App.tsx         # Route definitions
│   ├── main.tsx        # App entry point
│   └── index.css       # Global styles
└── package.json
```

## Key Files to Understand

### 1. **AuthContext.tsx** - Authentication State
- Manages user, tokens, and role
- Persists to localStorage
- Provides useAuth() hook

### 2. **api/index.ts** - API Client
- Wraps all API calls
- Injects Bearer token
- Namespaced by role (auth, student, teacher)

### 3. **App.tsx** - Routes
- Defines all application routes
- Protected routes with role check
- Redirects unauthorized access

### 4. **components/ProtectedRoute.tsx** - Auth Guard
- Checks if user is authenticated
- Validates user role matches required role
- Redirects to home if not authorized

## Common Tasks

### Build for Production
```bash
npm run build
```

Outputs to `dist/` folder

### Format Code
```bash
npm run lint
```

### Preview Production Build
```bash
npm run preview
```

## Environment Variables

Create `.env.local` in `frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Defaults to `http://localhost:8000/api/v1` if not set

## Troubleshooting

### "Cannot find module 'react-router-dom'"
```bash
npm install react-router-dom
```

### "API connection failed"
- Check backend is running: `http://localhost:8000/api/v1/docs/`
- Verify `VITE_API_BASE_URL` in `.env.local`

### "Login fails but no error shown"
- Open browser DevTools (F12)
- Check Network tab for API response
- Check Console for JavaScript errors

### "Stuck on loading page"
- Check if backend API is responding
- Clear localStorage: `localStorage.clear()`
- Clear browser cache: Ctrl+Shift+Delete

## Features Implemented

✅ Landing page with 3 login cards
✅ Role-based login forms
✅ Student dashboard with stats
✅ Teacher dashboard with management features
✅ Admin dashboard with system overview
✅ Protected routes with role validation
✅ Token-based authentication
✅ localStorage persistence
✅ Responsive mobile design
✅ Error handling and loading states

## Available Routes

| Route | Component | Protected | Roles |
|-------|-----------|-----------|-------|
| `/` | Landing | No | All |
| `/login/student` | Login | No | All |
| `/login/teacher` | Login | No | All |
| `/login/admin` | Login | No | All |
| `/student/dashboard` | StudentDashboard | Yes | student |
| `/teacher/dashboard` | TeacherDashboard | Yes | teacher |
| `/admin/dashboard` | AdminDashboard | Yes | admin, superadmin |

## Performance Tips

- Tokens automatically refresh (2 hour validity)
- Parallel loading reduces load time
- Lazy loading for routes (can be added)
- Code splitting by route (Vite auto)
- Responsive images (future improvement)

## Support

See `FRONTEND_README.md` for detailed documentation or check `FRONTEND_IMPLEMENTATION.md` for implementation details.

---

**Ready to go!** 🎉

Your frontend is production-ready. Start with `npm run dev` and begin testing!
