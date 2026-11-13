import { useState } from 'react';
import { App, Upload, type UploadFile } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { customerService, type EvidenceKind } from '../services/customerService';

interface Props {
  kind: EvidenceKind;
  /** Danh sách URL ảnh đã tải lên xong */
  onChange: (urls: string[]) => void;
  /** Báo cho form biết còn ảnh đang tải để chặn nút gửi */
  onUploadingChange?: (uploading: boolean) => void;
  max?: number;
}

const MAX_MB = 5;

/** Chọn và tải ảnh bằng chứng (đánh giá / khiếu nại) lên thư mục riêng của người dùng */
export default function EvidenceUpload({ kind, onChange, onUploadingChange, max = 5 }: Props) {
  const { message } = App.useApp();
  const [files, setFiles] = useState<UploadFile<{ url: string }>[]>([]);

  const sync = (next: UploadFile<{ url: string }>[]) => {
    setFiles(next);
    onChange(next.filter((f) => f.status === 'done' && f.response?.url).map((f) => f.response!.url));
    onUploadingChange?.(next.some((f) => f.status === 'uploading'));
  };

  return (
    <Upload<{ url: string }>
      listType="picture-card"
      accept="image/jpeg,image/png,image/webp"
      multiple
      maxCount={max}
      fileList={files}
      beforeUpload={(file) => {
        if (!file.type.startsWith('image/')) {
          message.error('Chỉ chọn được file ảnh');
          return Upload.LIST_IGNORE;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
          message.error(`Ảnh "${file.name}" lớn hơn ${MAX_MB}MB`);
          return Upload.LIST_IGNORE;
        }
        return true;
      }}
      customRequest={({ file, onSuccess, onError }) => {
        customerService
          .uploadEvidence(file as File, kind)
          .then((res) => onSuccess?.(res))
          .catch((err: Error) => {
            message.error(err.message || 'Tải ảnh thất bại');
            onError?.(err);
          });
      }}
      onChange={({ fileList }) => sync(fileList.filter((f) => f.status !== 'error'))}
    >
      {files.length >= max ? null : (
        <div>
          <PlusOutlined />
          <div style={{ marginTop: 6, fontSize: 12 }}>Thêm ảnh</div>
        </div>
      )}
    </Upload>
  );
}
