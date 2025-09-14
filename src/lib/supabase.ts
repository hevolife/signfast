import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your-project-url' || supabaseKey === 'your-anon-key' || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
  console.warn('⚠️ Supabase non configuré - utilisation du mode local uniquement');
}

// Custom fetch function to handle session expiration
const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);
    
    // Check for session expiration
    if (response.status === 403) {
      try {
        const body = await response.clone().json();
        if (body.code === 'session_not_found') {
          // Session expired, sign out the user
          console.log('Session expired, signing out user');
          supabase.auth.signOut();
        }
      } catch (error) {
        // If we can't parse the response body, ignore
      }
    }
    
    return response;
  } catch (error) {
    console.warn('Network error in customFetch:', error);
    // Re-throw the error to let the calling code handle it
    throw error;
  }
};

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  return url && key && 
         url !== 'your-project-url' && 
         key !== 'your-anon-key' && 
         !url.includes('placeholder') && 
         !key.includes('placeholder');
};

// Safe fetch wrapper that handles configuration issues
const safeFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, skipping request');
    throw new Error('Supabase not configured');
  }
  
  return customFetch(url, options);
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder-key', 
  {
    global: {
      fetch: safeFetch,
    },
  }
);
});

// Export createClient for admin operations
export { createClient };

export type Database = {
  public: {
    Tables: {
      forms: {
        Row: {
          id: string;
          title: string;
          description: string;
          fields: any;
          settings: any;
          user_id: string;
          created_at: string;
          updated_at: string;
          is_published: boolean;
          password: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          fields: any;
          settings?: any;
          user_id: string;
          created_at?: string;
          updated_at?: string;
          is_published?: boolean;
          password?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          fields?: any;
          settings?: any;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
          is_published?: boolean;
          password?: string | null;
        };
      };
      secret_codes: {
        Row: {
          id: string;
          code: string;
          type: string;
          description: string;
          max_uses: number | null;
          current_uses: number;
          expires_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          type: string;
          description?: string;
          max_uses?: number | null;
          current_uses?: number;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          type?: string;
          description?: string;
          max_uses?: number | null;
          current_uses?: number;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_secret_codes: {
        Row: {
          id: string;
          user_id: string;
          code_id: string;
          activated_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          code_id: string;
          activated_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          code_id?: string;
          activated_at?: string;
          expires_at?: string | null;
        };
      };
      pdf_storage: {
        Row: {
          id: string;
          file_name: string;
          response_id: string | null;
          template_name: string;
          form_title: string;
          form_data: any;
          pdf_content: string;
          file_size: number;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          file_name: string;
          response_id?: string | null;
          template_name?: string;
          form_title: string;
          form_data?: any;
          pdf_content: string;
          file_size?: number;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          file_name?: string;
          response_id?: string | null;
          template_name?: string;
          form_title?: string;
          form_data?: any;
          pdf_content?: string;
          file_size?: number;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      responses: {
        Row: {
          id: string;
          form_id: string;
          data: any;
          created_at: string;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          form_id: string;
          data: any;
          created_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          form_id?: string;
          data?: any;
          created_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
      };
    };
    pdf_templates: {
      Row: {
        id: string;
        name: string;
        description: string;
        pdf_content: string;
        fields: any;
        user_id: string;
        is_public: boolean;
        linked_form_id: string | null;
        pages: number;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        name: string;
        description?: string;
        pdf_content: string;
        fields?: any;
        user_id: string;
        is_public?: boolean;
        linked_form_id?: string | null;
        pages?: number;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        name?: string;
        description?: string;
        pdf_content?: string;
        fields?: any;
        user_id?: string;
        is_public?: boolean;
        linked_form_id?: string | null;
        pages?: number;
        created_at?: string;
        updated_at?: string;
      };
    };
    affiliate_programs: {
      Row: {
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
      };
      Insert: {
        id?: string;
        user_id: string;
        affiliate_code: string;
        commission_rate?: number;
        total_referrals?: number;
        total_earnings?: number;
        monthly_earnings?: number;
        is_active?: boolean;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        user_id?: string;
        affiliate_code?: string;
        commission_rate?: number;
        total_referrals?: number;
        total_earnings?: number;
        monthly_earnings?: number;
        is_active?: boolean;
        created_at?: string;
        updated_at?: string;
      };
    };
    affiliate_referrals: {
      Row: {
        id: string;
        affiliate_user_id: string;
        referred_user_id: string;
        subscription_id: string | null;
        commission_amount: number;
        commission_rate: number;
        status: string;
        created_at: string;
        paid_at: string | null;
      };
      Insert: {
        id?: string;
        affiliate_user_id: string;
        referred_user_id: string;
        subscription_id?: string | null;
        commission_amount?: number;
        commission_rate?: number;
        status?: string;
        created_at?: string;
        paid_at?: string | null;
      };
      Update: {
        id?: string;
        affiliate_user_id?: string;
        referred_user_id?: string;
        subscription_id?: string | null;
        commission_amount?: number;
        commission_rate?: number;
        status?: string;
        created_at?: string;
        paid_at?: string | null;
      };
    };
  };
};