import { Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { AdminLoginChoice } from './pages/AdminLoginChoice';
import { SuperAdminLogin } from './pages/SuperAdminLogin';
import { StudentDashboard } from './pages/StudentDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { GroupDetail } from './pages/GroupDetail';
import StudentDetail from './pages/StudentDetail';
import { TeacherDetail } from './pages/TeacherDetail';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      
      {/* Admin login choice page - shows Admin vs SuperAdmin options */}
      <Route path="/login/admin" element={<AdminLoginChoice />} />
      
      {/* Admin login form */}
      <Route path="/login/admin/form" element={<Login />} />
      
      {/* SuperAdmin 2FA login form */}
      <Route path="/login/superadmin/form" element={<SuperAdminLogin />} />
      
      {/* Other role logins */}
      <Route path="/login/:role" element={<Login />} />
      
      {/* Protected Routes */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute requiredRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute requiredRole="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requiredRole={['admin', 'superadmin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/groups/:id"
        element={
          <ProtectedRoute requiredRole={['admin', 'superadmin']}>
            <GroupDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students/:id"
        element={
          <ProtectedRoute requiredRole={['admin', 'superadmin']}>
            <StudentDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/teachers/:id"
        element={
          <ProtectedRoute requiredRole={['admin', 'superadmin']}>
            <TeacherDetail />
          </ProtectedRoute>
        }
      />
      
      {/* Redirect unknown routes to home */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
