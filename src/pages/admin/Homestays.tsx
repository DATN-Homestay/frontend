import { Table, Tag, Button, Space, Image, message, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminMock';
import type { HomestayPending } from '../../types/admin';

export default function HomestaysPage() {
    const [data, setData] = useState<HomestayPending[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminApi.getPendingHomestays().then((res) => {
            setData(res);
            setLoading(false);
        });
    }, []);

    const handleApprove = (id: number) => {
        Modal.confirm({
            title: 'Xác nhận duyệt Homestay?',
            content: 'Homestay sẽ được hiển thị công khai trên hệ thống.',
            onOk: () => {
                setData((prev) => prev.map((h) => (h.id === id ? { ...h, status: 'APPROVED' } : h)));
                message.success(`Đã duyệt Homestay #${id}`);
            },
        });
    };

    const handleReject = (id: number) => {
        Modal.confirm({
            title: 'Từ chối Homestay?',
            content: 'Vui lòng nhập lý do từ chối ở bước tiếp theo (demo).',
            okType: 'danger',
            onOk: () => {
                setData((prev) => prev.map((h) => (h.id === id ? { ...h, status: 'REJECTED' } : h)));
                message.success(`Đã từ chối Homestay #${id}`);
            },
        });
    };

    const columns = [
        {
            title: 'Ảnh',
            dataIndex: 'thumbnail',
            render: (url: string) => <Image src={url} width={80} height={50} style={{ objectFit: 'cover', borderRadius: 4 }} />,
        },
        { title: 'Tên Homestay', dataIndex: 'title' },
        { title: 'Host', dataIndex: 'hostName' },
        { title: 'Thành phố', dataIndex: 'city' },
        { title: 'Loại hình', dataIndex: 'propertyType' },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (s: string) => {
                const color = s === 'APPROVED' ? 'success' : s === 'REJECTED' ? 'error' : 'warning';
                return <Tag color={color}>{s}</Tag>;
            },
        },
        { title: 'Ngày đăng ký', dataIndex: 'createdAt' },
        {
            title: 'Hành động',
            render: (_: any, record: HomestayPending) =>
                record.status === 'PENDING' ? (
                    <Space>
                        <Button type="primary" size="small" onClick={() => handleApprove(record.id)}>Duyệt</Button>
                        <Button danger size="small" onClick={() => handleReject(record.id)}>Từ chối</Button>
                    </Space>
                ) : (
                    <Tag>Đã xử lý</Tag>
                ),
        },
    ];

    return (
        <div>
            <h2 style={{ marginBottom: 16 }}>Duyệt Homestay đăng ký mới</h2>
            <Table rowKey="id" loading={loading} columns={columns} dataSource={data} />
        </div>
    );
}