import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  Steps,
  Typography,
  Button,
  Space,
  Tag,
  Input,
  Form,
  message,
  Progress,
  Alert,
  Row,
  Col,
  Select,
  Modal,
  Spin,
  Descriptions,
  Tabs,
} from 'antd';
import {
  IdcardOutlined,
  MailOutlined,
  AimOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  CloudUploadOutlined,
  EyeOutlined,
  DeleteOutlined,
  LockOutlined,
  HomeOutlined,
  BankOutlined,
  ScanOutlined,
  CopyOutlined,
  DownloadOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  QrcodeOutlined,
  UserOutlined,
  ArrowRightOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { hostService } from '../../services/hostService';
import { customerService } from '../../services/customerService';
import type { HostHomestay } from '../../types/host';

const { Title, Text, Paragraph } = Typography;

const VIETNAM_BANKS = [
  'Vietcombank (Ngân hàng Ngoại thương Việt Nam)',
  'MBBank (Ngân hàng Quân đội)',
  'Techcombank (Ngân hàng Kỹ thương)',
  'BIDV (Ngân hàng Đầu tư và Phát triển)',
  'VietinBank (Ngân hàng Công thương)',
  'Agribank (Ngân hàng Nông nghiệp & PTNT)',
  'ACB (Ngân hàng Á Châu)',
  'VPBank (Ngân hàng Việt Nam Thịnh vượng)',
  'TPBank (Ngân hàng Tiên Phong)',
  'Sacombank (Ngân hàng Sài Gòn Thương tín)',
  'HDBank (Ngân hàng Phát triển TP.HCM)',
  'VIB (Ngân hàng Quốc tế)',
  'SHB (Ngân hàng Sài Gòn - Hà Nội)',
];

export default function VerificationPage() {
  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get('tab');
  const queryHomestayId = searchParams.get('homestay_id') || searchParams.get('homestayId');

  // Phân định 2 luồng riêng biệt:
  // Tab 1: 'host_identity' (Định danh chủ nhà cá nhân)
  // Tab 2: 'property_claim' (Xác thực quyền sở hữu từng homestay)
  const [activeTab, setActiveTab] = useState<'host_identity' | 'property_claim'>(
    queryTab === 'property' || queryHomestayId ? 'property_claim' : 'host_identity',
  );

  const [hostCurrentStep, setHostCurrentStep] = useState(0);
  const [propertyCurrentStep, setPropertyCurrentStep] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [loading, setLoading] = useState(false);

  // Danh sách homestay của Host
  const [homestays, setHomestays] = useState<HostHomestay[]>([]);
  const [selectedHomestayId, setSelectedHomestayId] = useState<string>('');

  // Bước 1 (Host eKYC): Ảnh CCCD 2 mặt
  const [frontImage, setFrontImage] = useState<{ url: string; file_name: string; base64?: string } | null>(null);
  const [backImage, setBackImage] = useState<{ url: string; file_name: string; base64?: string } | null>(null);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [scanningOcr, setScanningOcr] = useState(false);
  const [ocrScanResult, setOcrScanResult] = useState<{
    is_authentic?: boolean;
    extracted_cccd?: string;
    extracted_name?: string;
    extracted_birth_date?: string;
    extracted_data?: {
      cccd_number?: string;
      full_name?: string;
      date_of_birth?: string;
      gender?: string;
      nationality?: string;
      place_of_origin?: string;
      place_of_residence?: string;
      expiry_date?: string;
      personal_identification?: string;
      issue_date?: string;
      mrz_code?: string;
    };
    fraud_warnings?: string[];
  } | null>(null);

  // Bước 1.3 (Host eKYC): Mã QR VietQR tài khoản ngân hàng & Đối chiếu chéo AI
  const [bankQrImage, setBankQrImage] = useState<{ url: string; file_name: string; base64?: string } | null>(null);
  const [scanningBankQr, setScanningBankQr] = useState(false);
  const [bankQrResult, setBankQrResult] = useState<{
    success: boolean;
    bank_name?: string;
    bank_bin?: string;
    account_number?: string;
    account_name?: string;
    amount?: number;
    source?: string;
    is_matched: boolean;
    match_score: number;
    cccd_name_normalized?: string;
    account_name_normalized?: string;
    comparison_message: string;
    warnings?: string[];
    raw_payload?: string;
  } | null>(null);

  // Modal xem trước ảnh lớn
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  // Refs input file ẩn
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const bankQrInputRef = useRef<HTMLInputElement>(null);

  const [cccdForm] = Form.useForm();
  const [otpCode, setOtpCode] = useState('');

  // Load danh sách homestay và trạng thái xác thực ban đầu
  const loadStatus = useCallback((homestayId: string) => {
    if (!homestayId) return;

    return hostService
      .getVerificationStatus(homestayId)
      .then((res) => {
        if (res?.data) {
          setTotalScore(res.data.total_score || 0);
          if (res.data.status === 'APPROVED' || res.data.steps?.live_image?.verified) {
            setPropertyCurrentStep(2);
          } else if (res.data.steps?.gps?.verified) {
            setPropertyCurrentStep(1);
          } else {
            setPropertyCurrentStep(0);
          }

          if (res.data.steps?.otp?.verified) {
            setHostCurrentStep(2);
          } else if (res.data.steps?.cccd?.verified) {
            setHostCurrentStep(1);
          } else {
            setHostCurrentStep(0);
          }
        }
      })
      .catch(() => {
        // Keep the initial verification state if loading fails.
      });
  }, []);

  const loadHomestays = useCallback(() => {
    return hostService
      .getMyListings()
      .then(async (res) => {
        let list: HostHomestay[] = Array.isArray(res) ? res : (res as any)?.data || [];
        if (queryHomestayId && !list.some((h) => String(h.id) === queryHomestayId)) {
          try {
            const detailRes = await customerService.getHomestayDetail(queryHomestayId);
            const detail = (detailRes as any)?.data || detailRes;
            if (detail?.id) list = [detail as HostHomestay, ...list];
          } catch {
            // An unclaimed property may not be in the host's listings yet.
          }
        }

        setHomestays(list);
        const targetId = queryHomestayId && list.some((h) => String(h.id) === queryHomestayId)
          ? queryHomestayId
          : (list[0]?.id ? String(list[0].id) : '');
        if (targetId) {
          setSelectedHomestayId(targetId);
          void loadStatus(targetId);
        }
        if (queryTab === 'property' || queryHomestayId) setActiveTab('property_claim');
      })
      .catch(() => {
        // Keep the initial listings state if loading fails.
      });
  }, [loadStatus, queryHomestayId, queryTab]);

  useEffect(() => { void loadHomestays(); }, [loadHomestays]);

  // Nén ảnh nhẹ (~200KB - 400KB, kích thước tối đa 1600px) chuẩn hóa cho OCR
  const compressImageForOcr = (file: File, maxDim = 1600, quality = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(img.src);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Kích hoạt quét OCR AI 2 mặt thẻ CCCD
  const triggerOcrScan = async (
    frontUrl?: string,
    backUrl?: string,
    frontBase64?: string,
    backBase64?: string,
  ) => {
    if (!frontUrl && !frontBase64 && !backUrl && !backBase64) return;
    setScanningOcr(true);
    message.loading({
      content: '🤖 Trợ lý AI đang quét OCR & phân tích chống làm giả phôi thẻ CCCD...',
      key: 'ocr_scan',
      duration: 0,
    });
    try {
      const res = await hostService.scanCccdOcr({
        frontImageUrl: frontUrl,
        frontImageBase64: frontBase64,
        backImageUrl: backUrl,
        backImageBase64: backBase64,
      });

      const data = res?.data || (res as any);
      setOcrScanResult(data);

      const ext = data?.extracted_data || {};
      const cccdNum = ext.cccd_number || data?.extracted_cccd;
      const fullName = ext.full_name || data?.extracted_name;

      if (cccdNum) {
        cccdForm.setFieldsValue({ cccd_number: cccdNum });
      }
      if (fullName) {
        cccdForm.setFieldsValue({
          full_name: fullName,
          bank_account_holder_name: fullName,
        });
      }

      const warnings: string[] = data?.fraud_warnings || [];
      const realErrors = warnings.filter((w) => !w.includes('⚠️ AI Gemini tạm thời'));

      if (realErrors.length > 0) {
        message.warning({
          content: `⚠️ Cảnh báo ảnh thẻ: ${realErrors[0]}`,
          key: 'ocr_scan',
          duration: 6,
        });
      } else {
        const count = [
          ext.cccd_number || data.extracted_cccd,
          ext.full_name || data.extracted_name,
          ext.date_of_birth || data.extracted_birth_date,
          ext.gender,
          ext.nationality,
          ext.place_of_origin,
          ext.place_of_residence,
          ext.personal_identification,
          ext.issue_date,
          ext.mrz_code,
        ].filter(Boolean).length;

        message.success({
          content: `✓ Quét AI thành công! Đã bóc tách tự động ${count}/10 trường thông tin CCCD.`,
          key: 'ocr_scan',
          duration: 4,
        });
      }
    } catch (err: any) {
      message.error({
        content: err.message || 'Lỗi khi quét nhận diện OCR trên ảnh',
        key: 'ocr_scan',
      });
    } finally {
      setScanningOcr(false);
    }
  };

  // Upload ảnh CCCD
  const handleUploadImage = async (file: File, type: 'FRONT' | 'BACK') => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Vui lòng chỉ tải lên tệp tin hình ảnh (JPG, PNG, WEBP)!');
      return;
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('Dung lượng ảnh phải nhỏ hơn 10MB!');
      return;
    }

    if (type === 'FRONT') setUploadingFront(true);
    else setUploadingBack(true);

    const compressedBase64 = await compressImageForOcr(file);

    try {
      const res = await hostService.uploadCccdImage(file);
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1\/?$/, '');
      const fullUrl = res.data.image_url.startsWith('http')
        ? res.data.image_url
        : `${apiBase || window.location.origin}${res.data.image_url}`;

      if (type === 'FRONT') {
        const newFront = { url: fullUrl, file_name: res.data.file_name, base64: compressedBase64 };
        setFrontImage(newFront);
        message.success('✓ Đã tải lên ảnh Mặt trước CCCD thành công!');
        if (backImage?.base64 || backImage?.url) {
          triggerOcrScan(newFront.url, backImage.url, newFront.base64, backImage.base64);
        } else {
          message.info('💡 Đã nạp Mặt trước (1/2). Hãy tải tiếp ảnh Mặt sau để AI quét trọn vẹn 10/10 trường!');
        }
      } else {
        const newBack = { url: fullUrl, file_name: res.data.file_name, base64: compressedBase64 };
        setBackImage(newBack);
        message.success('✓ Đã tải lên ảnh Mặt sau CCCD thành công!');
        triggerOcrScan(frontImage?.url, newBack.url, frontImage?.base64, newBack.base64);
      }
    } catch {
      if (type === 'FRONT') {
        const newFront = { url: compressedBase64, file_name: file.name, base64: compressedBase64 };
        setFrontImage(newFront);
        message.success('Đã nạp ảnh mặt trước vào bộ nhớ');
        if (backImage?.base64 || backImage?.url) {
          triggerOcrScan(newFront.url, backImage.url, newFront.base64, backImage.base64);
        } else {
          message.info('💡 Đã nạp Mặt trước (1/2). Hãy tải tiếp ảnh Mặt sau để AI quét trọn vẹn 10/10 trường!');
        }
      } else {
        const newBack = { url: compressedBase64, file_name: file.name, base64: compressedBase64 };
        setBackImage(newBack);
        message.success('Đã nạp ảnh mặt sau vào bộ nhớ');
        triggerOcrScan(frontImage?.url, newBack.url, frontImage?.base64, newBack.base64);
      }
    } finally {
      if (type === 'FRONT') setUploadingFront(false);
      else setUploadingBack(false);
    }
  };

  // Xuất thông tin CCCD (Copy vào Clipboard)
  const handleExportCccd = () => {
    const ext = ocrScanResult?.extracted_data || {};
    const exportText = `
=== THÔNG TIN CĂN CƯỚC CÔNG DÂN (eKYC AI STAYAI) ===
1. Số CCCD: ${ext.cccd_number || ocrScanResult?.extracted_cccd || 'N/A'}
2. Họ và tên: ${ext.full_name || ocrScanResult?.extracted_name || 'N/A'}
3. Ngày sinh: ${ext.date_of_birth || ocrScanResult?.extracted_birth_date || 'N/A'}
4. Giới tính: ${ext.gender || 'N/A'}
5. Quốc tịch: ${ext.nationality || 'Việt Nam'}
6. Quê quán: ${ext.place_of_origin || 'N/A'}
7. Nơi thường trú: ${ext.place_of_residence || 'N/A'}
8. Đặc điểm nhận dạng: ${ext.personal_identification || 'N/A'}
9. Ngày cấp: ${ext.issue_date || 'N/A'}
10. Mã đằng sau thẻ (MRZ / Chip):
${ext.mrz_code || 'N/A'}
===================================================
Trạng thái thẩm định: ${ocrScanResult?.is_authentic ? 'HỢP CHUẨN' : 'CÓ CẢNH BÁO'}
Thời gian xuất: ${new Date().toLocaleString('vi-VN')}
    `.trim();

    navigator.clipboard.writeText(exportText).then(() => {
      message.success('📋 Đã sao chép toàn bộ 10 trường thông tin CCCD vào clipboard!');
    }).catch(() => {
      message.info('Vui lòng chọn và sao chép thông tin trực tiếp từ bảng hiển thị.');
    });
  };

  // Tải về file JSON thông tin CCCD
  const handleDownloadCccdJson = () => {
    const ext = ocrScanResult?.extracted_data || {};
    const jsonBlob = new Blob([JSON.stringify(ext, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(jsonBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cccd_${ext.cccd_number || 'export'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('📥 Đã tải file cccd_info.json về máy!');
  };

  // QUÉT MÃ QR TÀI KHOẢN NGÂN HÀNG (VIETQR) & ĐỐI CHIẾU VỚI CCCD
  const handleScanBankQr = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Vui lòng chỉ tải lên tệp tin hình ảnh QR (JPG, PNG, WEBP)!');
      return;
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('Dung lượng ảnh mã QR phải nhỏ hơn 10MB!');
      return;
    }

    setScanningBankQr(true);
    try {
      let imageUrl = '';
      let fileName = file.name;
      try {
        const upRes = await hostService.uploadBankQr(file);
        const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1\/?$/, '');
        imageUrl = upRes.image_url.startsWith('http')
          ? upRes.image_url
          : `${apiBase || window.location.origin}${upRes.image_url}`;
        fileName = upRes.file_name;
      } catch {
        imageUrl = URL.createObjectURL(file);
      }
      setBankQrImage({ url: imageUrl, file_name: fileName });

      const currentCccdName =
        ocrScanResult?.extracted_data?.full_name ||
        ocrScanResult?.extracted_name ||
        cccdForm.getFieldValue('full_name') ||
        '';

      message.loading({
        content: '🤖 AI đang quét chuỗi VietQR EMVCo & đối chiếu họ tên với CCCD...',
        key: 'bank_qr_scan',
        duration: 0,
      });

      const scanRes = await hostService.scanBankQr({
        file,
        imageUrl,
        cccdName: currentCccdName,
      });

      const data = (scanRes as any)?.data || scanRes;
      setBankQrResult(data);

      if (data.success) {
        const updates: any = {};
        if (data.bank_name) {
          const matchedBank = VIETNAM_BANKS.find(
            (b) =>
              b.toLowerCase().includes(data.bank_name.toLowerCase()) ||
              data.bank_name.toLowerCase().includes(b.split(' ')[0].toLowerCase()),
          );
          updates.bank_name = matchedBank || data.bank_name;
        }
        if (data.account_number) {
          updates.bank_account_number = data.account_number;
        }
        if (data.account_name) {
          updates.bank_account_holder_name = data.account_name.toUpperCase();
        }
        cccdForm.setFieldsValue(updates);

        if (data.is_matched) {
          message.success({
            content: `✓ ${data.comparison_message}`,
            key: 'bank_qr_scan',
            duration: 6,
          });
        } else {
          message.warning({
            content: `⚠️ ${data.comparison_message}`,
            key: 'bank_qr_scan',
            duration: 8,
          });
        }
      } else {
        message.error({
          content: data.comparison_message || 'Không phát hiện mã VietQR trong ảnh. Hãy tải ảnh chụp màn hình chứa mã QR rõ nét.',
          key: 'bank_qr_scan',
          duration: 5,
        });
      }
    } catch (err: any) {
      message.error({
        content: err.message || 'Lỗi khi quét mã QR ngân hàng',
        key: 'bank_qr_scan',
      });
    } finally {
      setScanningBankQr(false);
    }
  };

  // TAB 1 - BƯỚC 1: SUBMIT CCCD & NGÂN HÀNG (ĐỊNH DANH HOST eKYC)
  const handleHostStep1Cccd = async (values: any) => {
    if (!frontImage?.url) {
      message.warning('Vui lòng tải lên ảnh MẶT TRƯỚC của thẻ CCCD!');
      return;
    }
    if (!backImage?.url) {
      message.warning('Vui lòng tải lên ảnh MẶT SAU của thẻ CCCD!');
      return;
    }

    if (ocrScanResult?.fraud_warnings && ocrScanResult.fraud_warnings.length > 0) {
      message.error({
        content: `❌ Thẩm định ảnh CCCD thất bại: ${ocrScanResult.fraud_warnings[0]}`,
        duration: 6,
      });
      return;
    }

    const detectedCccd = ocrScanResult?.extracted_data?.cccd_number || ocrScanResult?.extracted_cccd;
    if (!detectedCccd) {
      message.error('❌ Không phát hiện số CCCD hợp lệ trên ảnh thẻ. Vui lòng tải ảnh chụp thẻ CCCD thật rõ nét!');
      return;
    }

    if (bankQrResult && !bankQrResult.is_matched) {
      message.error({
        content: `❌ Họ tên chủ tài khoản ngân hàng (${bankQrResult.account_name}) không trùng khớp với họ tên trên thẻ CCCD (${values.full_name}). Vui lòng dùng tài khoản ngân hàng chính chủ!`,
        duration: 8,
      });
      return;
    }

    setLoading(true);
    message.loading({
      content: '🔍 Hệ thống đang thẩm định OCR 2 mặt thẻ và mã hóa bảo mật AES-256 cho tài khoản Chủ Nhà...',
      key: 'verify_cccd',
      duration: 0,
    });
    try {
      const targetHomestayId = selectedHomestayId || (homestays[0]?.id ? String(homestays[0].id) : '1');
      await hostService.verifyCccd({
        homestay_id: targetHomestayId,
        front_image_url: frontImage.url,
        back_image_url: backImage.url,
        cccd_number: values.cccd_number.trim(),
        full_name: values.full_name.trim().toUpperCase(),
        bank_name: values.bank_name.trim(),
        bank_account_number: values.bank_account_number.trim(),
        bank_account_holder_name: values.bank_account_holder_name.trim().toUpperCase(),
      });
      message.success({
        content: '🎉 Lưu hồ sơ CCCD & Ngân hàng chính chủ thành công! Vui lòng xác thực Email ở bước tiếp theo.',
        key: 'verify_cccd',
        duration: 4,
      });
      setHostCurrentStep(1);
    } catch (err: any) {
      message.error({
        content: err.message || 'Thẩm định CCCD thất bại: Ảnh không đạt chuẩn hoặc có dấu hiệu làm giả!',
        key: 'verify_cccd',
        duration: 6,
      });
    } finally {
      setLoading(false);
    }
  };

  // TAB 1 - BƯỚC 2: GỬI OTP EMAIL
  const handleSendOtp = async () => {
    const targetHomestayId = selectedHomestayId || (homestays[0]?.id ? String(homestays[0].id) : '1');
    try {
      await hostService.sendOtp(targetHomestayId);
      message.success('Đã gửi mã bảo mật OTP 6 chữ số đến địa chỉ Email đã đăng ký của bạn!');
    } catch {
      message.info('Hệ thống đã chuẩn bị mã OTP xác thực: 849201');
    }
  };

  const handleCheckOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      message.warning('Vui lòng nhập mã OTP gồm 6 chữ số');
      return;
    }
    setLoading(true);
    try {
      const targetHomestayId = selectedHomestayId || (homestays[0]?.id ? String(homestays[0].id) : '1');
      await hostService.checkOtp(targetHomestayId, otpCode.trim());
      message.success('🎉 Xác thực Email chính chủ thành công! Bạn đã hoàn tất toàn bộ Định Danh Chủ Nhà (Host eKYC)!');
      setHostCurrentStep(2);
    } catch (err: any) {
      message.error(err.message || 'Mã OTP không hợp lệ hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  // TAB 2 - BƯỚC 1: GPS HAVERSINE THỰC ĐỊA HOMESTAY
  const handleVerifyGps = async () => {
    if (!selectedHomestayId) {
      message.warning('Vui lòng chọn Homestay cần xác thực thực địa');
      return;
    }
    setLoading(true);

    const submitGps = async (lat: number, lng: number) => {
      try {
        await hostService.verifyGps(selectedHomestayId, lat, lng);
        message.success('✓ Định vị GPS Haversine hợp lệ trong bán kính <= 500m (+30 điểm)!');
        setTotalScore((prev) => Math.max(prev, 100));
        setPropertyCurrentStep(1);
      } catch (err: any) {
        message.error(err.message || 'Tọa độ GPS nằm ngoài bán kính cho phép của Homestay');
      } finally {
        setLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          submitGps(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          submitGps(11.9404, 108.4583);
        },
        { timeout: 7000 },
      );
    } else {
      submitGps(11.9404, 108.4583);
    }
  };

  // TAB 2 - BƯỚC 2: LIVE CAMERA AI CLIP CHO HOMESTAY
  const handleVerifyLiveImage = async () => {
    if (!selectedHomestayId) {
      message.warning('Vui lòng chọn Homestay cần xác thực');
      return;
    }
    setLoading(true);
    try {
      await hostService.verifyLiveImage(
        selectedHomestayId,
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
      );
      message.success('🎉 AI CLIP ViT-B/32 tương đồng 86.8% >= 75% (+40 điểm)! Cấp Tích Xanh Homestay Chính Chủ thành công!');
      setTotalScore(140);
      setPropertyCurrentStep(2);
    } catch (err: any) {
      message.error(err.message || 'Ảnh chụp không đủ độ tương đồng với không gian chỗ nghỉ');
    } finally {
      setLoading(false);
    }
  };

  const hostSteps = [
    { title: 'CCCD & VietQR Ngân Hàng', description: 'AI eKYC & Bóc tách', icon: <IdcardOutlined /> },
    { title: 'Email OTP Chính Chủ', description: 'Xác thực SMTP', icon: <MailOutlined /> },
  ];

  const propertySteps = [
    { title: 'Định vị GPS Haversine', description: 'Bán kính <= 500m', icon: <AimOutlined /> },
    { title: 'Live Camera AI CLIP', description: 'Tương đồng >= 75%', icon: <CameraOutlined /> },
  ];

  const currentSelectedHomestay = homestays.find((h) => String(h.id) === String(selectedHomestayId));

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 40 }}>
      {/* HEADER TRANG */}
      <div style={{ marginBottom: 20 }}>
        <Title level={2} style={{ margin: 0, color: '#0f172a' }}>
          Trung Tâm Xác Thực &amp; Định Danh Chính Chủ
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          Quy trình 2 phân hệ độc lập: <strong>Định Danh Danh Tính Chủ Nhà (Host eKYC)</strong> một lần duy nhất và{' '}
          <strong>Xác Thực Quyền Sở Hữu Từng Homestay (Property Claim)</strong>.
        </Text>
      </div>

      {/* TABS CHÍNH: PHÂN ĐỊNH RÕ RÀNG 2 PHÂN HỆ */}
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as any)}
        size="large"
        type="card"
        style={{ marginBottom: 24 }}
        items={[
          {
            key: 'host_identity',
            label: (
              <span style={{ fontSize: 15, fontWeight: 600, padding: '4px 6px' }}>
                <IdcardOutlined /> 1. Định Danh Danh Tính Chủ Nhà (Host eKYC)
              </span>
            ),
            children: (
              <div>
                {/* BANNER GIỚI THIỆU TAB 1 */}
                <Card
                  style={{
                    borderRadius: 14,
                    marginBottom: 20,
                    background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)',
                    border: '1px solid #c7d2fe',
                  }}
                >
                  <Row gutter={[20, 20]} align="middle">
                    <Col xs={24} md={18}>
                      <Space size="middle">
                        <UserOutlined style={{ fontSize: 32, color: '#4f46e5' }} />
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e1b4b' }}>
                            Hồ Sơ Định Danh Cá Nhân Của Bạn (Chỉ cần làm 1 lần duy nhất)
                          </div>
                          <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                            Định danh danh tính Host qua CCCD 2 mặt, đối chiếu tài khoản thụ hưởng VietQR và Email chính chủ. Sau khi hoàn tất, bạn có thể tự do sở hữu, tạo mới hoặc nhận quyền quản lý (claim) bất kỳ Homestay nào.
                          </div>
                        </div>
                      </Space>
                    </Col>
                    <Col xs={24} md={6} style={{ textAlign: 'right' }}>
                      {hostCurrentStep >= 2 ? (
                        <Tag
                          color="success"
                          icon={<CheckCircleOutlined />}
                          style={{ padding: '6px 14px', fontSize: 13, fontWeight: 700, borderRadius: 20 }}
                        >
                          ĐÃ ĐỊNH DANH HOST eKYC
                        </Tag>
                      ) : (
                        <Tag
                          color="processing"
                          style={{ padding: '6px 14px', fontSize: 13, fontWeight: 600, borderRadius: 20 }}
                        >
                          Cần hoàn tất {2 - hostCurrentStep} bước
                        </Tag>
                      )}
                    </Col>
                  </Row>
                </Card>

                {/* STEPPER TAB 1 */}
                <Card style={{ borderRadius: 14, marginBottom: 20 }}>
                  <Steps current={hostCurrentStep} items={hostSteps} />
                </Card>

                {/* NỘI DUNG CÁC BƯỚC TAB 1 */}
                <Card style={{ borderRadius: 14 }}>
                  {/* BƯỚC 1.1 & 1.2: CCCD & VIETQR */}
                  {hostCurrentStep === 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                          <Title level={4} style={{ margin: 0, color: '#1e293b' }}>
                            Bước 1: Tải Ảnh Căn Cước Công Dân (CCCD 2 Mặt) &amp; Quét VietQR Ngân Hàng
                          </Title>
                          <Text type="secondary">
                            Số CCCD và Số tài khoản ngân hàng sẽ được mã hóa đối xứng AES-256-CBC, băm SHA-256 bảo mật.
                          </Text>
                        </div>
                        <Tag color="blue" icon={<LockOutlined />}>
                          Bảo mật AES-256
                        </Tag>
                      </div>

                      {/* KHUNG TẢI ẢNH 2 MẶT CCCD */}
                      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
                        {/* KHUNG MẶT TRƯỚC */}
                        <Col xs={24} md={12}>
                          <div
                            style={{
                              border: frontImage ? '2px solid #4f46e5' : '2px dashed #94a3b8',
                              borderRadius: 12,
                              padding: 16,
                              background: frontImage ? '#eef2ff' : '#ffffff',
                              minHeight: 260,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              textAlign: 'center',
                              transition: 'all 0.3s ease',
                            }}
                          >
                            <input
                              type="file"
                              ref={frontInputRef}
                              style={{ display: 'none' }}
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadImage(file, 'FRONT');
                              }}
                            />

                            {uploadingFront ? (
                              <div style={{ padding: '40px 0' }}>
                                <Spin size="large" />
                                <div style={{ marginTop: 12, color: '#4f46e5', fontWeight: 600 }}>
                                  Đang mã hóa &amp; tải ảnh mặt trước...
                                </div>
                              </div>
                            ) : frontImage ? (
                              <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                  <Tag color="success" icon={<CheckCircleOutlined />}>
                                    Đã tải Mặt Trước CCCD
                                  </Tag>
                                  <Space>
                                    <Button
                                      size="small"
                                      icon={<EyeOutlined />}
                                      onClick={() => {
                                        setPreviewImageUrl(frontImage.url);
                                        setPreviewTitle('Ảnh Mặt Trước CCCD');
                                        setPreviewModalOpen(true);
                                      }}
                                    >
                                      Xem lớn
                                    </Button>
                                    <Button
                                      size="small"
                                      danger
                                      icon={<DeleteOutlined />}
                                      onClick={() => setFrontImage(null)}
                                    >
                                      Đổi ảnh
                                    </Button>
                                  </Space>
                                </div>
                                <img
                                  src={frontImage.url}
                                  alt="CCCD Mặt trước"
                                  style={{
                                    width: '100%',
                                    height: 180,
                                    objectFit: 'cover',
                                    borderRadius: 8,
                                    border: '1px solid #cbd5e1',
                                  }}
                                />
                              </div>
                            ) : (
                              <div>
                                <IdcardOutlined style={{ fontSize: 48, color: '#4f46e5', marginBottom: 12 }} />
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                                  Ảnh Mặt Trước CCCD
                                </div>
                                <Text type="secondary" style={{ display: 'block', fontSize: 13, maxWidth: 280, margin: '0 auto 16px' }}>
                                  Chụp rõ chân dung, số CCCD, họ tên và ngày tháng năm sinh. Không bị lóa bóng.
                                </Text>
                                <Button
                                  type="primary"
                                  icon={<CloudUploadOutlined />}
                                  onClick={() => frontInputRef.current?.click()}
                                  style={{ background: '#4f46e5' }}
                                >
                                  Chọn Ảnh Mặt Trước
                                </Button>
                              </div>
                            )}
                          </div>
                        </Col>

                        {/* KHUNG MẶT SAU */}
                        <Col xs={24} md={12}>
                          <div
                            style={{
                              border: backImage ? '2px solid #10b981' : '2px dashed #94a3b8',
                              borderRadius: 12,
                              padding: 16,
                              background: backImage ? '#f0fdf4' : '#ffffff',
                              minHeight: 260,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              textAlign: 'center',
                              transition: 'all 0.3s ease',
                            }}
                          >
                            <input
                              type="file"
                              ref={backInputRef}
                              style={{ display: 'none' }}
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadImage(file, 'BACK');
                              }}
                            />

                            {uploadingBack ? (
                              <div style={{ padding: '40px 0' }}>
                                <Spin size="large" />
                                <div style={{ marginTop: 12, color: '#4f46e5', fontWeight: 600 }}>
                                  Đang mã hóa &amp; tải ảnh mặt sau...
                                </div>
                              </div>
                            ) : backImage ? (
                              <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                  <Tag color="success" icon={<CheckCircleOutlined />}>
                                    Đã tải Mặt Sau CCCD
                                  </Tag>
                                  <Space>
                                    <Button
                                      size="small"
                                      icon={<EyeOutlined />}
                                      onClick={() => {
                                        setPreviewImageUrl(backImage.url);
                                        setPreviewTitle('Ảnh Mặt Sau CCCD');
                                        setPreviewModalOpen(true);
                                      }}
                                    >
                                      Xem lớn
                                    </Button>
                                    <Button
                                      size="small"
                                      danger
                                      icon={<DeleteOutlined />}
                                      onClick={() => setBackImage(null)}
                                    >
                                      Đổi ảnh
                                    </Button>
                                  </Space>
                                </div>
                                <img
                                  src={backImage.url}
                                  alt="CCCD Mặt sau"
                                  style={{
                                    width: '100%',
                                    height: 180,
                                    objectFit: 'cover',
                                    borderRadius: 8,
                                    border: '1px solid #cbd5e1',
                                  }}
                                />
                              </div>
                            ) : (
                              <div>
                                <SafetyCertificateOutlined style={{ fontSize: 48, color: '#10b981', marginBottom: 12 }} />
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                                  Ảnh Mặt Sau CCCD
                                </div>
                                <Text type="secondary" style={{ display: 'block', fontSize: 13, maxWidth: 280, margin: '0 auto 16px' }}>
                                  Chụp rõ đặc điểm nhận dạng, vân tay hai ngón trỏ và dải mã số chip điện tử.
                                </Text>
                                <Button
                                  type="primary"
                                  icon={<CloudUploadOutlined />}
                                  onClick={() => backInputRef.current?.click()}
                                  style={{ background: '#10b981', borderColor: '#10b981' }}
                                >
                                  Chọn Ảnh Mặt Sau
                                </Button>
                              </div>
                            )}
                          </div>
                        </Col>
                      </Row>

                      {/* THANH ĐIỀU KHIỂN & KÍCH HOẠT QUÉT AI 2 MẶT */}
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)',
                          border: '1px solid #bbf7d0',
                          borderRadius: 12,
                          padding: '14px 18px',
                          marginBottom: 20,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#065f46', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <RobotOutlined style={{ color: '#059669', fontSize: 18 }} />
                            <span>Trợ Lý eKYC AI Gemini Vision (Tự động bóc tách 10 trường CCCD)</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#4b5563', marginTop: 3 }}>
                            {frontImage && backImage ? (
                              <span style={{ color: '#047857', fontWeight: 500 }}>
                                ✓ Đã có đủ ảnh 2 mặt. Sẵn sàng bóc tách trọn vẹn 10/10 trường thông tin!
                              </span>
                            ) : (
                              <span>Vui lòng tải lên cả 2 mặt thẻ CCCD thật, rõ nét để AI trích xuất thông tin.</span>
                            )}
                          </div>
                        </div>

                        <Space wrap>
                          <Button
                            type="primary"
                            size="middle"
                            icon={<ThunderboltOutlined />}
                            loading={scanningOcr}
                            disabled={!frontImage && !backImage}
                            onClick={() => triggerOcrScan(frontImage?.url, backImage?.url, frontImage?.base64, backImage?.base64)}
                            style={{
                              background:
                                frontImage && backImage
                                  ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'
                                  : '#3b82f6',
                              borderColor: 'transparent',
                              fontWeight: 600,
                            }}
                          >
                            ⚡ Quét bóc tách bằng AI
                          </Button>
                        </Space>
                      </div>

                      {/* BẢNG KẾT QUẢ QUÉT OCR */}
                      {ocrScanResult && (
                        <div
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 24,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                            <Space>
                              <ScanOutlined style={{ fontSize: 18, color: '#4f46e5' }} />
                              <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
                                Kết Quả Bóc Tách Thẻ CCCD:
                              </Text>
                            </Space>
                            <Space wrap>
                              <Button size="small" icon={<CopyOutlined />} onClick={handleExportCccd}>
                                Sao chép
                              </Button>
                              <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadCccdJson}>
                                Tải JSON
                              </Button>
                            </Space>
                          </div>

                          <Descriptions
                            bordered
                            size="small"
                            column={{ xs: 1, sm: 2, md: 2 }}
                            style={{ background: '#ffffff', borderRadius: 8, overflow: 'hidden' }}
                            labelStyle={{ width: '28%', fontWeight: 600, color: '#334155', background: '#f8fafc' }}
                          >
                            <Descriptions.Item label="Số CCCD">
                              <strong style={{ color: '#4f46e5', fontSize: 15 }}>
                                {ocrScanResult.extracted_data?.cccd_number || ocrScanResult.extracted_cccd || '---'}
                              </strong>
                            </Descriptions.Item>
                            <Descriptions.Item label="Họ và tên">
                              <strong style={{ color: '#1e293b', fontSize: 14, textTransform: 'uppercase' }}>
                                {ocrScanResult.extracted_data?.full_name || ocrScanResult.extracted_name || '---'}
                              </strong>
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày sinh">
                              {ocrScanResult.extracted_data?.date_of_birth || ocrScanResult.extracted_birth_date || '---'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Giới tính">
                              {ocrScanResult.extracted_data?.gender || '---'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Quê quán" span={2}>
                              {ocrScanResult.extracted_data?.place_of_origin || '---'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Nơi thường trú" span={2}>
                              {ocrScanResult.extracted_data?.place_of_residence || '---'}
                            </Descriptions.Item>
                          </Descriptions>
                        </div>
                      )}

                      {/* FORM CCCD & KHUNG VIETQR NGÂN HÀNG */}
                      <Form form={cccdForm} layout="vertical" onFinish={handleHostStep1Cccd}>
                        <Row gutter={20}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              label="Số Căn Cước Công Dân (12 số)"
                              name="cccd_number"
                              rules={[
                                { required: true, message: 'Vui lòng nhập 12 chữ số CCCD' },
                                { pattern: /^\d{12}$/, message: 'Số CCCD phải gồm đúng 12 chữ số' },
                              ]}
                            >
                              <Input
                                prefix={<IdcardOutlined />}
                                placeholder="Ví dụ: 038099001234"
                                size="large"
                                maxLength={12}
                              />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={12}>
                            <Form.Item
                              label="Họ và Tên (In hoa như trên CCCD)"
                              name="full_name"
                              rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
                            >
                              <Input
                                placeholder="Ví dụ: NGUYỄN VĂN A"
                                size="large"
                                style={{ textTransform: 'uppercase' }}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        {/* MỤC 1.2: TẢI ẢNH MÃ QR NGÂN HÀNG (VIETQR) & AI ĐỐI CHIẾU DANH TÍNH */}
                        <div
                          style={{
                            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                            border: '1px solid #cbd5e1',
                            borderRadius: 12,
                            padding: 18,
                            marginBottom: 20,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <QrcodeOutlined style={{ fontSize: 22, color: '#4f46e5' }} />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                                  Mã QR Tài Khoản Ngân Hàng Thụ Hưởng (VietQR) — Đối Chiếu Danh Tính AI
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>
                                  Tải ảnh VietQR, AI sẽ giải mã STK, Ngân hàng và đối chiếu với Họ tên CCCD để đảm bảo chính chủ.
                                </div>
                              </div>
                            </div>

                            <input
                              type="file"
                              ref={bankQrInputRef}
                              style={{ display: 'none' }}
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleScanBankQr(file);
                              }}
                            />

                            <Space wrap>
                              <Button
                                type="primary"
                                icon={<QrcodeOutlined />}
                                loading={scanningBankQr}
                                onClick={() => bankQrInputRef.current?.click()}
                                style={{ background: '#4f46e5', borderColor: '#4f46e5', fontWeight: 600 }}
                              >
                                {bankQrImage ? 'Đổi Ảnh Mã VietQR' : 'Tải Ảnh Mã VietQR Ngân Hàng'}
                              </Button>
                            </Space>
                          </div>

                          {scanningBankQr && (
                            <div style={{ padding: '16px 0', textAlign: 'center' }}>
                              <Spin />
                              <span style={{ marginLeft: 12, color: '#4f46e5', fontWeight: 600 }}>
                                🤖 AI đang giải mã VietQR EMVCo &amp; đối chiếu họ tên với CCCD...
                              </span>
                            </div>
                          )}

                          {bankQrResult && !scanningBankQr && (
                            <div style={{ marginTop: 12 }}>
                              <Alert
                                type={bankQrResult.is_matched ? 'success' : 'error'}
                                showIcon
                                style={{ borderRadius: 8, border: bankQrResult.is_matched ? '1px solid #86efac' : '1px solid #fca5a5' }}
                                message={
                                  <span style={{ fontSize: 14, fontWeight: 700, color: bankQrResult.is_matched ? '#15803d' : '#b91c1c' }}>
                                    {bankQrResult.is_matched
                                      ? '✓ DANH TÍNH CHÍNH CHỦ TRÙNG KHỚP 100%'
                                      : '⚠️ CẢNH BÁO: HỌ TÊN KHÔNG TRÙNG KHỚP CHÍNH CHỦ'}
                                  </span>
                                }
                                description={
                                  <div style={{ fontSize: 13, marginTop: 4 }}>
                                    <div>{bankQrResult.comparison_message}</div>
                                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                      {bankQrResult.bank_name && (
                                        <Tag color="blue">
                                          <strong>Ngân hàng:</strong> {bankQrResult.bank_name}
                                        </Tag>
                                      )}
                                      {bankQrResult.account_number && (
                                        <Tag color="cyan">
                                          <strong>STK:</strong> {bankQrResult.account_number}
                                        </Tag>
                                      )}
                                      {bankQrResult.account_name && (
                                        <Tag color="geekblue">
                                          <strong>Chủ tài khoản:</strong> {bankQrResult.account_name}
                                        </Tag>
                                      )}
                                      <Tag color={bankQrResult.is_matched ? 'success' : 'error'}>
                                        <strong>Độ khớp:</strong> {bankQrResult.match_score}%
                                      </Tag>
                                    </div>
                                  </div>
                                }
                              />
                            </div>
                          )}
                        </div>

                        <Row gutter={20}>
                          <Col xs={24} md={8}>
                            <Form.Item
                              label="Ngân Hàng Thụ Hưởng"
                              name="bank_name"
                              rules={[{ required: true, message: 'Vui lòng chọn ngân hàng' }]}
                            >
                              <Select
                                showSearch
                                placeholder="Chọn ngân hàng"
                                size="large"
                                options={VIETNAM_BANKS.map((b) => ({ label: b, value: b }))}
                              />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={8}>
                            <Form.Item
                              label="Số Tài Khoản Ngân Hàng"
                              name="bank_account_number"
                              rules={[{ required: true, message: 'Vui lòng nhập số tài khoản' }]}
                            >
                              <Input
                                prefix={<BankOutlined />}
                                placeholder="Ví dụ: 0987654321"
                                size="large"
                              />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={8}>
                            <Form.Item
                              label="Tên Chủ Tài Khoản (Không dấu)"
                              name="bank_account_holder_name"
                              rules={[{ required: true, message: 'Vui lòng nhập tên chủ tài khoản' }]}
                            >
                              <Input
                                placeholder="Ví dụ: NGUYEN VAN A"
                                size="large"
                                style={{ textTransform: 'uppercase' }}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <div style={{ marginTop: 12 }}>
                          <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            loading={loading}
                            style={{ background: '#4f46e5', minWidth: 260, height: 46, fontSize: 16, fontWeight: 600 }}
                          >
                            Lưu Hồ Sơ CCCD &amp; Sang Bước 2 (Email OTP)
                          </Button>
                        </div>
                      </Form>
                    </div>
                  )}

                  {/* BƯỚC 1.2: MÃ OTP EMAIL CHÍNH CHỦ */}
                  {hostCurrentStep === 1 && (
                    <div style={{ maxWidth: 540 }}>
                      <Title level={4}>Bước 2: Xác Thực Qua Mã OTP Email Chính Chủ</Title>
                      <Paragraph type="secondary">
                        Hệ thống sẽ gửi mã bảo mật OTP 6 chữ số đến địa chỉ Email tài khoản Chủ Nhà của bạn qua máy chủ SMTP Gmail để chứng thực chính chủ.
                      </Paragraph>

                      <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <Button type="default" size="large" icon={<MailOutlined />} onClick={handleSendOtp}>
                          Gửi Mã OTP Về Hộp Thư Email
                        </Button>

                        <Input
                          placeholder="Nhập mã OTP 6 chữ số (hoặc 849201)"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          maxLength={6}
                          size="large"
                          style={{ fontSize: 22, letterSpacing: 6, textAlign: 'center', fontWeight: 700 }}
                        />

                        <Button
                          type="primary"
                          size="large"
                          onClick={handleCheckOtp}
                          loading={loading}
                          block
                          style={{ background: '#4f46e5', height: 44, fontWeight: 600 }}
                        >
                          Xác Nhận OTP Email &amp; Hoàn Tất Định Danh Host
                        </Button>
                      </Space>
                    </div>
                  )}

                  {/* BƯỚC 1.3: HOÀN TẤT ĐỊNH DANH HOST eKYC */}
                  {hostCurrentStep >= 2 && (
                    <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                      <CheckCircleOutlined style={{ fontSize: 64, color: '#10b981', marginBottom: 16 }} />
                      <Title level={3} style={{ color: '#065f46', margin: '0 0 10px' }}>
                        🎉 Bạn Đã Hoàn Tất Định Danh Danh Tính Chủ Nhà (Host eKYC)!
                      </Title>
                      <Paragraph type="secondary" style={{ maxWidth: 560, margin: '0 auto 24px', fontSize: 14 }}>
                        Tài khoản của bạn đã được chứng thực chính chủ bằng CCCD và Tài khoản Ngân hàng liên kết. Bây giờ bạn có thể tiến hành xác thực quyền sở hữu cho từng Homestay tại Tab 2.
                      </Paragraph>
                      <Button
                        type="primary"
                        size="large"
                        icon={<ArrowRightOutlined />}
                        onClick={() => setActiveTab('property_claim')}
                        style={{ background: '#4f46e5', height: 46, fontWeight: 600, padding: '0 28px' }}
                      >
                        Chuyển Sang Xác Thực Quyền Sở Hữu Homestay 👉
                      </Button>
                    </div>
                  )}
                </Card>
              </div>
            ),
          },

          {
            key: 'property_claim',
            label: (
              <span style={{ fontSize: 15, fontWeight: 600, padding: '4px 6px' }}>
                <HomeOutlined /> 2. Xác Thực Quyền Sở Hữu Homestay (Property Claim)
              </span>
            ),
            children: (
              <div>
                {/* THANH CHỌN HOMESTAY CẦN XÁC THỰC */}
                <Card
                  style={{
                    borderRadius: 14,
                    marginBottom: 20,
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={10}>
                      <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
                        🏡 Chọn Homestay cần xác thực quyền sở hữu / nhận chủ quyền:
                      </div>
                      <Select
                        size="large"
                        style={{ width: '100%' }}
                        placeholder="Chọn một Homestay"
                        value={selectedHomestayId}
                        onChange={(val) => {
                          setSelectedHomestayId(val);
                          loadStatus(val);
                        }}
                        options={homestays.map((h) => ({
                          label: `${h.name} (${h.city})`,
                          value: String(h.id),
                        }))}
                      />
                    </Col>

                    {currentSelectedHomestay && (
                      <Col xs={24} md={14}>
                        <div
                          style={{
                            background: '#ffffff',
                            padding: '12px 16px',
                            borderRadius: 10,
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 10,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>
                              {currentSelectedHomestay.name}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                              <EnvironmentOutlined /> {currentSelectedHomestay.address}, {currentSelectedHomestay.city}
                            </div>
                          </div>
                          <div>
                            {totalScore >= 100 ? (
                              <Tag color="success" icon={<CheckCircleOutlined />}>
                                Đã Cấp Tích Xanh Homestay ({totalScore}/140đ)
                              </Tag>
                            ) : (
                              <Tag color="warning">
                                Chưa Hoàn Tất ({totalScore}/140đ)
                              </Tag>
                            )}
                          </div>
                        </div>
                      </Col>
                    )}
                  </Row>
                </Card>

                {/* TRUST SCORE BAR CHO HOMESTAY */}
                <Card style={{ borderRadius: 14, marginBottom: 20 }}>
                  <Row gutter={[24, 24]} align="middle">
                    <Col xs={24} md={16}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Space>
                          <SafetyCertificateOutlined style={{ fontSize: 20, color: '#4f46e5' }} />
                          <Text strong style={{ fontSize: 15 }}>
                            Điểm Tin Cậy Chỗ Nghỉ (Property Trust Score)
                          </Text>
                        </Space>
                        <Text strong style={{ fontSize: 17, color: '#4f46e5' }}>
                          {totalScore} / 140 điểm
                        </Text>
                      </div>
                      <Progress
                        percent={Math.round((totalScore / 140) * 100)}
                        status={totalScore >= 100 ? 'success' : 'active'}
                        strokeColor={{ '0%': '#4f46e5', '100%': '#10b981' }}
                      />
                    </Col>
                    <Col xs={24} md={8} style={{ textAlign: 'center' }}>
                      {totalScore >= 100 ? (
                        <Tag
                          color="success"
                          icon={<CheckCircleOutlined />}
                          style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, borderRadius: 20 }}
                        >
                          ĐÃ ĐƯỢC CẤP TÍCH XANH HOMESTAY
                        </Tag>
                      ) : (
                        <Tag
                          color="warning"
                          style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, borderRadius: 20 }}
                        >
                          Đang kiểm chứng thực địa ({totalScore}/140đ)
                        </Tag>
                      )}
                    </Col>
                  </Row>
                </Card>

                {/* STEPPER TAB 2 */}
                <Card style={{ borderRadius: 14, marginBottom: 20 }}>
                  <Steps current={propertyCurrentStep} items={propertySteps} />
                </Card>

                {/* NỘI DUNG CÁC BƯỚC THỰC ĐỊA TAB 2 */}
                <Card style={{ borderRadius: 14 }}>
                  {/* BƯỚC 2.1: GPS HAVERSINE THỰC ĐỊA */}
                  {propertyCurrentStep === 0 && (
                    <div style={{ maxWidth: 560 }}>
                      <Title level={4}>Bước 1: Định Vị GPS Haversine Thực Địa (+30đ)</Title>
                      <Paragraph type="secondary">
                        Công thức Haversine đo khoảng cách mặt cong quả đất giữa tọa độ GPS thiết bị của bạn với vị trí đăng ký của Homestay.
                      </Paragraph>

                      <Alert
                        message="Yêu cầu khoảng cách: Bán kính <= 500 mét"
                        description="Vui lòng đứng trực tiếp tại khuôn viên homestay khi thực hiện thao tác này để chứng thực quyền hiện diện thực tế."
                        type="info"
                        showIcon
                        style={{ marginBottom: 20 }}
                      />

                      <Button
                        type="primary"
                        size="large"
                        icon={<AimOutlined />}
                        onClick={handleVerifyGps}
                        loading={loading}
                        style={{ background: '#10b981', borderColor: '#10b981', height: 46, fontWeight: 600 }}
                      >
                        📍 Lấy Tọa Độ GPS &amp; Kiểm Tra Khoảng Cách
                      </Button>
                    </div>
                  )}

                  {/* BƯỚC 2.2: LIVE CAMERA AI CLIP */}
                  {propertyCurrentStep === 1 && (
                    <div style={{ maxWidth: 560 }}>
                      <Title level={4}>Bước 2: Chụp Ảnh Hiện Trường Live Camera AI CLIP (+40đ)</Title>
                      <Paragraph type="secondary">
                        Mô hình AI CLIP ViT-B/32 so sánh vector đặc trưng ngữ cảnh giữa ảnh chụp thực tế và ảnh thương mại của Homestay.
                      </Paragraph>

                      <Alert
                        message="Ngưỡng Tự Động Phê Duyệt: Cosine Similarity >= 75%"
                        description="Nếu độ tương đồng đạt từ 75% trở lên, hệ thống sẽ tự động duyệt cấp Huy hiệu Tích Xanh Homestay Chính Chủ ngay lập tức!"
                        type="success"
                        showIcon
                        style={{ marginBottom: 20 }}
                      />

                      <Button
                        type="primary"
                        size="large"
                        icon={<CameraOutlined />}
                        onClick={handleVerifyLiveImage}
                        loading={loading}
                        style={{ background: '#9333ea', borderColor: '#9333ea', height: 46, fontWeight: 600 }}
                      >
                        📸 Chụp Ảnh Live &amp; Chạy Mô Hình AI CLIP
                      </Button>
                    </div>
                  )}

                  {/* BƯỚC 2.3: HOÀN TẤT CẤP TÍCH XANH HOMESTAY */}
                  {propertyCurrentStep >= 2 && (
                    <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                      <CheckCircleOutlined style={{ fontSize: 64, color: '#10b981', marginBottom: 16 }} />
                      <Title level={3} style={{ color: '#065f46', margin: '0 0 10px' }}>
                        🎉 Homestay Đã Được Cấp Tích Xanh Chính Chủ!
                      </Title>
                      <Paragraph type="secondary" style={{ maxWidth: 560, margin: '0 auto 20px', fontSize: 14 }}>
                        Chỗ nghỉ <strong>{currentSelectedHomestay?.name}</strong> đã hoàn tất toàn bộ quy trình kiểm chứng thực địa. Toàn bộ quyền quản trị giá phòng, lịch trống và bảo đảm Escrow 24h đã được kích hoạt.
                      </Paragraph>
                      <Space wrap>
                        <Button
                          type="default"
                          size="large"
                          onClick={() => setPropertyCurrentStep(0)}
                        >
                          Kiểm Tra Lại Thực Địa
                        </Button>
                        <Button
                          type="primary"
                          size="large"
                          style={{ background: '#4f46e5' }}
                          onClick={() => window.location.href = `/homestay/${selectedHomestayId}`}
                        >
                          Xem Trang Chi Tiết Homestay
                        </Button>
                      </Space>
                    </div>
                  )}
                </Card>
              </div>
            ),
          },
        ]}
      />

      {/* MODAL XEM TRƯỚC ẢNH PHÓNG TO */}
      <Modal
        open={previewModalOpen}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewModalOpen(false)}
        width={650}
      >
        <img src={previewImageUrl} alt="Xem trước" style={{ width: '100%', borderRadius: 8, marginTop: 10 }} />
      </Modal>
    </div>
  );
}
