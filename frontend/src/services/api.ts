import axios from 'axios';

const defaultBaseURL = `${window.location.protocol}//${window.location.hostname}:5000/api`;
const devBaseURL = '/api';
const configuredBaseURL = import.meta.env.VITE_API_BASE_URL?.trim();

const getBaseURL = () => {
  if (configuredBaseURL) {
    return configuredBaseURL;
  }

  if (import.meta.env.DEV) {
    return devBaseURL;
  }

  return defaultBaseURL;
};

export const getApiBaseURL = () => getBaseURL();

export const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  timeout: 60000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }

    return Promise.reject(error);
  }
);
