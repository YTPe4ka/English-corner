// API types
export interface AuthResponse {
  access: string;
  refresh: string;
  user?: {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface Teacher {
  id: number;
  user: User;
  personal_id: string;
  phone?: string;
  specialization?: string;
  is_active: boolean;
}

export interface Student {
  id: number;
  user: User;
  personal_id: string;
  phone?: string;
  balance: number;
  is_active: boolean;
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  teacher: Teacher | number;
  teacher_detail?: Teacher;
  level: string;
  schedule_type?: 'odd' | 'even';
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  max_students?: number;
  price_per_month?: number;
  students_count: number;
  created_at: string;
}

export interface Attendance {
  id: number;
  student: Student;
  group: Group;
  is_present: boolean;
  date: string;
}

export interface Performance {
  id: number;
  student: Student;
  group: Group;
  grade: number;
  comment?: string;
  assessed_by: Teacher;
  created_at: string;
}

export interface Payment {
  id: number;
  student: Student;
  group: Group;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: string;
}

export type UserRole = 'student' | 'teacher' | 'admin' | 'superadmin' | null;
