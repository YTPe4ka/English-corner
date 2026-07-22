// Centralized API configuration for local dev and production deployment (Vercel / Railway)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
export const BACKEND_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
