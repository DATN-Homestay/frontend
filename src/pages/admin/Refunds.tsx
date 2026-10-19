import { Table, Tag, Button, Modal, Input, message } from 'antd';
import { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminMock';
import type { RefundRequest } from '../../types/admin';

export default function RefundsPage() {
    const [data, setData] = useState<RefundRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<RefundRequest | null>(null);
    const [note, setNote] = useState('');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        adminApi.getRefunds().then((res) => {
            setData(res);
            setLoading(false);
        });
    }, []);

    const handleProcess = (status: 'APPROVED' | 'REJECTED') => {
        setData((prev) =>
            prev.map((r) => (r.id === selected?.id ? { ...r, status: status === 'APPROVED' ? 'COMPLETED' : 'REJECTED' } : r))
        );
        message.success(`Đã ${status === 'APPROVED' ? 'phê duyệt hoàn tiền' : 'từ chối'} yêu cầu #${selected?.id}`);
        setOpen(false);
    };

    const columns = [
        { title: 'ID', dataIndex: 'id', width: 70 },
        { title: 'Booking', dataIndex: 'bookingId' },
        { title: 'Khách hàng', dataIndex: 'customerName' },
        { title: 'Số tiền', dataIndex: 'amount', render: (v: number) => v.toLocaleString() + ' ₫' },
        { title: 'Lý do', dataIndex: 'reason', ellipsis: true },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (s: string) => {
                const color = s === 'COMPLETED' ? 'success' : s === 'REJECTED' ? 'error' : 'warning';
                return <Tag color={color}>{s}</Tag>;
            },
        },
        { title: 'Ngày tạo', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString('vi-VN') },
        {
            title: 'Hành động',
            render: (_: any, record: RefundRequest) =>
                record.status === 'PENDING' ? (
                    <Button type="primary" size="small" onClick={() => { setSelected(record); setOpen(true); }}>
                        Xử lý
                    </Button>
                ) : (
                    <Tag>Đã xử lý</Tag>
                ),
        },
    ];

    return (
        <div>
            <h2 style={{ marginBottom: 16 }}>Yêu cầu hoàn tiền</h2>
            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={data}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50'],
                    showTotal: (total) => `Tổng ${total} yêu cầu hoàn tiền`,
                }}
            />

            <Modal
                title={`Xử lý hoàn tiền #${selected?.id}`}
                open={open}
                onCancel={() => setOpen(false)}
                footer={[
                    <Button key="reject" danger onClick={() => handleProcess('REJECTED')}>Từ chối</Button>,
                    <Button key="approve" type="primary" onClick={() => handleProcess('APPROVED')}>Phê duyệt hoàn tiền</Button>,
                ]}
            >
                <p><strong>Khách:</strong> {selected?.customerName}</p>
                <p><strong>Số tiền:</strong> {selected?.amount.toLocaleString()} ₫</p>
                <p><strong>Lý do:</strong> {selected?.reason}</p>
                <Input.TextArea rows={3} placeholder="Ghi chú xử lý" value={note} onChange={(e) => setNote(e.target.value)} style={{ marginTop: 12 }} />
            </Modal>
        </div>
    );
}