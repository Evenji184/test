import { api } from './api';

export const authService = {
  register(payload: { username: string; email: string; password: string }) {
    return api.post('/auth/register', payload).then((res) => res.data);
  },
  login(payload: { email: string; password: string }) {
    return api.post('/auth/login', payload).then((res) => res.data);
  },
  getProfile() {
    return api.get('/auth/me').then((res) => res.data);
  }
};
