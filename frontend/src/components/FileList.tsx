import { useEffect, useState } from 'react';
import { SharedFile } from '../pages/DashboardPage';
import { fileService } from '../services/fileService';

export function FileList({ files, onRefresh, currentUserId, isAdmin }: { files: SharedFile[]; onRefresh: () => void; currentUserId?: number; isAdmin?: boolean }) {
  const [message, setMessage] = useState('');

  const getUploaderId = (uploadedBy: SharedFile['uploadedBy']) => {
    if (typeof uploadedBy === 'number') {
      return uploadedBy;
    }

    return uploadedBy?.id;
  };

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
          <li key={file.id} className="file-list-item">
            <div className="file-list-meta">
              <span className="file-name" title={file.originalName}>{file.originalName}</span>
              <small>[{file.spaceType === 'personal' ? '个人空间' : '公共空间'}]</small>
              {file.uploadedBy && typeof file.uploadedBy === 'object' && (
                <small> 上传者：{file.uploadedBy.username}</small>
              )}
            </div>
            <div className="file-actions">
              <button type="button" onClick={() => handleDownload(String(file.id), file.originalName)}>
                下载
              </button>
              {(isAdmin || getUploaderId(file.uploadedBy) === currentUserId) && (
                <button type="button" onClick={() => handleDelete(String(file.id))}>删除</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
