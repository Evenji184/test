import { api } from './api';

export interface ManagedUser {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  lastLogin: string | null;
}

export const userService = {
  getUsers() {
    return api.get('/users').then((res) => res.data);
  },
  updateUserRole(id: number, role: 'user' | 'admin') {
    return api.put(`/users/${id}`, { role }).then((res) => res.data);
  }
};
