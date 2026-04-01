import { useEffect, useState } from 'react';
import { SharedFile } from '../pages/DashboardPage';
import { fileService } from '../services/fileService';

export function FileList({ files, onRefresh }: { files: SharedFile[]; onRefresh: () => void }) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timer = window.setTimeout(() => setMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const handleDownload = async (id: string, originalName: string) => {
    try {
      setMessage('');
      await fileService.downloadFile(id, originalName);
    } catch (error: any) {
      setMessage(error.response?.data?.error || '下载失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setMessage('');
      await fileService.deleteFile(id);
      setMessage('删除成功');
      onRefresh();
    } catch (error: any) {
      setMessage(error.response?.data?.error || '删除失败');
    }
  };

  return (
    <div className="card">
      <h2>文件列表</h2>
      {message && <p className={message === '删除成功' ? 'status-message success-text' : 'status-message error-text'}>{message}</p>}
      <ul className="file-list">
        {files.map((file) => (
          <li key={file.id}>
            <span>{file.originalName}</span>
            <div>
              <button type="button" onClick={() => handleDownload(String(file.id), file.originalName)}>
                下载
              </button>
              <button onClick={() => handleDelete(String(file.id))}>删除</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
