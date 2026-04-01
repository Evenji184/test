import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

export default function App() {
  const navigate = useNavigate();
  const hasToken = Boolean(localStorage.getItem('token'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div>
      <header className="header">
        <h1>文件共享系统</h1>
        <nav>
          <Link to="/">首页</Link>
          {hasToken ? (
            <button type="button" className="link-button" onClick={handleLogout}>
              退出登录
            </button>
          ) : (
            <Link to="/login">登录 / 注册</Link>
          )}
        </nav>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>
    </div>
  );
}
