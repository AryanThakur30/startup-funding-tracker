/**
 * API Service
 * Centralized API client with authentication handling
 */

import axios from 'axios';

const API_BASE = '/api/v1';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
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

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  register: (data) => apiClient.post('/auth/register', data),
  refresh: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }),
  getMe: () => apiClient.get('/auth/me')
};

// Fundings API
export const fundingsApi = {
  getHistorical: (params = {}) => apiClient.get('/fundings/historical', { params }),
  getLive: (params = {}) => apiClient.get('/fundings/live', { params }),
  filter: (params = {}) => apiClient.get('/fundings/filter', { params }),
  getStats: () => apiClient.get('/fundings/stats'),
  getRecent: (limit = 20) => apiClient.get('/fundings/recent', { params: { limit } }),
  getSectors: () => apiClient.get('/fundings/sectors')
};

// Pipeline API
export const pipelineApi = {
  run: (type = 'live') => apiClient.post('/pipeline/run', { type }),
  getStatus: (limit = 20) => apiClient.get('/pipeline/status', { params: { limit } }),
  getLogs: (params = {}) => apiClient.get('/pipeline/logs', { params }),
  getHealth: () => apiClient.get('/pipeline/health')
};

export default apiClient;
