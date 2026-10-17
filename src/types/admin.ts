export type AdminRole = 'SUPER_ADMIN' | 'MODERATOR' | 'FINANCE_ADMIN';

export interface DashboardOverview {
    totalCustomers: number;
    totalHosts: number;
    totalHomestays: number;
    pendingHomestays: number;
    pendingVerifications: number;
    totalBookings: number;
    monthlyGrossRevenue: number;
    monthlyCommissionEarned: number;
    pendingPayoutAmount: number;
}

export interface UserItem {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    role: 'CUSTOMER' | 'HOST' | 'ADMIN';
    status: 'ACTIVE' | 'BLOCKED' | 'PENDING';
    createdAt: string;
}

export interface HostVerification {
    id: number;
    hostId: number;
    hostName: string;
    hostEmail: string;
    docType: 'CCCD' | 'PASSPORT';
    docUrlFront: string;
    docUrlBack: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewNote?: string;
    createdAt: string;
}

export interface HomestayPending {
    id: number;
    title: string;
    hostName: string;
    city: string;
    propertyType: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    thumbnail: string;
}

export interface PayoutItem {
    id: number;
    hostName: string;
    amount: number;
    bankName: string;
    accountNumber: string;
    status: 'CALCULATED' | 'PENDING' | 'PAID' | 'FAILED';
    month: number;
    year: number;
    transactionRef?: string;
    paidAt?: string;
}

export interface RefundRequest {
    id: number;
    bookingId: number;
    customerName: string;
    amount: number;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    createdAt: string;
}

export interface SystemConfig {
    configKey: string;
    configValue: string;
    description: string;
    updatedAt: string;
}

export interface AuditLog {
    id: number;
    adminName: string;
    action: string;
    targetTable: string;
    targetId: string;
    createdAt: string;
}