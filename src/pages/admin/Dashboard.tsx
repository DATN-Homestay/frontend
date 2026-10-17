import { Card, Col, Row, Statistic, Table, Tag, Spin } from 'antd';
import { UserOutlined, TeamOutlined, HomeOutlined, DollarOutlined } from '@ant-design/icons';
import { Column } from '@ant-design/charts';
import { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminMock';
import type { DashboardOverview } from '../../types/admin';

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<DashboardOverview | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        adminApi.getDashboard().then((res) => {
            setOverview(res.overview);
            setChartData(res.revenueChart);
            setLoading(false);
        });
    }, []);

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

    return (
        <div>
            <h2 style={{ marginBottom: 24, fontWeight: 600 }}>Tổng quan hệ thống</h2>

            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic title="Khách hàng" value={overview?.totalCustomers} prefix={<UserOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic title="Host" value={overview?.totalHosts} prefix={<TeamOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Homestay"
                            value={overview?.totalHomestays}
                            prefix={<HomeOutlined />}
                            suffix={<Tag color="orange">{overview?.pendingHomestays} chờ duyệt</Tag>}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Doanh thu tháng này"
                            value={overview?.monthlyGrossRevenue}
                            precision={0}
                            prefix={<DollarOutlined />}
                            suffix="₫"
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={16}>
                    <Card title="Doanh thu & Hoa hồng 6 tháng gần nhất">
                        <Column data={chartData} xField="month" yField="value" seriesField="type" isGroup height={320} />
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title="Số liệu nhanh">
                        <p><strong>Hoa hồng tháng:</strong> {overview?.monthlyCommissionEarned.toLocaleString()} ₫</p>
                        <p><strong>Chờ chi trả Host:</strong> {overview?.pendingPayoutAmount.toLocaleString()} ₫</p>
                        <p><strong>KYC chờ duyệt:</strong> <Tag color="orange">{overview?.pendingVerifications}</Tag></p>
                        <p><strong>Tổng booking:</strong> {overview?.totalBookings.toLocaleString()}</p>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}