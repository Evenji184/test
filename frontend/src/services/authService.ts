import { api } from './api';

export const authService = {
  login(payload: { email: string; password: string }) {
    return api.post('/auth/login', payload).then((res) => res.data);
  }
};
