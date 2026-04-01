import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { fileService } from '../services/fileService';
import { FileUpload } from '../components/FileUpload';
import { FileList } from '../components/FileList';

export interface SharedFile {
  id: number;
  originalName: string;
  mimetype: string;
  size: number;
  downloads: number;
  createdAt: string;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);
  const [message, setMessage] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const loadProfile = async () => {
    try {
      const result = await authService.getProfile();
      setUser(result.data);
    } catch (error: any) {
      setUser(null);
      setMessage(error.response?.data?.error || '当前未登录');
    }
  };

  const loadFiles = async () => {
    try {
      const result = await fileService.getFiles();
      setFiles(result.data);
      setMessage('');
    } catch (error: any) {
      setFiles([]);
      setMessage(error.response?.data?.error || '加载文件失败');
    }
  };

  useEffect(() => {
    loadProfile();
    loadFiles();
  }, []);

  return (
    <section>
      <div className="card user-card">
        <div>
          <h2>当前用户</h2>
          {user ? <p>{user.username}（{user.email}）</p> : <p>未登录</p>}
          {message && <p className="status-message error-text">{message}</p>}
        </div>
        {user && (
          <button type="button" onClick={handleLogout}>
            退出登录
          </button>
        )}
      </div>
      <FileUpload onUploaded={loadFiles} />
      <FileList files={files} onRefresh={loadFiles} />
    </section>
  );
}
