export type UserRole = 'CUSTOMER' | 'HOST' | 'ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string | null;
  avatar_url?: string | null;
  status?: string;
  roles: UserRole[];
}

/** data của POST /auth/login */
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: UserProfile;
}

/** data của POST /auth/register */
export interface RegisterResult {
  user_id: string;
  email: string;
  full_name: string;
  roles: UserRole[];
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
