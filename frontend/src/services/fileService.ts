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
  async downloadFile(id: string, fallbackName?: string) {
    const response = await api.get(`/files/${id}/download`, {
      responseType: 'blob'
    });

    const disposition = response.headers['content-disposition'];
    const matchedFileName = disposition?.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const fileName = decodeURIComponent(matchedFileName?.[1] || matchedFileName?.[2] || fallbackName || `file-${id}`);
    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');

    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  }
};
