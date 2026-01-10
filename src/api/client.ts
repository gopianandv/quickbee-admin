import axios from "axios";
import { getAdminToken, clearAdminToken } from "@/auth/tokenStore";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://quickbee-backend.onrender.com";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const t = getAdminToken();

  console.log('[API] baseURL=', config.baseURL);
  console.log('[API] url=', config.url);
  console.log('[API] token exists?', !!t);
  console.log('[API] token prefix=', t?.slice(0, 15));

  if (t) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = t.startsWith("Bearer ") ? t : `Bearer ${t}`;
    console.log('[API] Authorization header set');
  } else {
    console.log('[API] NO token -> no Authorization header');
  }

  return config;
});


api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      // token invalid/expired -> reset and push to login
      clearAdminToken();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);
