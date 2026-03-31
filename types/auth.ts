export type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  is_active: boolean;
  created_at: string | null;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  expires_in: number;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  company_name?: string;
};

export type AuthError = {
  detail: string;
};