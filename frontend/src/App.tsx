import { Routes, Route, Link } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

export default function App() {
  return (
    <div>
      <header className="header">
        <h1>文件共享系统</h1>
        <nav>
          <Link to="/">首页</Link>
          <Link to="/login">登录</Link>
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
