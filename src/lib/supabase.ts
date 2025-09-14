import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vérification plus stricte des variables d'environnement
const isSupabaseConfigured = supabaseUrl && 
                            supabaseKey && 
                            !supabaseUrl.includes('placeholder') && 
                            !supabaseKey.includes('placeholder') &&
                            supabaseUrl.startsWith('https://') &&
                            supabaseKey.length > 50;

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase non configuré - utilisation du mode local uniquement');
}

// Pool de connexions pour optimiser les performances
let connectionPool: any = null;

// Custom fetch function to handle session expiration
const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase non configuré');
  }

  // S'assurer que l'API key est toujours présente
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    ...options?.headers,
  };

  // Ajouter des headers d'optimisation
  const optimizedOptions = {
    ...options,
    headers: {
      ...headers,
      'Cache-Control': 'max-age=60', // Cache 1 minute
      'Connection': 'keep-alive',
    }
  };

  const response = await fetch(url, optimizedOptions);
  
  // Check for session expiration
  if (response.status === 403) {
    try {
      const body = await response.clone().json();
      if (body.code === 'session_not_found') {
        // Session expired, sign out the user
        supabase.auth.signOut();
      }
    } catch (error) {
      // If we can't parse the response body, ignore
    }
  }
  
  return response;
};

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: customFetch,
  },
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Optimisation pour éviter les vérifications inutiles
  },
  realtime: {
    params: {
      eventsPerSecond: 2, // Limiter les événements temps réel
    },
  },
}) : {
  // Client mock pour mode non configuré
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase non configuré' } }),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase non configuré' } }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Supabase non configuré' } }) }) }),
    insert: () => Promise.resolve({ data: null, error: { message: 'Supabase non configuré' } }),
    update: () => ({ eq: () => Promise.resolve({ error: { message: 'Supabase non configuré' } }) }),
    delete: () => ({ eq: () => Promise.resolve({ error: { message: 'Supabase non configuré' } }) }),
  }),
  rpc: () => Promise.resolve({ data: null, error: { message: 'Supabase non configuré' } }),
} as any;

// Export de la configuration pour vérifications
export const isSupabaseReady = isSupabaseConfigured;

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