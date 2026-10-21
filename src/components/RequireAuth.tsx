import { Spin } from 'antd';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Bọc các trang cần đăng nhập. Chưa đăng nhập thì chuyển sang trang đăng nhập và quay lại
 * đúng địa chỉ cũ (kể cả query như ?roomId=...) sau khi đăng nhập xong.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return <>{children}</>;
}
