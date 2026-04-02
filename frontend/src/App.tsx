import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RegisterPage } from './pages/RegisterPage';
import { UserManagePage } from './pages/UserManagePage';
import { authService } from './services/authService';

interface CurrentUser {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
}

function ProtectedRoute({ hasToken, loading, children }: { hasToken: boolean; loading: boolean; children: JSX.Element }) {
  if (loading) {
    return <div className="card">加载中...</div>;
  }

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ user, loading, children }: { user: CurrentUser | null; loading: boolean; children: JSX.Element }) {
  if (loading) {
    return <div className="card">加载中...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasToken, setHasToken] = useState(Boolean(localStorage.getItem('token')));
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(hasToken);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setHasToken(Boolean(token));

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        const result = await authService.getProfile();
        setUser(result.data);
      } catch {
        authService.logout();
        setUser(null);
        setHasToken(false);
        if (location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [hasToken, location.pathname, navigate]);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setHasToken(false);
    navigate('/login');
  };

  return (
    <div>
      <header className="header">
        <h1>文件共享系统</h1>
        <nav>
          <Link to="/">首页</Link>
          {user?.role === 'admin' && <Link to="/register">注册账号</Link>}
          {user?.role === 'admin' && <Link to="/users">账号管理</Link>}
          {hasToken ? (
            <button type="button" className="link-button" onClick={handleLogout}>退出登录</button>
          ) : (
            <Link to="/login">登录 / 注册</Link>
          )}
        </nav>
      </header>

      <main className="container">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute hasToken={hasToken} loading={loading}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/register"
            element={
              <AdminRoute user={user} loading={loading}>
                <RegisterPage />
              </AdminRoute>
            }
          />
          <Route
            path="/users"
            element={
              <AdminRoute user={user} loading={loading}>
                <UserManagePage />
              </AdminRoute>
            }
          />
          <Route
            path="*"
            element={
              <ProtectedRoute hasToken={hasToken} loading={loading}>
                <Navigate to="/" replace />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
