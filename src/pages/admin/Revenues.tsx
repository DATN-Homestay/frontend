import { Card, Col, Row, Statistic, Table } from 'antd';
import { DollarOutlined, RiseOutlined } from '@ant-design/icons';

const mockRevenueDetail = [
    { key: 1, month: 'Tháng 9/2026', bookings: 450, gross: 900_000_000, commission: 90_000_000, netHost: 810_000_000 },
    { key: 2, month: 'Tháng 8/2026', bookings: 420, gross: 820_000_000, commission: 82_000_000, netHost: 738_000_000 },
    { key: 3, month: 'Tháng 7/2026', bookings: 390, gross: 750_000_000, commission: 75_000_000, netHost: 675_000_000 },
];

export default function RevenuesPage() {
    return (
        <div>
            <h2 style={{ marginBottom: 24 }}>Doanh thu & Hoa hồng</h2>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={24} md={8}>
                    <Card>
                        <Statistic title="Doanh thu tháng này" value={750000000} prefix={<DollarOutlined />} suffix="₫" valueStyle={{ color: '#3f8600' }} />
                    </Card>
                </Col>
                <Col xs={24} sm={24} md={8}>
                    <Card>
                        <Statistic title="Hoa hồng sàn thu được" value={75000000} prefix={<RiseOutlined />} suffix="₫" />
                    </Card>
                </Col>
                <Col xs={24} sm={24} md={8}>
                    <Card>
                        <Statistic title="Số tiền thuộc về Host" value={675000000} suffix="₫" />
                    </Card>
                </Col>
            </Row>

            <div className="admin-table-wrapper" style={{ overflowX: 'auto' }}>
                <Table
                    dataSource={mockRevenueDetail}
                    columns={[
                        { title: 'Kỳ', dataIndex: 'month' },
                        { title: 'Số booking hoàn thành', dataIndex: 'bookings' },
                        { title: 'Doanh thu gộp', dataIndex: 'gross', render: (v) => v.toLocaleString() + ' ₫' },
                        { title: 'Hoa hồng', dataIndex: 'commission', render: (v) => v.toLocaleString() + ' ₫' },
                        { title: 'Thực nhận Host', dataIndex: 'netHost', render: (v) => v.toLocaleString() + ' ₫' },
                    ]}
                    pagination={{ position: ['bottomCenter'], pageSize: 5 }}
                    scroll={{ x: 'max-content' }}
                />
            </div>
        </div>
    );
}