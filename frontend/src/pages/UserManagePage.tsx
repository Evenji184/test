import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService, type ManagedUser } from '../services/userService';

export function UserManagePage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await userService.getUsers();
      setUsers(result.data);
      setMessage('');
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login', { replace: true });
        return;
      }

      setMessage(error.response?.data?.error || '加载账号列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (id: number, role: 'user' | 'admin') => {
    try {
      await userService.updateUserRole(id, role);
      setMessage('角色更新成功');
      await loadUsers();
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login', { replace: true });
        return;
      }

      setMessage(error.response?.data?.error || '角色更新失败');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <section className="card">
      <h2>账号管理</h2>
      <p className="auth-subtitle">仅管理员可访问，用于查看账号并调整管理员分组。</p>
      {message && <p className="status-message">{message}</p>}
      {loading ? (
        <p>加载中...</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>创建时间</th>
                <th>最后登录</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as 'user' | 'admin')}
                      disabled={user.username === 'evenji'}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleString()}</td>
                  <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '从未登录'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
