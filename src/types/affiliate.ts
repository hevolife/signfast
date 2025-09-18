export interface AffiliateProgram {
  id: string;
  user_id: string;
  affiliate_code: string;
  commission_rate: number;
  total_referrals: number;
  total_earnings: number;
  monthly_earnings: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AffiliateReferral {
  id: string;
  affiliate_user_id: string;
  referred_user_id: string;
  subscription_id?: string;
  commission_amount: number;
  commission_rate: number;
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled';
  created_at: string;
  paid_at?: string;
}

export interface AffiliateStats {
  user_id: string;
  affiliate_code: string;
  commission_rate: number;
  total_referrals: number;
  total_earnings: number;
  monthly_earnings: number;
  is_active: boolean;
  confirmed_referrals: number;
  pending_referrals: number;
  total_commissions: number;
}