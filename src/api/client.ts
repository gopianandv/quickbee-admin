import axios from 'axios';
import { getAdminToken } from '@/auth/tokenStore';

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://quickbee-backend.onrender.com';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const t = getAdminToken();
  if (t) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = t.startsWith('Bearer ') ? t : `Bearer ${t}`;
  }
  return config;
});
