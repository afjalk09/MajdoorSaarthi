import axios from 'axios';

// Dev: VITE_ASSET_URL is blank, so '/api' is used and the Vite proxy forwards to
// the backend. Production (Vercel static host + Render API) has no proxy, so the
// backend origin must be absolute - otherwise every request 404s on the CDN host.
const ASSET_BASE = (import.meta.env.VITE_ASSET_URL || '').replace(/\/$/, '');

const api = axios.create({
  baseURL: ASSET_BASE ? `${ASSET_BASE}/api` : '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
