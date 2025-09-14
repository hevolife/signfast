import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseReady } from '../lib/supabase';

// Cache pour les données utilisateur
let userCache: { user: User | null; session: Session | null; timestamp: number } | null = null;
const USER_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isImpersonating: boolean;
  stopImpersonation: () => void;
  signUp: (email: string, password: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  // Vérifier l'impersonation
  const checkImpersonation = useCallback(() => {
    const impersonationData = localStorage.getItem('admin_impersonation');
    setIsImpersonating(!!impersonationData);
  }, []);

  // Arrêter l'impersonation
  const stopImpersonation = useCallback(() => {
    localStorage.removeItem('admin_impersonation');
    setIsImpersonating(false);
    window.location.href = '/admin';
  }, []);

  const signOut = useCallback(async () => {
    // Nettoyer le cache utilisateur
    userCache = null;
    
    // Nettoyer l'impersonation si active
    localStorage.removeItem('admin_impersonation');
    setIsImpersonating(false);
    
    await supabase.auth.signOut();
  }, []);

  useEffect(() => {
    // Si Supabase n'est pas configuré, ne pas essayer de récupérer la session
    if (!isSupabaseReady) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return;
    }

    // Vérifier le cache d'abord
    if (userCache && Date.now() - userCache.timestamp < USER_CACHE_DURATION) {
      setSession(userCache.session);
      setUser(userCache.user);
      setLoading(false);
      checkImpersonation();
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error && error.message.includes('Invalid Refresh Token')) {
        // Clear corrupted authentication state
        setSession(null);
        setUser(null);
        userCache = null;
      } else {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Mettre en cache
        userCache = {
          user: session?.user ?? null,
          session,
          timestamp: Date.now()
        };
      }
      setLoading(false);
      checkImpersonation();
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Mettre à jour le cache
        userCache = {
          user: session?.user ?? null,
          session,
          timestamp: Date.now()
        };
        
        checkImpersonation();
      }
    );

    return () => subscription?.unsubscribe();
  }, [signOut, checkImpersonation]);

  // Vérifier l'impersonation périodiquement
  useEffect(() => {
    checkImpersonation();
    const interval = setInterval(checkImpersonation, 5000); // Toutes les 5 secondes
    return () => clearInterval(interval);
  }, [checkImpersonation]);

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseReady) {
      return { data: null, error: { message: 'Supabase non configuré' } };
    }

    // Invalider le cache lors de l'inscription
    userCache = null;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseReady) {
      return { data: null, error: { message: 'Supabase non configuré' } };
    }

    // Invalider le cache lors de la connexion
    userCache = null;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const value = {
    user,
    session,
    loading,
    isImpersonating,
    stopImpersonation,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};