/// <reference types="vite/client" />

interface Window {
  ENV: {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
  };
}