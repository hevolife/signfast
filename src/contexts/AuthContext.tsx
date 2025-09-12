import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isImpersonating?: boolean;
  stopImpersonation?: () => void;
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

  const signOut = useCallback(async () => {
    try {
      // Nettoyer l'impersonation lors de la déconnexion
      localStorage.removeItem('admin_impersonation');
      setIsImpersonating(false);
      
      // Forcer la mise à jour de l'état immédiatement
      setUser(null);
      setSession(null);
      
      try {
        // Tentative de déconnexion Supabase
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.warn('Erreur déconnexion Supabase (ignorée):', error.message);
          // Ne pas bloquer la déconnexion si Supabase échoue
        }
      } catch (supabaseError) {
        console.warn('Erreur déconnexion Supabase (ignorée):', supabaseError);
        // Continuer même si Supabase échoue
      }
      
      // Nettoyer le localStorage
      try {
        localStorage.removeItem('sb-fscwmfrwzougwtsxpoqz-auth-token');
        localStorage.removeItem('supabase.auth.token');
        // Nettoyer d'autres clés potentielles
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });
      } catch (storageError) {
        console.warn('Erreur nettoyage localStorage:', storageError);
      }
      
      // Redirection forcée vers la page d'accueil
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // En cas d'erreur, forcer quand même la déconnexion côté client
      setUser(null);
      setSession(null);
      
      // Nettoyer sélectivement au lieu de tout effacer
      try {
        localStorage.removeItem('admin_impersonation');
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });
      } catch (storageError) {
        console.warn('Erreur nettoyage localStorage:', storageError);
      }
      
      window.location.href = '/';
    }
  }, []);

  // Vérifier l'impersonation au démarrage
  useEffect(() => {
    const checkImpersonation = () => {
      try {
        const impersonationData = localStorage.getItem('admin_impersonation');
        if (impersonationData) {
          const data = JSON.parse(impersonationData);
          const isValid = Date.now() - data.timestamp < 24 * 60 * 60 * 1000; // 24h max
          
          if (isValid) {
            console.log('🎭 Mode impersonation détecté:', data.target_email);
            setIsImpersonating(true);
            
            // Créer un utilisateur simulé pour l'impersonation
            const simulatedUser = {
              id: data.target_user_id,
              email: data.target_email,
              created_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {},
              aud: 'authenticated',
              role: 'authenticated'
            } as User;
            
            setUser(simulatedUser);
            setSession({
              access_token: 'impersonation_token',
              refresh_token: 'impersonation_refresh',
              expires_in: 3600,
              token_type: 'bearer',
              user: simulatedUser
            } as Session);
            
            toast.success(`🎭 Mode impersonation: ${data.target_email}`, {
              duration: 5000,
              icon: '👤'
            });
            
            setLoading(false);
            return true;
          } else {
            // Nettoyer les données expirées
            localStorage.removeItem('admin_impersonation');
          }
        }
      } catch (error) {
        console.error('Erreur vérification impersonation:', error);
        localStorage.removeItem('admin_impersonation');
      }
      return false;
    };

    // Si on est en mode impersonation, ne pas faire la vérification auth normale
    if (checkImpersonation()) {
      return;
    }

    // Sinon, procédure normale
    normalAuthFlow();
  }, []);

  const normalAuthFlow = () => {
  };
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error && error.message.includes('Invalid Refresh Token')) {
        // Clear corrupted authentication state
        signOut();
        setSession(null);
        setUser(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  // Fonction pour arrêter l'impersonation
  const stopImpersonation = useCallback(() => {
    localStorage.removeItem('admin_impersonation');
    setIsImpersonating(false);
    toast.success('Mode impersonation désactivé');
    window.location.href = '/admin';
  }, []);
  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
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