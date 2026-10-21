import { Table, Tag, Button, Modal, Image, Input, Space, message } from 'antd';
import { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminMock';
import type { HostVerification } from '../../types/admin';

export default function HostVerificationsPage() {
    const [data, setData] = useState<HostVerification[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<HostVerification | null>(null);
    const [note, setNote] = useState('');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        adminApi.getVerifications().then((res) => {
            setData(res);
            setLoading(false);
        });
    }, []);

    const handleAction = (status: 'APPROVED' | 'REJECTED') => {
        message.success(`Đã ${status === 'APPROVED' ? 'duyệt' : 'từ chối'} hồ sơ #${selected?.id}`);
        setData((prev) => prev.map((item) => (item.id === selected?.id ? { ...item, status, reviewNote: note } : item)));
        setOpen(false);
        setNote('');
    };

    const columns = [
        { title: 'ID', dataIndex: 'id', width: 70 },
        { title: 'Host', dataIndex: 'hostName' },
        { title: 'Email', dataIndex: 'hostEmail' },
        { title: 'Loại giấy tờ', dataIndex: 'docType' },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (s: string) => {
                const color = s === 'APPROVED' ? 'success' : s === 'REJECTED' ? 'error' : 'warning';
                return <Tag color={color}>{s}</Tag>;
            },
        },
        { title: 'Ngày nộp', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString('vi-VN') },
        {
            title: 'Hành động',
            render: (_: any, record: HostVerification) =>
                record.status === 'PENDING' ? (
                    <Button type="primary" size="small" onClick={() => { setSelected(record); setOpen(true); }}>
                        Xem & Duyệt
                    </Button>
                ) : (
                    <Button size="small" disabled>Đã xử lý</Button>
                ),
        },
    ];

    return (
        <div>
            <h2 style={{ marginBottom: 16 }}>Duyệt hồ sơ KYC Host</h2>
            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={data}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50'],
                    showTotal: (total) => `Tổng ${total} hồ sơ KYC`,
                }}
            />

            <Modal
                title={`Duyệt hồ sơ #${selected?.id} - ${selected?.hostName}`}
                open={open}
                onCancel={() => setOpen(false)}
                width={800}
                footer={[
                    <Button key="reject" danger onClick={() => handleAction('REJECTED')}>Từ chối</Button>,
                    <Button key="approve" type="primary" onClick={() => handleAction('APPROVED')}>Phê duyệt</Button>,
                ]}
            >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <Image src={selected?.docUrlFront} width={320} />
                        {selected?.docUrlBack && <Image src={selected.docUrlBack} width={320} />}
                    </div>
                    <Input.TextArea
                        rows={3}
                        placeholder="Ghi chú kiểm duyệt (bắt buộc nếu từ chối)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                </Space>
            </Modal>
        </div>
    );
}