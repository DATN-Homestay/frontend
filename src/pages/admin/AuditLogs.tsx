import { Table, Tag, Input, DatePicker, Space } from 'antd';
import { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminMock';
import type { AuditLog } from '../../types/admin';

export default function AuditLogsPage() {
    const [data, setData] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminApi.getAuditLogs().then((res) => {
            setData(res);
            setLoading(false);
        });
    }, []);

    const columns = [
        { title: 'ID', dataIndex: 'id', width: 70 },
        { title: 'Admin', dataIndex: 'adminName' },
        {
            title: 'Hành động',
            dataIndex: 'action',
            render: (action: string) => <Tag color="blue">{action}</Tag>,
        },
        { title: 'Bảng', dataIndex: 'targetTable' },
        { title: 'Target ID', dataIndex: 'targetId' },
        {
            title: 'Thời gian',
            dataIndex: 'createdAt',
            render: (v: string) => new Date(v).toLocaleString('vi-VN'),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Nhật ký kiểm toán (Audit Logs)</h2>
                <Space>
                    <Input.Search placeholder="Tìm theo action / admin" style={{ width: 250 }} />
                    <DatePicker.RangePicker />
                </Space>
            </div>
            <div className="admin-table-wrapper" style={{ overflowX: 'auto' }}>
                <Table
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={data}
                    pagination={{ position: ['bottomCenter'], pageSize: 10 }}
                    scroll={{ x: 'max-content' }}
                />
            </div>
        </div>
    );
}