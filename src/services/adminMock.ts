import type {
    DashboardOverview,
    UserItem,
    HostVerification,
    HomestayPending,
    PayoutItem,
    RefundRequest,
    SystemConfig,
    AuditLog,
} from '../types/admin';

// ====================== DASHBOARD ======================
export const mockDashboard: DashboardOverview = {
    totalCustomers: 1250,
    totalHosts: 180,
    totalHomestays: 240,
    pendingHomestays: 6,
    pendingVerifications: 4,
    totalBookings: 3420,
    monthlyGrossRevenue: 750_000_000,
    monthlyCommissionEarned: 75_000_000,
    pendingPayoutAmount: 675_000_000,
};

export const mockRevenueChart = [
    { month: 'T4', type: 'Doanh thu', value: 520000000 },
    { month: 'T4', type: 'Hoa hồng', value: 52000000 },
    { month: 'T5', type: 'Doanh thu', value: 610000000 },
    { month: 'T5', type: 'Hoa hồng', value: 61000000 },
    { month: 'T6', type: 'Doanh thu', value: 580000000 },
    { month: 'T6', type: 'Hoa hồng', value: 58000000 },
    { month: 'T7', type: 'Doanh thu', value: 720000000 },
    { month: 'T7', type: 'Hoa hồng', value: 72000000 },
    { month: 'T8', type: 'Doanh thu', value: 690000000 },
    { month: 'T8', type: 'Hoa hồng', value: 69000000 },
    { month: 'T9', type: 'Doanh thu', value: 750000000 },
    { month: 'T9', type: 'Hoa hồng', value: 75000000 },
];

// ====================== USERS ======================
export const mockUsers: UserItem[] = [
    { id: 1, fullName: 'Nguyễn Văn An', email: 'an.nguyen@gmail.com', phone: '0901234567', role: 'CUSTOMER', status: 'ACTIVE', createdAt: '2026-01-15' },
    { id: 2, fullName: 'Trần Thị Bình', email: 'binh.tran@gmail.com', phone: '0912345678', role: 'HOST', status: 'ACTIVE', createdAt: '2026-02-20' },
    { id: 3, fullName: 'Lê Minh Cường', email: 'cuong.le@gmail.com', phone: '0923456789', role: 'HOST', status: 'BLOCKED', createdAt: '2026-03-10' },
    { id: 4, fullName: 'Phạm Thu Hà', email: 'ha.pham@gmail.com', phone: '0934567890', role: 'CUSTOMER', status: 'ACTIVE', createdAt: '2026-04-05' },
    { id: 5, fullName: 'Hoàng Đức Khoa', email: 'khoa.hoang@gmail.com', phone: '0945678901', role: 'ADMIN', status: 'ACTIVE', createdAt: '2025-12-01' },
    { id: 6, fullName: 'Vũ Thị Lan', email: 'lan.vu@gmail.com', phone: '0956789012', role: 'HOST', status: 'PENDING', createdAt: '2026-09-18' },
];

// ====================== HOST VERIFICATIONS ======================
export const mockVerifications: HostVerification[] = [
    {
        id: 14,
        hostId: 10,
        hostName: 'Trần Văn Bình',
        hostEmail: 'binh.tran@gmail.com',
        docType: 'CCCD',
        docUrlFront: 'https://via.placeholder.com/400x250?text=CCCD+Mat+Truoc',
        docUrlBack: 'https://via.placeholder.com/400x250?text=CCCD+Mat+Sau',
        status: 'PENDING',
        createdAt: '2026-09-20T10:00:00Z',
    },
    {
        id: 15,
        hostId: 12,
        hostName: 'Lê Minh Cường',
        hostEmail: 'cuong.le@gmail.com',
        docType: 'CCCD',
        docUrlFront: 'https://via.placeholder.com/400x250?text=CCCD+Front',
        docUrlBack: 'https://via.placeholder.com/400x250?text=CCCD+Back',
        status: 'PENDING',
        createdAt: '2026-09-21T14:30:00Z',
    },
    {
        id: 16,
        hostId: 18,
        hostName: 'Phạm Thu Hà',
        hostEmail: 'ha.pham@gmail.com',
        docType: 'PASSPORT',
        docUrlFront: 'https://via.placeholder.com/400x250?text=Passport',
        docUrlBack: '',
        status: 'APPROVED',
        reviewNote: 'Giấy tờ hợp lệ',
        createdAt: '2026-09-15T09:00:00Z',
    },
];

// ====================== HOMESTAYS PENDING ======================
export const mockHomestays: HomestayPending[] = [
    {
        id: 25,
        title: 'Villa Ba Vì Mountain View',
        hostName: 'Trần Văn Bình',
        city: 'Hà Nội',
        propertyType: 'Villa Biệt thự',
        status: 'PENDING',
        createdAt: '2026-09-18',
        thumbnail: 'https://via.placeholder.com/120x80?text=Villa+BaVi',
    },
    {
        id: 26,
        title: 'Homestay Hồ Tây Panorama',
        hostName: 'Lê Minh Cường',
        city: 'Hà Nội',
        propertyType: 'Căn hộ Studio',
        status: 'PENDING',
        createdAt: '2026-09-19',
        thumbnail: 'https://via.placeholder.com/120x80?text=Ho+Tay',
    },
    {
        id: 27,
        title: 'Bungalow Sapa View',
        hostName: 'Vũ Thị Lan',
        city: 'Lào Cai',
        propertyType: 'Nhà gỗ Bungalow',
        status: 'PENDING',
        createdAt: '2026-09-21',
        thumbnail: 'https://via.placeholder.com/120x80?text=Sapa',
    },
];

// ====================== PAYOUTS ======================
export const mockPayouts: PayoutItem[] = [
    {
        id: 89,
        hostName: 'Trần Văn Bình',
        amount: 45_000_000,
        bankName: 'MB Bank',
        accountNumber: '0123456789',
        status: 'PENDING',
        month: 9,
        year: 2026,
    },
    {
        id: 90,
        hostName: 'Lê Minh Cường',
        amount: 32_500_000,
        bankName: 'Vietcombank',
        accountNumber: '9876543210',
        status: 'CALCULATED',
        month: 9,
        year: 2026,
    },
    {
        id: 88,
        hostName: 'Phạm Thu Hà',
        amount: 28_000_000,
        bankName: 'Techcombank',
        accountNumber: '1122334455',
        status: 'PAID',
        month: 8,
        year: 2026,
        transactionRef: 'MBBANK_FT20260830129',
        paidAt: '2026-08-30T10:00:00Z',
    },
];

// ====================== REFUNDS ======================
export const mockRefunds: RefundRequest[] = [
    {
        id: 12,
        bookingId: 100,
        customerName: 'Nguyễn Văn An',
        amount: 540_000,
        reason: 'Thay đổi kế hoạch công tác đột xuất',
        status: 'PENDING',
        createdAt: '2026-09-22T08:45:00Z',
    },
    {
        id: 13,
        bookingId: 105,
        customerName: 'Hoàng Đức Khoa',
        amount: 1_200_000,
        reason: 'Host chủ động hủy vì sự cố điện nước',
        status: 'PENDING',
        createdAt: '2026-09-21T16:20:00Z',
    },
    {
        id: 11,
        bookingId: 98,
        customerName: 'Vũ Thị Lan',
        amount: 800_000,
        reason: 'Hủy trước 7 ngày theo chính sách',
        status: 'COMPLETED',
        createdAt: '2026-09-10T11:00:00Z',
    },
];

// ====================== CONFIGS ======================
export const mockConfigs: SystemConfig[] = [
    { configKey: 'DEFAULT_COMMISSION_RATE', configValue: '10', description: 'Tỷ lệ hoa hồng mặc định (%)', updatedAt: '2026-09-01' },
    { configKey: 'DEPOSIT_PERCENT', configValue: '30', description: 'Phần trăm tiền cọc khi chọn DEPOSIT', updatedAt: '2026-08-15' },
    { configKey: 'BOOKING_HOLD_MINUTES', configValue: '15', description: 'Thời gian giữ chỗ PENDING_PAYMENT (phút)', updatedAt: '2026-07-20' },
    { configKey: 'CANCELLATION_FLEXIBLE_HOURS', configValue: '48', description: 'Số giờ hủy miễn phí (FLEXIBLE)', updatedAt: '2026-06-10' },
    { configKey: 'VAT_RATE', configValue: '8', description: 'Thuế VAT (%)', updatedAt: '2026-01-01' },
];

// ====================== AUDIT LOGS ======================
export const mockAuditLogs: AuditLog[] = [
    { id: 501, adminName: 'Super Admin', action: 'APPROVE_HOMESTAY', targetTable: 'HOMESTAYS', targetId: '25', createdAt: '2026-09-22T08:55:00Z' },
    { id: 500, adminName: 'Moderator A', action: 'APPROVE_VERIFICATION', targetTable: 'HOST_VERIFICATION_DOCUMENTS', targetId: '16', createdAt: '2026-09-21T15:30:00Z' },
    { id: 499, adminName: 'Finance Admin', action: 'PROCESS_PAYOUT', targetTable: 'PAYOUTS', targetId: '88', createdAt: '2026-09-20T10:00:00Z' },
    { id: 498, adminName: 'Super Admin', action: 'UPDATE_CONFIG', targetTable: 'SYSTEM_CONFIGS', targetId: 'DEFAULT_COMMISSION_RATE', createdAt: '2026-09-01T09:00:00Z' },
    { id: 497, adminName: 'Moderator B', action: 'BLOCK_USER', targetTable: 'USERS', targetId: '3', createdAt: '2026-08-28T14:20:00Z' },
];

// ====================== MOCK API FUNCTIONS ======================
const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export const adminApi = {
    getDashboard: async () => {
        await delay();
        return { overview: mockDashboard, revenueChart: mockRevenueChart };
    },

    getUsers: async () => {
        await delay();
        return mockUsers;
    },

    getVerifications: async () => {
        await delay();
        return mockVerifications;
    },

    getPendingHomestays: async () => {
        await delay();
        return mockHomestays;
    },

    getPayouts: async () => {
        await delay();
        return mockPayouts;
    },

    getRefunds: async () => {
        await delay();
        return mockRefunds;
    },

    getConfigs: async () => {
        await delay();
        return mockConfigs;
    },

    getAuditLogs: async () => {
        await delay();
        return mockAuditLogs;
    },

    crawlBookingHomestays: async (city: string, limit: number) => {
        const token = localStorage.getItem('stayai_access_token');
        const res = await fetch('http://localhost:3000/api/v1/admin/sync/crawl-booking-homestays', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ city, limit }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Lỗi khi cào dữ liệu từ RapidAPI');
        }
        return await res.json();
    },
};