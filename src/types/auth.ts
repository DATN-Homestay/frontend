export type UserRole = 'CUSTOMER' | 'HOST' | 'ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  avatar_url?: string;
  roles: UserRole[];
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user: UserProfile;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string;
  role: 'CUSTOMER' | 'HOST';
}
