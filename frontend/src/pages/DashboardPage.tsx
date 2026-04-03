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
  spaceType: 'personal' | 'public';
  uploadedBy?: number | { id: number; username: string; email: string };
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [user, setUser] = useState<{ id: number; username: string; email: string; role: 'user' | 'admin' } | null>(null);
  const [message, setMessage] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [space, setSpace] = useState<'personal' | 'public'>('public');
  const [keyword, setKeyword] = useState('');

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
      authService.logout();
      setUser(null);
      setMessage(error.response?.data?.error || '当前未登录');
      navigate('/login', { replace: true });
    }
  };

  const loadFiles = async () => {
    try {
      const result = await fileService.getFiles({ space, keyword: keyword.trim() || undefined });
      setFiles(result.data);
      setMessage('');
    } catch (error: any) {
      if (error.response?.status === 401) {
        authService.logout();
        navigate('/login', { replace: true });
        return;
      }

      setFiles([]);
      setMessage(error.response?.data?.error || '加载文件失败');
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordError('');
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordSubmitting(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('新密码至少 6 个字符');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }

    if (passwordForm.oldPassword === passwordForm.newPassword) {
      setPasswordError('新密码不能与旧密码相同');
      return;
    }

    try {
      setPasswordSubmitting(true);
      await authService.changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      setMessage('密码修改成功');
      closePasswordModal();
    } catch (error: any) {
      if (error.response?.status === 401) {
        authService.logout();
        navigate('/login', { replace: true });
        return;
      }

      setPasswordError(error.response?.data?.error || '密码修改失败');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  useEffect(() => {
    setShowPasswordModal(false);
    loadProfile();
  }, []);

  useEffect(() => {
    loadFiles();
  }, [space]);

  return (
    <section>
      <div className="card user-card">
        <div>
          <h2>当前用户</h2>
          {user ? <p>{user.username}（{user.email} / {user.role}）</p> : <p>未登录</p>}
          {message && <p className="status-message error-text">{message}</p>}
          {user && (
            <p>
              <button type="button" className="link-button dashboard-link-button" onClick={() => setShowPasswordModal(true)}>
                修改密码
              </button>
            </p>
          )}
          {user?.role === 'admin' && (
            <p>
              <button type="button" className="link-button" onClick={() => navigate('/register')}>注册账号</button>
              <button type="button" className="link-button" onClick={() => navigate('/users')}>账号管理</button>
            </p>
          )}
        </div>
        {user && (
          <button type="button" onClick={handleLogout}>
            退出登录
          </button>
        )}
      </div>
      <div className="card">
        <h2>空间与搜索</h2>
        <div className="form-inline">
          <select value={space} onChange={(e) => setSpace(e.target.value as 'personal' | 'public')}>
            <option value="public">公共空间</option>
            <option value="personal">个人空间</option>
          </select>
          <input
            type="text"
            placeholder="按文件名或后缀搜索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button type="button" onClick={loadFiles}>搜索</button>
        </div>
        {space === 'personal' ? (
          <p className="upload-tip">普通用户仅可查看自己的个人空间文件，管理员可查看所有人的个人空间文件。</p>
        ) : (
          <p className="upload-tip">公共空间文件对所有已登录用户可见。</p>
        )}
      </div>
      <FileUpload onUploaded={loadFiles} />
      <FileList files={files} onRefresh={loadFiles} currentUserId={user?.id} isAdmin={user?.role === 'admin'} />
      {showPasswordModal && (
        <div className="modal-overlay" onClick={closePasswordModal}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
            <h3>修改密码</h3>
            <form className="form" onSubmit={handleChangePassword}>
              <input
                type="password"
                placeholder="旧密码"
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="新密码"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="确认新密码"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
              />
              {passwordError && <p className="status-message error-text">{passwordError}</p>}
              <div className="modal-actions">
                <button type="submit" disabled={passwordSubmitting}>
                  {passwordSubmitting ? '提交中...' : '确认修改'}
                </button>
                <button type="button" className="secondary-button" onClick={closePasswordModal}>
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
