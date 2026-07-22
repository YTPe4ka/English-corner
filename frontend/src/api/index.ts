import { API_BASE_URL } from './config';

interface FetchOptions extends RequestInit {
  token?: string;
}

export const apiCall = async (
  endpoint: string,
  options: FetchOptions = {}
): Promise<any> => {
  const { token, ...fetchOptions } = options;

  const headers = {
    'Content-Type': 'application/json',
    ...(typeof fetchOptions.headers === 'object' && fetchOptions.headers ? fetchOptions.headers : {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
};

// Auth API calls
export const auth = {
  login: (username: string, password: string) =>
    apiCall('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  superAdminLogin: (username: string, password: string) =>
    apiCall('/auth/superadmin/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  superAdminVerify: (user_id: number, code: string) =>
    apiCall('/auth/superadmin/verify/', {
      method: 'POST',
      body: JSON.stringify({ user_id, code }),
    }),

  superAdminResend: (user_id: number) =>
    apiCall('/auth/superadmin/resend/', {
      method: 'POST',
      body: JSON.stringify({ user_id }),
    }),

  refreshToken: (refresh: string) =>
    apiCall('/auth/token/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    }),

  logout: (token: string) =>
    apiCall('/auth/logout/', {
      method: 'POST',
      token,
    }),

  getCurrentUser: (token: string) =>
    apiCall('/auth/me/', {
      token,
    }),
};

// Teacher API calls
export const teacher = {
  getGroups: (token: string) =>
    apiCall('/teacher/groups/', { token }),

  getAttendance: (token: string) =>
    apiCall('/teacher/attendance/', { token }),

  createAttendance: (token: string, data: any) =>
    apiCall('/teacher/attendance/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  getPerformance: (token: string) =>
    apiCall('/teacher/performance/', { token }),

  createPerformance: (token: string, data: any) =>
    apiCall('/teacher/performance/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  getProfile: (token: string) =>
    apiCall('/teacher/profile/', { token }),
};

// Student API calls
export const student = {
  getGroups: (token: string) =>
    apiCall('/student/groups/', { token }),

  getAttendance: (token: string) =>
    apiCall('/student/attendance/', { token }),

  getPerformance: (token: string) =>
    apiCall('/student/performance/', { token }),

  getPayments: (token: string) =>
    apiCall('/student/payments/', { token }),

  getProfile: (token: string) =>
    apiCall('/student/profile/', { token }),
};
