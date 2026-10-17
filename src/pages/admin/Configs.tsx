import { Table, Button, Modal, Form, Input, message } from 'antd';
import { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminMock';
import type { SystemConfig } from '../../types/admin';

export default function ConfigsPage() {
    const [data, setData] = useState<SystemConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<SystemConfig | null>(null);
    const [form] = Form.useForm();

    useEffect(() => {
        adminApi.getConfigs().then((res) => {
            setData(res);
            setLoading(false);
        });
    }, []);

    const handleSave = () => {
        form.validateFields().then((values) => {
            setData((prev) =>
                prev.map((c) =>
                    c.configKey === editing?.configKey
                        ? { ...c, configValue: values.configValue, updatedAt: new Date().toISOString().slice(0, 10) }
                        : c
                )
            );
            message.success('Cập nhật cấu hình thành công');
            setEditing(null);
        });
    };

    const columns = [
        { title: 'Key', dataIndex: 'configKey', width: 280 },
        { title: 'Giá trị', dataIndex: 'configValue', width: 120 },
        { title: 'Mô tả', dataIndex: 'description' },
        { title: 'Cập nhật', dataIndex: 'updatedAt', width: 120 },
        {
            title: 'Hành động',
            width: 100,
            render: (_: any, record: SystemConfig) => (
                <Button size="small" onClick={() => { setEditing(record); form.setFieldsValue(record); }}>
                    Sửa
                </Button>
            ),
        },
    ];

    return (
        <div>
            <h2 style={{ marginBottom: 16 }}>Cấu hình hệ thống</h2>
            <div className="admin-table-wrapper" style={{ overflowX: 'auto' }}>
                <Table 
                    rowKey="configKey" 
                    loading={loading} 
                    columns={columns} 
                    dataSource={data} 
                    pagination={{ position: ['bottomCenter'], pageSize: 10 }} 
                    scroll={{ x: 'max-content' }} 
                />
            </div>

            <Modal title={`Sửa cấu hình: ${editing?.configKey}`} open={!!editing} onOk={handleSave} onCancel={() => setEditing(null)}>
                <Form form={form} layout="vertical">
                    <Form.Item name="configValue" label="Giá trị mới" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <p style={{ color: '#888' }}>{editing?.description}</p>
                </Form>
            </Modal>
        </div>
    );
}