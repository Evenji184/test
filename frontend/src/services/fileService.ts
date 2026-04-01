import { api } from './api';

export const fileService = {
  getFiles() {
    return api.get('/files').then((res) => res.data);
  },
  uploadFiles(formData: FormData) {
    return api.post('/files/upload', formData).then((res) => res.data);
  },
  deleteFile(id: string) {
    return api.delete(`/files/${id}`).then((res) => res.data);
  },
  getDownloadUrl(id: string) {
    return `http://localhost:5000/api/files/${id}/download`;
  }
};
