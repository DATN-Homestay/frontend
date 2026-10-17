import { Table, Tag, Button, Space, Input, Select, message } from 'antd';
import { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminMock';
import type { UserItem } from '../../types/admin';

const { Search } = Input;

export default function UsersPage() {
    const [data, setData] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterRole, setFilterRole] = useState<string | undefined>();

    useEffect(() => {
        adminApi.getUsers().then((res) => {
            setData(res);
            setLoading(false);
        });
    }, []);

    const filtered = filterRole ? data.filter((u) => u.role === filterRole) : data;

    const columns = [
        { title: 'ID', dataIndex: 'id', width: 70 },
        { title: 'Họ tên', dataIndex: 'fullName' },
        { title: 'Email', dataIndex: 'email' },
        { title: 'SĐT', dataIndex: 'phone' },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            render: (role: string) => {
                const color = role === 'ADMIN' ? 'purple' : role === 'HOST' ? 'blue' : 'green';
                return <Tag color={color}>{role}</Tag>;
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (status: string) => {
                const color = status === 'ACTIVE' ? 'success' : status === 'BLOCKED' ? 'error' : 'warning';
                return <Tag color={color}>{status}</Tag>;
            },
        },
        { title: 'Ngày tạo', dataIndex: 'createdAt' },
        {
            title: 'Hành động',
            render: (_: any, record: UserItem) => (
                <Space>
                    {record.status === 'ACTIVE' ? (
                        <Button size="small" danger onClick={() => message.success(`Đã khóa user #${record.id}`)}>
                            Khóa
                        </Button>
                    ) : (
                        <Button size="small" type="primary" onClick={() => message.success(`Đã mở khóa user #${record.id}`)}>
                            Mở khóa
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Quản lý người dùng</h2>
                <Space>
                    <Select
                        placeholder="Lọc vai trò"
                        allowClear
                        style={{ width: 150 }}
                        onChange={setFilterRole}
                        options={[
                            { value: 'CUSTOMER', label: 'Customer' },
                            { value: 'HOST', label: 'Host' },
                            { value: 'ADMIN', label: 'Admin' },
                        ]}
                    />
                    <Search placeholder="Tìm theo tên / email" style={{ width: 250 }} />
                </Space>
            </div>

            <div className="admin-table-wrapper" style={{ overflowX: 'auto' }}>
                <Table 
                    rowKey="id" 
                    loading={loading} 
                    columns={columns} 
                    dataSource={filtered} 
                    pagination={{ position: ['bottomCenter'], pageSize: 10 }} 
                    scroll={{ x: 'max-content' }}
                />
            </div>
        </div>
    );
}