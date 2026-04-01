import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const result =
        mode === 'login'
          ? await authService.login({ email, password })
          : await authService.register({ username, email, password });

      localStorage.setItem('token', result.data.token);
      setMessage(mode === 'login' ? '登录成功' : '注册成功');
      navigate('/');
    } catch (error: any) {
      setMessage(error.response?.data?.error || (mode === 'login' ? '登录失败' : '注册失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-card card">
      <h2>{mode === 'login' ? '登录账号' : '注册账号'}</h2>
      <p className="auth-subtitle">
        {mode === 'login' ? '登录后可查看个人信息并上传文件' : '创建账号后即可开始上传和管理文件'}
      </p>
      <form onSubmit={handleSubmit} className="form">
        {mode === 'register' && (
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" />
        )}
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="邮箱" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" type="password" />
        <button type="submit" disabled={submitting}>
          {submitting ? '提交中...' : mode === 'login' ? '登录' : '注册'}
        </button>
      </form>
      <p className="auth-switch-text">
        {mode === 'login' ? '还没有账号？' : '已有账号？'}
        <button
          type="button"
          className="text-button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? '立即注册' : '去登录'}
        </button>
      </p>
      <p>{message}</p>
    </section>
  );
}
