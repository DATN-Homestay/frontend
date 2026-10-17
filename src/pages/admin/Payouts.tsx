import { Table, Tag, Button, Space, Modal, Input, message } from 'antd';
import { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminMock';
import type { PayoutItem } from '../../types/admin';

export default function PayoutsPage() {
    const [data, setData] = useState<PayoutItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<PayoutItem | null>(null);
    const [txRef, setTxRef] = useState('');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        adminApi.getPayouts().then((res) => {
            setData(res);
            setLoading(false);
        });
    }, []);

    const handleTransfer = () => {
        if (!txRef.trim()) return message.warning('Vui lòng nhập mã giao dịch');
        setData((prev) =>
            prev.map((p) =>
                p.id === selected?.id
                    ? { ...p, status: 'PAID', transactionRef: txRef, paidAt: new Date().toISOString() }
                    : p
            )
        );
        message.success('Đã ghi nhận chuyển khoản thành công');
        setOpen(false);
        setTxRef('');
    };

    const columns = [
        { title: 'ID', dataIndex: 'id', width: 70 },
        { title: 'Host', dataIndex: 'hostName' },
        { title: 'Số tiền', dataIndex: 'amount', render: (v: number) => v.toLocaleString() + ' ₫' },
        { title: 'Ngân hàng', dataIndex: 'bankName' },
        { title: 'Số tài khoản', dataIndex: 'accountNumber' },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (s: string) => {
                const map: Record<string, string> = {
                    CALCULATED: 'default',
                    PENDING: 'warning',
                    PAID: 'success',
                    FAILED: 'error',
                };
                return <Tag color={map[s]}>{s}</Tag>;
            },
        },
        { title: 'Kỳ', render: (_: any, r: PayoutItem) => `${r.month}/${r.year}` },
        {
            title: 'Hành động',
            render: (_: any, record: PayoutItem) =>
                record.status === 'PENDING' || record.status === 'CALCULATED' ? (
                    <Button type="primary" size="small" onClick={() => { setSelected(record); setOpen(true); }}>
                        Xác nhận chuyển
                    </Button>
                ) : (
                    <span>{record.transactionRef}</span>
                ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Đối soát & Chi trả Host</h2>
                <Button type="primary" onClick={() => message.success('Đã chạy job tính toán payout tháng 9/2026')}>
                    Chạy job tính toán tháng này
                </Button>
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

            <Modal
                title={`Xác nhận chuyển khoản - ${selected?.hostName}`}
                open={open}
                onOk={handleTransfer}
                onCancel={() => setOpen(false)}
                okText="Xác nhận đã chuyển"
            >
                <p>Số tiền: <strong>{selected?.amount.toLocaleString()} ₫</strong></p>
                <p>Tài khoản: {selected?.bankName} - {selected?.accountNumber}</p>
                <Input
                    placeholder="Nhập mã giao dịch ngân hàng (transaction_ref)"
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                    style={{ marginTop: 12 }}
                />
            </Modal>
        </div>
    );
}