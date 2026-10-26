import {
  Table, Tag, Button, Space, Input, Select, Modal, Form, message, Tooltip,
  Card, Row, Col, Statistic, Drawer, Descriptions, Badge, Popconfirm, Typography,
} from 'antd';
import {
  SearchOutlined, PlusOutlined, UserOutlined, LockOutlined,
  UnlockOutlined, DeleteOutlined, EditOutlined, EyeOutlined,
  TeamOutlined, CheckCircleOutlined, StopOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import { adminService } from '../../services/adminService';
import type { AdminUserItem, AdminUserDetail, AdminListUsersQuery } from '../../services/adminService';

const { Title, Text } = Typography;

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: 'success', label: 'Hoạt động' },
  SUSPENDED: { color: 'warning', label: 'Tạm khóa' },
  BANNED: { color: 'error', label: 'Cấm' },
};

const ROLE_MAP: Record<string, { color: string }> = {
  ADMIN: { color: 'purple' },
  HOST: { color: 'blue' },
  CUSTOMER: { color: 'green' },
};

export default function UsersPage() {
  const [data, setData] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();

  // Drawer chi tiết
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modal tạo user
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm();

  // Modal đổi role
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleForm] = Form.useForm();
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, suspended: 0, banned: 0 });

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const query: AdminListUsersQuery = {
        page,
        limit: pagination.limit,
        search: searchText || undefined,
        role: filterRole,
        status: filterStatus,
        sort_by: 'created_at',
        sort_order: 'DESC',
      };
      const res = await adminService.listUsers(query);
      setData(res.items);
      setPagination((prev) => ({ ...prev, page: res.pagination.page, total: res.pagination.total }));

      // Cập nhật stats từ tổng
      if (page === 1 && !searchText && !filterRole && !filterStatus) {
        setStats({
          total: res.pagination.total,
          active: res.items.filter((u) => u.status === 'ACTIVE').length,
          suspended: res.items.filter((u) => u.status === 'SUSPENDED').length,
          banned: res.items.filter((u) => u.status === 'BANNED').length,
        });
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, searchText, filterRole, filterStatus]);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  // Xem chi tiết
  const handleViewDetail = async (userId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await adminService.getUserDetail(userId);
      setDetailData(res);
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi tải chi tiết người dùng');
    } finally {
      setDetailLoading(false);
    }
  };

  // Tạo user
  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreateLoading(true);
      await adminService.createUser(values);
      message.success('Tạo người dùng mới thành công!');
      setCreateOpen(false);
      createForm.resetFields();
      fetchUsers(1);
    } catch (err: any) {
      if (err.message) message.error(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // Đổi trạng thái
  const handleChangeStatus = async (userId: string, newStatus: string, reason?: string) => {
    try {
      await adminService.updateUserStatus(userId, newStatus, reason);
      message.success(`Đã cập nhật trạng thái thành ${STATUS_MAP[newStatus]?.label ?? newStatus}`);
      fetchUsers(pagination.page);
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  // Đổi role
  const handleOpenRoleModal = (user: AdminUserItem) => {
    setEditingUser(user);
    roleForm.setFieldsValue({ roles: user.roles });
    setRoleOpen(true);
  };

  const handleUpdateRoles = async () => {
    if (!editingUser) return;
    try {
      const values = await roleForm.validateFields();
      setRoleLoading(true);
      await adminService.updateUserRoles(editingUser.id, values.roles);
      message.success('Cập nhật role thành công!');
      setRoleOpen(false);
      fetchUsers(pagination.page);
    } catch (err: any) {
      if (err.message) message.error(err.message);
    } finally {
      setRoleLoading(false);
    }
  };

  // Xóa user
  const handleDelete = async (userId: string) => {
    try {
      const res = await adminService.deleteUser(userId);
      message.success(res.message || 'Đã xóa người dùng');
      fetchUsers(pagination.page);
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi xóa người dùng');
    }
  };

  const columns = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_: any, record: AdminUserItem) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 600, fontSize: 14,
          }}>
            {record.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{record.full_name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'SĐT',
      dataIndex: 'phone_number',
      render: (v: string | null) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Vai trò',
      dataIndex: 'roles',
      render: (roles: string[]) => (
        <Space size={4} wrap>
          {roles.map((role) => (
            <Tag key={role} color={ROLE_MAP[role]?.color ?? 'default'}>{role}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status: string) => {
        const info = STATUS_MAP[status] ?? { color: 'default', label: status };
        return <Badge status={info.color as any} text={info.label} />;
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      render: (v: string) => v ? new Date(v).toLocaleDateString('vi-VN') : '—',
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 200,
      render: (_: any, record: AdminUserItem) => (
        <Space size={4}>
          <Tooltip title="Xem chi tiết">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record.id)} />
          </Tooltip>
          <Tooltip title="Đổi role">
            <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenRoleModal(record)} />
          </Tooltip>
          {record.status === 'ACTIVE' ? (
            <Tooltip title="Khóa tài khoản">
              <Popconfirm
                title="Khóa tài khoản này?"
                description="Người dùng sẽ không thể đăng nhập"
                onConfirm={() => handleChangeStatus(record.id, 'SUSPENDED', 'Vi phạm quy định')}
              >
                <Button size="small" danger icon={<LockOutlined />} />
              </Popconfirm>
            </Tooltip>
          ) : record.status === 'SUSPENDED' ? (
            <Tooltip title="Mở khóa">
              <Button size="small" type="primary" icon={<UnlockOutlined />}
                onClick={() => handleChangeStatus(record.id, 'ACTIVE')} />
            </Tooltip>
          ) : null}
          <Tooltip title="Xóa">
            <Popconfirm
              title="Xác nhận xóa người dùng?"
              description="Hành động này không thể hoàn tác"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <TeamOutlined style={{ marginRight: 8 }} />
          Quản lý Người dùng
        </Title>
        <Text type="secondary">Quản lý toàn bộ tài khoản người dùng, cập nhật trạng thái và phân quyền</Text>
      </div>

      {/* STATS */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, borderLeft: '4px solid #6366f1' }}>
            <Statistic title="Tổng users" value={stats.total} prefix={<TeamOutlined />}
              valueStyle={{ color: '#6366f1', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, borderLeft: '4px solid #10b981' }}>
            <Statistic title="Hoạt động" value={stats.active} prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#10b981', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, borderLeft: '4px solid #f59e0b' }}>
            <Statistic title="Tạm khóa" value={stats.suspended} prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#f59e0b', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, borderLeft: '4px solid #ef4444' }}>
            <Statistic title="Bị cấm" value={stats.banned} prefix={<StopOutlined />}
              valueStyle={{ color: '#ef4444', fontWeight: 700 }} />
          </Card>
        </Col>
      </Row>

      {/* FILTER BAR */}
      <Card style={{ borderRadius: 14, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
          <Space wrap>
            <Input
              placeholder="Tìm theo tên, email, SĐT"
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 260 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={() => fetchUsers(1)}
            />
            <Select
              placeholder="Lọc vai trò"
              allowClear
              style={{ width: 150 }}
              value={filterRole}
              onChange={(v) => setFilterRole(v)}
              options={[
                { value: 'CUSTOMER', label: 'Customer' },
                { value: 'HOST', label: 'Host' },
                { value: 'ADMIN', label: 'Admin' },
              ]}
            />
            <Select
              placeholder="Trạng thái"
              allowClear
              style={{ width: 150 }}
              value={filterStatus}
              onChange={(v) => setFilterStatus(v)}
              options={[
                { value: 'ACTIVE', label: 'Hoạt động' },
                { value: 'SUSPENDED', label: 'Tạm khóa' },
                { value: 'BANNED', label: 'Bị cấm' },
              ]}
            />
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}>
            Tạo người dùng
          </Button>
        </div>
      </Card>

      {/* TABLE */}
      <Card style={{ borderRadius: 14 }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} người dùng`,
            onChange: (p, size) => {
              setPagination((prev) => ({ ...prev, limit: size ?? 10 }));
              fetchUsers(p);
            },
          }}
        />
      </Card>

      {/* DRAWER CHI TIẾT */}
      <Drawer
        title="Chi tiết Người dùng"
        width={520}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailData(null); }}
        loading={detailLoading}
      >
        {detailData && (
          <div>
            <div style={{
              textAlign: 'center', padding: '20px 0', marginBottom: 20,
              background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)', borderRadius: 12,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 12px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 28, fontWeight: 700,
              }}>
                {detailData.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <Title level={4} style={{ margin: 0 }}>{detailData.full_name}</Title>
              <Space style={{ marginTop: 8 }}>
                {detailData.roles.map((r) => (
                  <Tag key={r} color={ROLE_MAP[r]?.color ?? 'default'}>{r}</Tag>
                ))}
                <Badge status={(STATUS_MAP[detailData.status]?.color ?? 'default') as any}
                  text={STATUS_MAP[detailData.status]?.label ?? detailData.status} />
              </Space>
            </div>

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="ID">{detailData.id}</Descriptions.Item>
              <Descriptions.Item label="Email">{detailData.email}</Descriptions.Item>
              <Descriptions.Item label="SĐT">{detailData.phone_number || '—'}</Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {new Date(detailData.created_at).toLocaleString('vi-VN')}
              </Descriptions.Item>
              <Descriptions.Item label="Số homestay">{detailData.homestays_count}</Descriptions.Item>
              <Descriptions.Item label="Số booking">{detailData.bookings_count}</Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Drawer>

      {/* MODAL TẠO USER */}
      <Modal
        title={<><UserOutlined /> Tạo người dùng mới</>}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
        onOk={handleCreate}
        confirmLoading={createLoading}
        okText="Tạo"
        cancelText="Hủy"
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="email" label="Email" rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Email không hợp lệ' },
          ]}>
            <Input prefix={<UserOutlined />} placeholder="example@email.com" />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu' },
            { min: 6, message: 'Tối thiểu 6 ký tự' },
          ]}>
            <Input.Password prefix={<LockOutlined />} placeholder="••••••" />
          </Form.Item>
          <Form.Item name="full_name" label="Họ tên" rules={[
            { required: true, message: 'Vui lòng nhập họ tên' },
          ]}>
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>
          <Form.Item name="phone_number" label="SĐT">
            <Input placeholder="0912345678" />
          </Form.Item>
          <Form.Item name="roles" label="Vai trò" initialValue={['CUSTOMER']}>
            <Select mode="multiple" options={[
              { value: 'CUSTOMER', label: 'Customer' },
              { value: 'HOST', label: 'Host' },
              { value: 'ADMIN', label: 'Admin' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL ĐỔI ROLE */}
      <Modal
        title={<><EditOutlined /> Cập nhật vai trò — {editingUser?.full_name}</>}
        open={roleOpen}
        onCancel={() => { setRoleOpen(false); setEditingUser(null); }}
        onOk={handleUpdateRoles}
        confirmLoading={roleLoading}
        okText="Cập nhật"
        cancelText="Hủy"
      >
        <Form form={roleForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="roles" label="Vai trò" rules={[
            { required: true, message: 'Chọn ít nhất một vai trò' },
          ]}>
            <Select mode="multiple" options={[
              { value: 'CUSTOMER', label: 'Customer' },
              { value: 'HOST', label: 'Host' },
              { value: 'ADMIN', label: 'Admin' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}