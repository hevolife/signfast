export interface SubAccount {
  id: string;
  main_account_id: string;
  username: string;
  display_name: string;
  password_hash: string;
  is_active: boolean;
  permissions: {
    pdf_access: boolean;
    download_only: boolean;
  };
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SubAccountSession {
  id: string;
  sub_account_id: string;
  session_token: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface CreateSubAccountData {
  username: string;
  display_name: string;
  password: string;
  permissions?: {
    pdf_access: boolean;
    download_only: boolean;
  };
}

export interface SubAccountLoginData {
  main_account_email: string;
  username: string;
  password: string;
}