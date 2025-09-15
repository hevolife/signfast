import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useDemo } from './DemoContext';

interface ImpersonationData {
  admin_user_id: string;
  admin_email: string;
  target_user_id: string;
  target_email: string;
  timestamp: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isImpersonating: boolean;
  impersonationData: ImpersonationData | null;
  originalUser: User | null;
  signUp: (email: string, password: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  stopImpersonation: () => void;
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
  const [impersonationData, setImpersonationData] = useState<ImpersonationData | null>(null);
  const [originalUser, setOriginalUser] = useState<User | null>(null);
  const { isDemoMode, demoUser } = useDemo();

  // Gérer l'impersonation et le mode démo
  const getEffectiveUser = (): User | null => {
    // Priorité 1: Mode démo
    if (isDemoMode && demoUser) {
      return {
        id: demoUser.id,
        email: demoUser.email,
        created_at: new Date(demoUser.createdAt).toISOString(),
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        role: 'authenticated',
      } as User;
    }
    
    // Priorité 2: Mode impersonation
    if (isImpersonating && impersonationData) {
      return {
        id: impersonationData.target_user_id,
        email: impersonationData.target_email,
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        role: 'authenticated',
      } as User;
    }
    
    // Priorité 3: Utilisateur normal
    return user;
  };

  // Vérifier l'impersonation au chargement
  useEffect(() => {
    const checkImpersonation = () => {
      try {
        const impersonationDataStr = localStorage.getItem('admin_impersonation');
        if (impersonationDataStr) {
          const data: ImpersonationData = JSON.parse(impersonationDataStr);
          
          // Vérifier que les données sont valides et récentes (max 24h)
          const maxAge = 24 * 60 * 60 * 1000; // 24 heures
          if (Date.now() - data.timestamp > maxAge) {
            console.log('🎭 Impersonation expirée, nettoyage');
            localStorage.removeItem('admin_impersonation');
            return;
          }
          
          console.log('🎭 Impersonation active détectée:', data.target_email);
          setImpersonationData(data);
          setIsImpersonating(true);
          
          // Sauvegarder l'utilisateur original si pas déjà fait
          if (user && !originalUser) {
            setOriginalUser(user);
          }
        }
      } catch (error) {
        console.error('Erreur parsing impersonation data:', error);
        localStorage.removeItem('admin_impersonation');
      }
    };

    checkImpersonation();
  }, [user]);

  const stopImpersonation = useCallback(() => {
    console.log('🎭 Arrêt de l\'impersonation');
    localStorage.removeItem('admin_impersonation');
    setIsImpersonating(false);
    setImpersonationData(null);
    setOriginalUser(null);
    
    // Recharger la page pour réinitialiser complètement l'état
    window.location.reload();
  }, []);

  // Si on est en mode démo, simuler un utilisateur
  const effectiveUser = getEffectiveUser();

  const signOut = useCallback(async () => {
    // Si on est en impersonation, juste arrêter l'impersonation
    if (isImpersonating) {
      stopImpersonation();
      return;
    }
    
    try {
      // Nettoyer le localStorage avant la déconnexion
      localStorage.removeItem('sb-auth-token');
      localStorage.removeItem('currentUserForms');
      sessionStorage.clear();
      
      // Déconnexion Supabase
      await supabase.auth.signOut();
      
      // Forcer la mise à jour de l'état
      setUser(null);
      setSession(null);
      
      // Redirection forcée
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      // Forcer la déconnexion même en cas d'erreur
      localStorage.removeItem('sb-auth-token');
      sessionStorage.clear();
      setUser(null);
      setSession(null);
      window.location.href = '/';
    }
  }, [isImpersonating, stopImpersonation]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          // Gestion d'erreur silencieuse pour éviter les crashes
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        setLoading(false);
      })
      .catch((error) => {
        // Gestion d'erreur réseau silencieuse
        setLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        // Gérer les événements de session
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
        } else if (event === 'SIGNED_IN') {
          setSession(session);
          setUser(session?.user ?? null);
        } else {
          // Pour les autres événements, mettre à jour normalement
          setSession(session);
          setUser(session?.user ?? null);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, [signOut]);

  const signUp = async (email: string, password: string) => {
    // Déterminer l'URL de redirection selon l'environnement
    const baseUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:5173' 
      : 'https://signfastpro.com';
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${baseUrl}/dashboard`,
        data: {
          email_confirm_url: `${baseUrl}/dashboard`
        }
      }
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const value = {
    user: effectiveUser,
    session,
    loading,
    isImpersonating,
    impersonationData,
    originalUser,
    signUp,
    signIn,
    signOut,
    stopImpersonation,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};