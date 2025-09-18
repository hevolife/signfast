export interface UserProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  address?: string;
  siret?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}