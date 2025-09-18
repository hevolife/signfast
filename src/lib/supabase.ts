import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vérifier si Supabase est configuré
const isSupabaseConfigured = () => {
  return supabaseUrl && 
         supabaseKey && 
         supabaseUrl !== 'your-project-url' && 
         supabaseKey !== 'your-anon-key' && 
         !supabaseUrl.includes('placeholder') && 
         !supabaseKey.includes('placeholder');
};

// Client Supabase avec gestion d'erreur
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export { isSupabaseConfigured };

// Types de base pour la base de données
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
  };
};