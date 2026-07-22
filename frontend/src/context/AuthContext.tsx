import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api/config';
import type { AuthResponse, User, UserRole } from '../types/index';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  role: UserRole;
  isLoading: boolean;
  login: (username: string, password: string, role: Exclude<UserRole, null>) => Promise<void>;
  logout: () => void;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: User) => void;
  syncFromStorage: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore from localStorage on mount
  useEffect(() => {
    const savedAccessToken = localStorage.getItem('accessToken');
    const savedRefreshToken = localStorage.getItem('refreshToken');
    const savedUser = localStorage.getItem('user');
    const savedRole = (localStorage.getItem('role') || null) as UserRole | null;

    const normalizeRole = (r: string | null) => {
      if (!r) return null;
      if (r === 'super_admin') return 'superadmin';
      return r as UserRole;
    };

    if (savedAccessToken && savedUser) {
      setAccessToken(savedAccessToken);
      setRefreshToken(savedRefreshToken);
      setUser(JSON.parse(savedUser));
      const normalized = normalizeRole(savedRole);
      setRole(normalized);
      console.log('[AuthContext] Restored from localStorage:', { savedRole, normalized, path: window.location.pathname });
    } else {
      console.log('[AuthContext] No tokens in localStorage');
    }

    setIsLoading(false);
  }, []);

  // router navigate
  const navigate = useNavigate();

  const parseJwt = (token: string | null) => {
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return decoded;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    if (!accessToken) {
      console.log('[AuthContext redirect] No access token, skipping redirect');
      return;
    }

    console.log('[AuthContext redirect] Has access token, checking redirect. Path:', window.location.pathname, 'Role:', role);

    // determine role: prefer stored role, fall back to token payload
    let effectiveRole = role;
    if (!effectiveRole) {
      const payload = parseJwt(accessToken);
      console.log('[AuthContext redirect] No stored role, parsed JWT:', { payload });
      if (payload) {
        // common claim names: role, user.role, is_superuser
        if (payload.role) effectiveRole = payload.role;
        else if (payload.user && payload.user.role) effectiveRole = payload.user.role;
        else if (payload.is_superuser) effectiveRole = 'superadmin';
        else if (payload.is_staff) effectiveRole = 'admin';
      }
    }

    if (effectiveRole) {
      console.log('[AuthContext redirect] Effective role:', effectiveRole);
      // normalize possible variants
      const norm = (r: string) => (r === 'super_admin' ? 'superadmin' : r);
      const rolePath: Record<string, string> = {
        student: '/student/dashboard',
        teacher: '/teacher/dashboard',
        admin: '/admin/dashboard',
        superadmin: '/admin/dashboard',
      };

      const target = rolePath[norm(effectiveRole as string)];
      const shouldRedirect = target && (window.location.pathname === '/' || window.location.pathname === '/login' || window.location.pathname === '');
      console.log('[AuthContext redirect] Should redirect?', { target, shouldRedirect, path: window.location.pathname });
      if (shouldRedirect) {
        console.log('[AuthContext redirect] Navigating to:', target);
        navigate(target);
      }
    }

    // setup logout timer at token expiry
    const payload = parseJwt(accessToken);
    if (payload && payload.exp) {
      const expiresAt = payload.exp * 1000;
      const ms = expiresAt - Date.now();
      console.log('[AuthContext expiry] Token expires in:', ms, 'ms');
      if (ms <= 0) {
        logout();
        // send to login
        const loginPath = (role === 'admin' || role === 'superadmin') ? '/login/admin' : `/login/${role || 'student'}`;
        navigate(loginPath);
      } else {
        const t = setTimeout(() => {
          console.log('[AuthContext expiry] Token expired, logging out');
          logout();
          const loginPath = (role === 'admin' || role === 'superadmin') ? '/login/admin' : `/login/${role || 'student'}`;
          navigate(loginPath);
        }, ms);
        return () => clearTimeout(t);
      }
    }
  }, [accessToken, role, navigate]);

  // Listen for storage changes from other windows/tabs
  useEffect(() => {
    const handleStorageChange = () => {
      const savedAccessToken = localStorage.getItem('accessToken');
      const savedRefreshToken = localStorage.getItem('refreshToken');
      const savedUser = localStorage.getItem('user');
      const savedRoleRaw = (localStorage.getItem('role') || null) as UserRole | null;
      const normalizeRole = (r: string | null) => {
        if (!r) return null;
        if (r === 'super_admin') return 'superadmin';
        return r as UserRole;
      };

      if (savedAccessToken && savedUser) {
        setAccessToken(savedAccessToken);
        setRefreshToken(savedRefreshToken);
        setUser(JSON.parse(savedUser));
        setRole(normalizeRole(savedRoleRaw));
      } else {
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
        setRole(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (username: string, password: string, selectedRole: Exclude<UserRole, null>) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data: AuthResponse = await response.json();

      setAccessToken(data.access);
      setRefreshToken(data.refresh);
      setUser(data.user || { id: 0, username, email: '' });
      // normalize and store role consistently
      const normalizeRole = (r: string) => (r === 'super_admin' ? 'superadmin' : r);
      const storedRole = normalizeRole(selectedRole as string);

      setRole(storedRole as UserRole);

      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('role', storedRole);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setRole(null);

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
  };

  const setTokensFunc = (access: string, refresh: string) => {
    setAccessToken(access);
    setRefreshToken(refresh);
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  };

  const setUserFunc = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const syncFromStorage = () => {
    const savedAccessToken = localStorage.getItem('accessToken');
    const savedRefreshToken = localStorage.getItem('refreshToken');
    const savedUser = localStorage.getItem('user');
    const savedRole = localStorage.getItem('role') as UserRole;

    if (savedAccessToken && savedUser) {
      setAccessToken(savedAccessToken);
      setRefreshToken(savedRefreshToken);
      setUser(JSON.parse(savedUser));
      setRole(savedRole);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        role,
        isLoading,
        login,
        logout,
        setTokens: setTokensFunc,
        setUser: setUserFunc,
        syncFromStorage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
