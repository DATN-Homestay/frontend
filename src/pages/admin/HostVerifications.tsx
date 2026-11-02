import {
  Table,
  Tag,
  Button,
  Modal,
  Input,
  message,
  Space,
  Alert,
  Progress,
  Typography,
  Descriptions,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  EnvironmentOutlined,
  CameraOutlined,
  PhoneOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { adminService, type PendingClaim } from '../../services/adminService';

const { Text, Paragraph } = Typography;

// Score badge màu sắc
const getScoreColor = (score: number, max: number) => {
  const pct = (score / max) * 100;
  if (pct >= 80) return '#10b981';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
};

// Component: Tầng xác thực
function VerificationTier({
  icon,
  label,
  score,
  maxScore,
}: {
  icon: React.ReactNode;
  label: string;
  score: number;
  maxScore: number;
}) {
  const color = getScoreColor(score, maxScore);
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div
        style={{
          background: score > 0 ? `${color}18` : '#f1f5f9',
          border: `2px solid ${score > 0 ? color : '#e2e8f0'}`,
          borderRadius: 12,
          padding: '12px 8px',
          marginBottom: 6,
        }}
      >
        <div style={{ fontSize: 22, color: score > 0 ? color : '#94a3b8' }}>{icon}</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: score > 0 ? color : '#94a3b8' }}>
          +{score}đ
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8' }}>/{maxScore}đ</div>
      </div>
    </div>
  );
}

export default function HostVerificationsPage() {
  // --- State: Real Claims từ backend ---
  const [claims, setClaims] = useState<PendingClaim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<PendingClaim | null>(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);



  const loadClaims = async () => {
    setClaimsLoading(true);
    setClaimsError(null);
    try {
      const res = await adminService.getPendingClaims();
      setClaims(res);
    } catch (err: any) {
      setClaimsError(err.message ?? 'Không thể tải danh sách KYC');
    } finally {
      setClaimsLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const handleApproveClaim = async () => {
    if (!selectedClaim) return;
    setActionLoading(true);
    try {
      await adminService.approveClaim(selectedClaim.claim_id);
      message.success(
        `✅ Đã phê duyệt chính chủ Homestay "${selectedClaim.homestay_name}" cho Host ${selectedClaim.host_name}`
      );
      setClaimModalOpen(false);
      loadClaims();
    } catch (err: any) {
      message.error(err.message ?? 'Không thể phê duyệt');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClaim = async () => {
    if (!selectedClaim) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 10) {
      message.warning('Lý do từ chối phải có ít nhất 10 ký tự');
      return;
    }
    setActionLoading(true);
    try {
      await adminService.rejectClaim(selectedClaim.claim_id, rejectReason.trim());
      message.success(`Đã từ chối hồ sơ KYC #${selectedClaim.claim_id}`);
      setClaimModalOpen(false);
      setRejectReason('');
      loadClaims();
    } catch (err: any) {
      message.error(err.message ?? 'Không thể từ chối');
    } finally {
      setActionLoading(false);
    }
  };

  // Columns cho Claims (backend)
  const claimColumns = [
    {
      title: 'Homestay',
      render: (_: any, r: PendingClaim) => (
        <div>
          <Text strong>{r.homestay_name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            ID #{r.homestay_id}
          </Text>
        </div>
      ),
    },
    {
      title: 'Host',
      render: (_: any, r: PendingClaim) => (
        <div>
          <Text>{r.host_name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            ID #{r.host_id}
          </Text>
        </div>
      ),
    },
    {
      title: 'Trust Score',
      dataIndex: 'trust_score',
      sorter: (a: PendingClaim, b: PendingClaim) => a.trust_score - b.trust_score,
      render: (score: number) => {
        const color = score >= 100 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
        return (
          <div style={{ minWidth: 100 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ fontSize: 13, fontWeight: 600, color }}>{score}/140đ</Text>
            </div>
            <Progress
              percent={Math.round((score / 140) * 100)}
              strokeColor={color}
              showInfo={false}
              size="small"
            />
          </div>
        );
      },
    },
    {
      title: 'GPS (m)',
      dataIndex: 'haversine_distance_m',
      render: (d: number | null) =>
        d !== null ? (
          <Tag color={d <= 150 ? 'success' : 'error'}>
            <EnvironmentOutlined /> {d.toFixed(0)}m
          </Tag>
        ) : (
          <Tag>—</Tag>
        ),
    },
    {
      title: 'AI Vision',
      dataIndex: 'vision_similarity',
      render: (s: number | null) =>
        s !== null ? (
          <Tag color={s >= 0.75 ? 'success' : 'warning'}>
            <CameraOutlined /> {(s * 100).toFixed(1)}%
          </Tag>
        ) : (
          <Tag>—</Tag>
        ),
    },
    {
      title: 'Nộp lúc',
      dataIndex: 'submitted_at',
      render: (v: string) => new Date(v).toLocaleString('vi-VN'),
    },
    {
      title: 'Hành động',
      render: (_: any, record: PendingClaim) => (
        <Button
          type="primary"
          size="small"
          icon={<SafetyCertificateOutlined />}
          onClick={() => {
            setSelectedClaim(record);
            setRejectReason('');
            setClaimModalOpen(true);
          }}
        >
          Xem & Duyệt
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* ===== SECTION 1: CLAIMS TỪ BACKEND API (Trust Score 70-99) ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
            Duyệt KYC Chính Chủ Homestay
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Hồ sơ Trust Score 70-99: Đủ điều kiện nhưng cần Admin xác minh thủ công (4 tầng xác thực AI)
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadClaims} loading={claimsLoading}>
          Làm mới
        </Button>
      </div>

      {claimsError && (
        <Alert
          type="warning"
          message="Chưa kết nối được backend"
          description={claimsError}
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="claim_id"
        loading={claimsLoading}
        columns={claimColumns}
        dataSource={claims}
        pagination={{ pageSize: 10, showTotal: (t) => `Tổng ${t} hồ sơ chờ duyệt` }}
        locale={{ emptyText: 'Không có hồ sơ KYC nào đang chờ duyệt ✅' }}
        scroll={{ x: 'max-content' }}
        style={{ marginBottom: 40 }}
      />

      {/* ===== MODAL DUYỆT CLAIM ===== */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SafetyCertificateOutlined style={{ color: '#7c3aed' }} />
            Xét duyệt Hồ sơ KYC #{selectedClaim?.claim_id}
          </div>
        }
        open={claimModalOpen}
        onCancel={() => setClaimModalOpen(false)}
        width={680}
        footer={[
          <Button key="cancel" onClick={() => setClaimModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="reject"
            danger
            icon={<CloseCircleOutlined />}
            loading={actionLoading}
            onClick={handleRejectClaim}
          >
            Từ chối
          </Button>,
          <Button
            key="approve"
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={actionLoading}
            onClick={handleApproveClaim}
          >
            Phê duyệt chính chủ
          </Button>,
        ]}
      >
        {selectedClaim && (
          <div>
            {/* Thông tin tổng quan */}
            <Descriptions size="small" bordered column={2} style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Homestay">
                <Text strong>{selectedClaim.homestay_name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Host">
                {selectedClaim.host_name} (#{selectedClaim.host_id})
              </Descriptions.Item>
              <Descriptions.Item label="Trust Score" span={2}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Progress
                    percent={Math.round((selectedClaim.trust_score / 140) * 100)}
                    strokeColor={getScoreColor(selectedClaim.trust_score, 140)}
                    style={{ flex: 1, marginBottom: 0 }}
                  />
                  <Text
                    strong
                    style={{
                      color: getScoreColor(selectedClaim.trust_score, 140),
                      fontSize: 16,
                      minWidth: 60,
                    }}
                  >
                    {selectedClaim.trust_score}/140đ
                  </Text>
                </div>
              </Descriptions.Item>
            </Descriptions>

            {/* 4 Tầng xác thực */}
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 12, color: '#374151' }}>
                Chi tiết 4 tầng xác thực AI:
              </Text>
              <div style={{ display: 'flex', gap: 8 }}>
                <VerificationTier
                  icon={<IdcardOutlined />}
                  label="CCCD eKYC"
                  score={selectedClaim.cccd_score}
                  maxScore={40}
                />
                <VerificationTier
                  icon={<PhoneOutlined />}
                  label="OTP SĐT"
                  score={selectedClaim.phone_otp_score}
                  maxScore={30}
                />
                <VerificationTier
                  icon={<EnvironmentOutlined />}
                  label="GPS Haversine"
                  score={selectedClaim.gps_score}
                  maxScore={30}
                />
                <VerificationTier
                  icon={<CameraOutlined />}
                  label="AI CLIP Vision"
                  score={selectedClaim.live_vision_score}
                  maxScore={40}
                />
              </div>
            </div>

            {/* Chi tiết GPS & Vision */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {selectedClaim.haversine_distance_m !== null && (
                <div
                  style={{
                    flex: 1,
                    background: selectedClaim.haversine_distance_m <= 150 ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${selectedClaim.haversine_distance_m <= 150 ? '#bbf7d0' : '#fecaca'}`,
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>Khoảng cách GPS</Text>
                  <div style={{ fontSize: 18, fontWeight: 700, color: selectedClaim.haversine_distance_m <= 150 ? '#059669' : '#dc2626' }}>
                    {selectedClaim.haversine_distance_m.toFixed(1)}m
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Ngưỡng đạt: ≤ 150m</Text>
                </div>
              )}
              {selectedClaim.vision_similarity !== null && (
                <div
                  style={{
                    flex: 1,
                    background: selectedClaim.vision_similarity >= 0.75 ? '#f0fdf4' : '#fffbeb',
                    border: `1px solid ${selectedClaim.vision_similarity >= 0.75 ? '#bbf7d0' : '#fed7aa'}`,
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>AI Cosine Similarity</Text>
                  <div style={{ fontSize: 18, fontWeight: 700, color: selectedClaim.vision_similarity >= 0.75 ? '#059669' : '#d97706' }}>
                    {(selectedClaim.vision_similarity * 100).toFixed(2)}%
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Ngưỡng đạt: ≥ 75%</Text>
                </div>
              )}
            </div>

            {/* Ảnh live nếu có */}
            {selectedClaim.live_photo_url && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  Ảnh chụp Live Camera tại chỗ:
                </Text>
                <img
                  src={selectedClaim.live_photo_url}
                  alt="Live photo"
                  style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #e2e8f0' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Lý do từ chối */}
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#374151' }}>
                Lý do từ chối (bắt buộc nếu chọn "Từ chối"):
              </label>
              <Input.TextArea
                rows={3}
                placeholder="Ví dụ: Khoảng cách GPS quá xa (280m > 150m), cần Host đến chụp ảnh lại tại chỗ..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                showCount
                maxLength={500}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}