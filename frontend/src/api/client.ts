import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 120000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);
