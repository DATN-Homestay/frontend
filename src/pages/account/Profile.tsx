import { useEffect, useState } from 'react';
import { Alert, App, Avatar, Button, Card, Descriptions, Form, Input, Popconfirm, Spin, Table, Tabs, Tag, Typography } from 'antd';
import { LaptopOutlined, LockOutlined, SafetyOutlined, UserOutlined } from '@ant-design/icons';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import { describeDevice } from '../../utils/device';
import type { SessionInfo, UserRole } from '../../types/auth';

const { Title, Text } = Typography;

const ROLE_LABEL: Record<UserRole, { text: string; color: string }> = {
  CUSTOMER: { text: 'Khách hàng', color: 'blue' },
  HOST: { text: 'Chủ nhà', color: 'purple' },
  ADMIN: { text: 'Quản trị viên', color: 'red' },
};

const formatTime = (iso: string) => new Date(iso).toLocaleString('vi-VN');

// =========================================================
// TAB 1: THÔNG TIN CÁ NHÂN
// =========================================================

function InfoTab() {
  const { message } = App.useApp();
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const onFinish = async ({ full_name }: { full_name: string }) => {
    setSaving(true);
    try {
      updateUser(await userService.updateProfile(full_name));
      message.success('Đã cập nhật hồ sơ');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Avatar size={72} src={user.avatar_url ?? undefined} icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {user.full_name}
          </Title>
          <div style={{ marginTop: 4 }}>
            {user.roles.map((r) => (
              <Tag key={r} color={ROLE_LABEL[r].color}>
                {ROLE_LABEL[r].text}
              </Tag>
            ))}
          </div>
        </div>
      </div>

      <Descriptions column={1} size="small" bordered style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
        <Descriptions.Item label="Số điện thoại">{user.phone_number ?? <Text type="secondary">Chưa cập nhật</Text>}</Descriptions.Item>
      </Descriptions>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
        Email và số điện thoại dùng để xác thực nên không thể tự thay đổi. Liên hệ hỗ trợ nếu cần đổi.
      </Text>

      <Form
        layout="vertical"
        requiredMark={false}
        initialValues={{ full_name: user.full_name }}
        onFinish={onFinish}
      >
        <Form.Item
          label="Họ và tên"
          name="full_name"
          rules={[
            { required: true, whitespace: true, message: 'Vui lòng nhập họ và tên' },
            { min: 2, max: 100, message: 'Họ tên phải từ 2 đến 100 ký tự' },
          ]}
        >
          <Input size="large" prefix={<UserOutlined />} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>
          Lưu thay đổi
        </Button>
      </Form>
    </div>
  );
}

// =========================================================
// TAB 2: ĐỔI MẬT KHẨU
// =========================================================

interface PasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

function PasswordTab({ onChanged }: { onChanged: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<PasswordForm>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: PasswordForm) => {
    setSaving(true);
    setError(null);
    try {
      const { revoked_sessions } = await userService.changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      form.resetFields();
      message.success(
        revoked_sessions > 0
          ? `Đổi mật khẩu thành công. Đã đăng xuất ${revoked_sessions} thiết bị khác.`
          : 'Đổi mật khẩu thành công.',
      );
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đổi mật khẩu thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <Alert
        type="info"
        showIcon
        icon={<SafetyOutlined />}
        title="Sau khi đổi mật khẩu, mọi thiết bị khác sẽ bị đăng xuất để đảm bảo an toàn. Thiết bị hiện tại được giữ nguyên."
        style={{ marginBottom: 20 }}
      />
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

      <Form<PasswordForm>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={onFinish}
        onValuesChange={() => setError(null)}
      >
        <Form.Item label="Mật khẩu hiện tại" name="current_password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}>
          <Input.Password size="large" prefix={<LockOutlined />} autoComplete="current-password" />
        </Form.Item>

        <Form.Item
          label="Mật khẩu mới"
          name="new_password"
          dependencies={['current_password']}
          hasFeedback
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
            { min: 8, max: 64, message: 'Mật khẩu phải từ 8 đến 64 ký tự' },
            { pattern: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Mật khẩu phải có chữ hoa, chữ thường và chữ số' },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                value && value === getFieldValue('current_password')
                  ? Promise.reject(new Error('Mật khẩu mới phải khác mật khẩu hiện tại'))
                  : Promise.resolve(),
            }),
          ]}
        >
          <Input.Password size="large" prefix={<LockOutlined />} autoComplete="new-password" />
        </Form.Item>

        <Form.Item
          label="Nhập lại mật khẩu mới"
          name="confirm_password"
          dependencies={['new_password']}
          hasFeedback
          rules={[
            { required: true, message: 'Vui lòng nhập lại mật khẩu mới' },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || getFieldValue('new_password') === value
                  ? Promise.resolve()
                  : Promise.reject(new Error('Mật khẩu nhập lại không khớp')),
            }),
          ]}
        >
          <Input.Password size="large" prefix={<LockOutlined />} autoComplete="new-password" />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={saving}>
          Đổi mật khẩu
        </Button>
      </Form>
    </div>
  );
}

// =========================================================
// TAB 3: THIẾT BỊ ĐĂNG NHẬP
// =========================================================

function SessionsTab({ reloadKey }: { reloadKey: number }) {
  const { message } = App.useApp();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  // Tăng lên để tải lại danh sách sau khi thu hồi một phiên
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    userService
      .listSessions()
      .then((data) => {
        if (!cancelled) setSessions(data);
      })
      .catch((err) => {
        if (!cancelled) message.error(err instanceof Error ? err.message : 'Không tải được danh sách thiết bị');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, version, message]);

  const revoke = async (id: string) => {
    setRevokingId(id);
    try {
      await userService.revokeSession(id);
      message.success('Đã đăng xuất thiết bị');
      setVersion((v) => v + 1);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không thể đăng xuất thiết bị');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <Table<SessionInfo>
      rowKey="id"
      loading={loading}
      dataSource={sessions}
      pagination={false}
      scroll={{ x: 640 }}
      locale={{ emptyText: 'Không có thiết bị nào đang đăng nhập' }}
      columns={[
        {
          title: 'Thiết bị',
          dataIndex: 'user_agent',
          render: (ua: string | null, row) => (
            <span>
              <LaptopOutlined style={{ marginRight: 8 }} />
              {describeDevice(ua)}
              {row.is_current && (
                <Tag color="green" style={{ marginLeft: 8 }}>
                  Thiết bị này
                </Tag>
              )}
            </span>
          ),
        },
        { title: 'Địa chỉ IP', dataIndex: 'ip_address', render: (ip: string | null) => ip ?? '—' },
        { title: 'Hoạt động gần nhất', dataIndex: 'last_used_at', render: formatTime },
        { title: 'Đăng nhập lúc', dataIndex: 'created_at', render: formatTime },
        {
          title: '',
          key: 'action',
          align: 'right',
          render: (_, row) =>
            row.is_current ? null : (
              <Popconfirm
                title="Đăng xuất thiết bị này?"
                description="Thiết bị sẽ phải đăng nhập lại."
                okText="Đăng xuất"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={() => revoke(row.id)}
              >
                <Button danger size="small" loading={revokingId === row.id}>
                  Đăng xuất
                </Button>
              </Popconfirm>
            ),
        },
      ]}
    />
  );
}

// =========================================================
// TRANG HỒ SƠ
// =========================================================

export default function ProfilePage() {
  const location = useLocation();
  const { user, initializing } = useAuth();
  const [sessionsReloadKey, setSessionsReloadKey] = useState(0);

  if (initializing) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <Card style={{ maxWidth: 960, margin: '0 auto' }}>
      <Title level={3} style={{ marginTop: 0 }}>
        Hồ sơ của tôi
      </Title>
      <Tabs
        items={[
          { key: 'info', label: 'Thông tin cá nhân', icon: <UserOutlined />, children: <InfoTab /> },
          {
            key: 'password',
            label: 'Đổi mật khẩu',
            icon: <LockOutlined />,
            children: <PasswordTab onChanged={() => setSessionsReloadKey((k) => k + 1)} />,
          },
          {
            key: 'sessions',
            label: 'Thiết bị đăng nhập',
            icon: <LaptopOutlined />,
            children: <SessionsTab reloadKey={sessionsReloadKey} />,
          },
        ]}
      />
    </Card>
  );
}
