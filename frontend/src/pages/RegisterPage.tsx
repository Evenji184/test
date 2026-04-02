import { useState } from 'react';
import { authService } from '../services/authService';

export function RegisterPage() {
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
      await authService.register({ username, email, password });
      setMessage('注册成功');
      setUsername('');
      setEmail('');
      setPassword('');
      window.setTimeout(() => {
        window.location.href = '/users';
      }, 800);
    } catch (error: any) {
      setMessage(error.response?.data?.error || '注册失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-card card">
      <h2>注册账号</h2>
      <p className="auth-subtitle">仅管理员可创建新账号，注册时会同时校验用户名和邮箱唯一性。</p>
      <form onSubmit={handleSubmit} className="form">
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="邮箱" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" type="password" />
        <button type="submit" disabled={submitting}>
          {submitting ? '提交中...' : '创建账号'}
        </button>
      </form>
      <p>{message}</p>
    </section>
  );
}
