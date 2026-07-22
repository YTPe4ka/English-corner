# English Corner Frontend

Modern React + Vite frontend for English Corner language learning platform with three role-based login systems: Student, Teacher, and Admin.

## Features

✅ **Three Role-Based Logins**
- Student: Access learning dashboard with attendance, grades, balance, and enrolled groups
- Teacher: Manage classes, mark attendance, and enter grades
- Admin: Dashboard with system statistics and activity logs

✅ **JWT Authentication**
- Secure token-based authentication with localStorage persistence
- Automatic token refresh
- Protected routes with role-based access control

✅ **Responsive Design**
- Mobile-first design approach
- Gradient backgrounds and modern UI
- Smooth transitions and hover effects

✅ **Real-time Integration**
- Connected to Django backend API
- Parallel data loading with Promise.all
- Error handling and loading states

## Project Structure

```
src/
├── components/
│   └── ProtectedRoute.tsx         # Auth guard for protected pages
├── context/
│   └── AuthContext.tsx             # Global auth state management
├── pages/
│   ├── Landing.tsx                 # Home page with 3 login cards
│   ├── Landing.css
│   ├── Login.tsx                   # Role-specific login forms
│   ├── Login.css
│   ├── StudentDashboard.tsx        # Student stats & groups
│   ├── StudentDashboard.css
│   ├── TeacherDashboard.tsx        # Teacher class management
│   ├── TeacherDashboard.css
│   ├── AdminDashboard.tsx          # Admin system overview
│   └── AdminDashboard.css
├── api/
│   └── index.ts                    # API client wrapper
├── types/
│   └── index.ts                    # TypeScript interfaces
├── App.tsx                         # Route definitions
├── main.tsx                        # App entry point
└── index.css                       # Global styles
```

## Installation & Setup

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Backend API running at `http://localhost:8000`

### Install Dependencies
```bash
cd frontend
npm install
```

### Start Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

## Login Credentials

### Student Demo
- Username: `student1`
- Password: `student123`

### Teacher Demo
- Username: `teacher1`
- Password: `teacher123`

### Admin Demo
- Username: `admin`
- Password: `admin123`

## API Integration

All API calls are managed through `src/api/index.ts`:

```typescript
// Authentication
api.auth.login(username, password, role)
api.auth.logout()
api.auth.getCurrentUser(token)

// Student API
api.student.getGroups(token)
api.student.getAttendance(token)
api.student.getPerformance(token)
api.student.getPayments(token)
api.student.getProfile(token)

// Teacher API
api.teacher.getGroups(token)
api.teacher.getAttendance(token)
api.teacher.createAttendance(data, token)
api.teacher.getPerformance(token)
api.teacher.createPerformance(data, token)
api.teacher.getProfile(token)
```

## State Management

Global auth state is managed through React Context:

```typescript
const { user, accessToken, role, isLoading, login, logout } = useAuth();
```

State persists to localStorage automatically.

## Routes

| Route | Component | Protected | Roles |
|-------|-----------|-----------|-------|
| `/` | Landing | ❌ | All |
| `/login/:role` | Login | ❌ | All |
| `/student/dashboard` | StudentDashboard | ✅ | student |
| `/teacher/dashboard` | TeacherDashboard | ✅ | teacher |
| `/admin/dashboard` | AdminDashboard | ✅ | admin, superadmin |

## Protected Routes

Routes are protected using the `ProtectedRoute` component which checks:
1. User is authenticated (has token)
2. User has the required role

Example:
```tsx
<Route
  path="/student/dashboard"
  element={
    <ProtectedRoute requiredRole="student">
      <StudentDashboard />
    </ProtectedRoute>
  }
/>
```

## Styling

- Global styles: `src/index.css`
- Component styles: Co-located CSS files
- Colors:
  - Primary: `#4a90e2` (Blue)
  - Secondary: `#7c3aed` (Purple - Admin)
  - Success: `#27ae60` (Green)
  - Error: `#e74c3c` (Red)
  - Gradients: `linear-gradient(135deg, #f0f4f8, #d9e8f5)`

## Environment Variables

Create `.env.local` in frontend directory:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Default: `http://localhost:8000/api/v1`

## Development Workflow

1. **Create a new page**: Add `.tsx` file in `src/pages/`
2. **Add styling**: Create corresponding `.css` file
3. **Add routes**: Update `src/App.tsx`
4. **Add types**: Define interfaces in `src/types/index.ts`
5. **Add API calls**: Add methods to `src/api/index.ts`

## Common Tasks

### Add a new role-specific dashboard

1. Create `src/pages/NewRoleDashboard.tsx`
2. Add route in `src/App.tsx`:
```tsx
<Route
  path="/newrole/dashboard"
  element={
    <ProtectedRoute requiredRole="newrole">
      <NewRoleDashboard />
    </ProtectedRoute>
  }
/>
```

### Add a new API endpoint

1. Add method to `src/api/index.ts`
2. Define types in `src/types/index.ts`
3. Call from components using `api.namespace.method()`

### Modify authentication flow

Edit `src/context/AuthContext.tsx` to change login logic or state management.

## Troubleshooting

### "Backend API not responding"
- Ensure Django backend is running: `python manage.py runserver`
- Check API base URL in `.env.local`

### "Token expired" after 2 hours
- Tokens expire by design (security feature)
- Automatic refresh is attempted, if that fails user is redirected to login

### "Protected Route redirects to landing page"
- User not logged in: Go to landing page and log in
- Wrong role: User's role doesn't match required role
- No token in localStorage: Clear storage and log in again

## Performance Optimization

- Lazy loading: Import components with `React.lazy()` when needed
- Code splitting: Vite automatically splits by route
- Image optimization: Use next-gen formats (webp)
- Bundle analysis: `npm run build -- --analyze`

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile: iOS 12+, Android 5+

## Contributing

1. Create a new branch: `git checkout -b feature/feature-name`
2. Make changes and commit: `git commit -m "Add feature"`
3. Push to branch: `git push origin feature/feature-name`
4. Create Pull Request

## License

English Corner © 2024. All rights reserved.

## Support

For issues or questions, contact the development team.
