import { useState } from 'react';
import { authService } from '../services/authService';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await authService.login({ email, password });
      localStorage.setItem('token', result.data.token);
      setMessage('登录成功');
    } catch (error) {
      setMessage('登录失败');
    }
  };

  return (
    <section className="card">
      <h2>登录</h2>
      <form onSubmit={handleSubmit} className="form">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="邮箱" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" type="password" />
        <button type="submit">登录</button>
      </form>
      <p>{message}</p>
    </section>
  );
}
