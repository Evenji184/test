import { api } from './api';
import { getApiBaseURL } from './api';

interface InitUploadPayload {
  originalName: string;
  mimetype: string;
  size: number;
  totalChunks: number;
  chunkSize: number;
  spaceType: 'personal' | 'public';
  description?: string;
}

interface DownloadOptions {
  onProgress?: (payload: { progress: number; loadedBytes: number; totalBytes: number }) => void;
  signal?: AbortSignal;
  startByte?: number;
}

interface DownloadChunkOptions {
  signal?: AbortSignal;
  startByte: number;
  endByte: number;
  totalBytes?: number;
  onProgress?: (payload: { loadedBytes: number; totalBytes: number; chunkLoadedBytes: number; chunkTotalBytes: number; progress: number }) => void;
}

export const fileService = {
  getFiles(params?: { space?: 'personal' | 'public'; keyword?: string }) {
    return api.get('/files', { params }).then((res) => res.data);
  },
  initUpload(payload: InitUploadPayload) {
    return api.post('/files/upload/init', payload).then((res) => res.data);
  },
  uploadChunk(uploadId: string, chunkIndex: number, chunk: Blob, onProgress?: (progress: number) => void, signal?: AbortSignal) {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', String(chunkIndex));
    formData.append('chunk', chunk, `${uploadId}-${chunkIndex}.part`);

    return api
      .post('/files/upload/chunk', formData, {
        signal,
        timeout: 120000,
        onUploadProgress: (event) => {
          if (!event.total || !onProgress) {
            return;
          }

          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      })
      .then((res) => res.data);
  },
  mergeChunks(uploadId: string) {
    return api.post('/files/upload/merge', { uploadId }).then((res) => res.data);
  },
  cancelUpload(uploadId: string) {
    return api.delete(`/files/upload/${uploadId}`).then((res) => res.data);
  },
  uploadFiles(formData: FormData) {
    return api.post('/files/upload', formData).then((res) => res.data);
  },
  deleteFile(id: string) {
    return api.delete(`/files/${id}`).then((res) => res.data);
  },
  buildDownloadUrl(id: string) {
    const token = localStorage.getItem('token');
    const baseURL = getApiBaseURL();
    const normalizedBaseURL = /^https?:\/\//i.test(baseURL) ? baseURL : `${window.location.origin}${baseURL.startsWith('/') ? '' : '/'}${baseURL}`;
    const downloadUrl = new URL(`files/${id}/download`, normalizedBaseURL.endsWith('/') ? normalizedBaseURL : `${normalizedBaseURL}/`);

    if (token) {
      downloadUrl.searchParams.set('token', token);
    }

    return downloadUrl.toString();
  },
  async downloadFile(id: string, fallbackName?: string, options?: DownloadOptions) {
    const startByte = options?.startByte ?? 0;
    const headers: Record<string, string> = {};

    if (startByte > 0) {
      headers.Range = `bytes=${startByte}-`;
    }

    console.log('[FileService] 发起下载请求', { id, startByte, hasRange: startByte > 0 });
    const response = await api.get(`/files/${id}/download`, {
      responseType: 'blob',
      signal: options?.signal,
      headers,
      onDownloadProgress: (event) => {
        if (!event.total || !options?.onProgress) {
          return;
        }

        const loaded = startByte + event.loaded;
        const total = startByte + event.total;
        options.onProgress({
          progress: Math.round((loaded / total) * 100),
          loadedBytes: loaded,
          totalBytes: total
        });
      }
    });

    const disposition = response.headers['content-disposition'];
    const matchedFileName = disposition?.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const fileName = decodeURIComponent(matchedFileName?.[1] || matchedFileName?.[2] || fallbackName || `file-${id}`);

    return {
      blob: response.data as Blob,
      fileName,
      contentRange: response.headers['content-range'] as string | undefined,
      contentLength: Number(response.headers['content-length'] || 0)
    };
  },
  async downloadFileChunk(id: string, fallbackName: string | undefined, options: DownloadChunkOptions) {
    const headers: Record<string, string> = {
      Range: `bytes=${options.startByte}-${options.endByte}`
    };

    console.log('[FileService] 发起分片下载请求', { id, startByte: options.startByte, endByte: options.endByte });
    const response = await api.get(`/files/${id}/download`, {
      responseType: 'blob',
      signal: options.signal,
      headers,
      onDownloadProgress: (event) => {
        if (!event.total || !options.onProgress) {
          return;
        }

        const totalBytes = options.totalBytes ?? options.endByte + 1;
        const loadedBytes = Math.min(options.startByte + event.loaded, totalBytes);
        options.onProgress({
          loadedBytes,
          totalBytes,
          chunkLoadedBytes: event.loaded,
          chunkTotalBytes: event.total,
          progress: Math.round((loadedBytes / totalBytes) * 100)
        });
      }
    });

    const disposition = response.headers['content-disposition'];
    const matchedFileName = disposition?.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const fileName = decodeURIComponent(matchedFileName?.[1] || matchedFileName?.[2] || fallbackName || `file-${id}`);
    const contentRange = response.headers['content-range'] as string | undefined;
    const totalBytes = Number(contentRange?.split('/')?.[1] || options.totalBytes || response.headers['content-length'] || 0);

    return {
      blob: response.data as Blob,
      fileName,
      contentRange,
      totalBytes,
      startByte: options.startByte,
      endByte: options.endByte
    };
  }
};
