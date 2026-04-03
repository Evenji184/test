import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const result = await authService.login({ email, password });

      localStorage.setItem('token', result.data.token);
      setMessage('登录成功');
      window.location.href = '/';
    } catch (error: any) {
      setMessage(error.response?.data?.error || error.message || '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-card card">
      <h2>登录账号</h2>
      <p className="auth-subtitle">登录后可查看个人信息并上传文件。注册入口仅对管理员开放。</p>
      <form onSubmit={handleSubmit} className="form">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="邮箱" autoComplete="email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" type="password" />
        <button type="submit" disabled={submitting}>
          {submitting ? '提交中...' : '登录'}
        </button>
      </form>
      <p className="auth-switch-text"><Link to="/">返回首页</Link></p>
      <p>{message}</p>
    </section>
  );
}
