import { Spin } from 'antd';

export default function PageLoading() {
  return <div role="status" aria-label="Đang tải nội dung" style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
}
