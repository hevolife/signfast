import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SubAccount } from '../types/subAccount';

interface SubAccountContextType {
  isSubAccount: boolean;
  subAccount: SubAccount | null;
  mainAccountId: string | null;
  sessionToken: string | null;
  loading: boolean;
  loginAsSubAccount: (mainAccountEmail: string, username: string, password: string) => Promise<boolean>;
  logoutSubAccount: () => void;
}

const SubAccountContext = createContext<SubAccountContextType | undefined>(undefined);

export const useSubAccount = () => {
  const context = useContext(SubAccountContext);
  if (!context) {
    throw new Error('useSubAccount must be used within SubAccountProvider');
  }
  return context;
};

export const SubAccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSubAccount, setIsSubAccount] = useState(false);
  const [subAccount, setSubAccount] = useState<SubAccount | null>(null);
  const [mainAccountId, setMainAccountId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Vérifier si une session de sous-compte existe au chargement
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const savedToken = localStorage.getItem('sub_account_session_token');
      
      if (savedToken) {
        const isValid = await validateSession(savedToken);
        if (!isValid) {
          // Session invalide, nettoyer
          localStorage.removeItem('sub_account_session_token');
          localStorage.removeItem('sub_account_data');
        }
      }
    } catch (error) {
      console.error('Erreur vérification session:', error);
      // Nettoyer en cas d'erreur
      localStorage.removeItem('sub_account_session_token');
      localStorage.removeItem('sub_account_data');
    } finally {
      setLoading(false);
    }
  };

  const validateSession = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('validate_sub_account_session', {
        p_session_token: token
      });

      if (error || !data.success) {
        return false;
      }

      // Session valide, restaurer l'état
      setIsSubAccount(true);
      setSubAccount(data.sub_account);
      setMainAccountId(data.sub_account.main_account_id);
      setSessionToken(token);
      
      // Configurer le token pour les requêtes Supabase
      await supabase.rpc('set_config', {
        parameter: 'app.sub_account_token',
        value: token
      });

      return true;
    } catch (error) {
      console.error('Erreur validation session:', error);
      return false;
    }
  };

  const loginAsSubAccount = async (
    mainAccountEmail: string, 
    username: string, 
    password: string
  ): Promise<boolean> => {
    try {
      console.log('🔐 Connexion sous-compte:', { mainAccountEmail, username });
      
      const { data, error } = await supabase.rpc('authenticate_sub_account', {
        p_main_account_email: mainAccountEmail,
        p_username: username,
        p_password: password,
        p_ip_address: null, // Sera rempli côté serveur si nécessaire
        p_user_agent: navigator.userAgent
      });

      if (error || !data.success) {
        console.error('Erreur authentification:', error || data.error);
        return false;
      }

      console.log('✅ Sous-compte connecté:', data.sub_account.username);
      
      // Sauvegarder la session
      localStorage.setItem('sub_account_session_token', data.session_token);
      localStorage.setItem('sub_account_data', JSON.stringify(data.sub_account));
      
      // Mettre à jour l'état
      setIsSubAccount(true);
      setSubAccount(data.sub_account);
      setMainAccountId(data.sub_account.main_account_id);
      setSessionToken(data.session_token);
      
      // Configurer le token pour les requêtes Supabase
      await supabase.rpc('set_config', {
        parameter: 'app.sub_account_token',
        value: data.session_token
      });

      return true;
    } catch (error) {
      console.error('Erreur générale loginAsSubAccount:', error);
      return false;
    }
  };

  const logoutSubAccount = () => {
    // Nettoyer le localStorage
    localStorage.removeItem('sub_account_session_token');
    localStorage.removeItem('sub_account_data');
    
    // Réinitialiser l'état
    setIsSubAccount(false);
    setSubAccount(null);
    setMainAccountId(null);
    setSessionToken(null);
    
    // Rediriger vers la page de connexion
    window.location.href = '/sub-account/login';
  };

  const value = {
    isSubAccount,
    subAccount,
    mainAccountId,
    sessionToken,
    loading,
    loginAsSubAccount,
    logoutSubAccount,
  };

  return (
    <SubAccountContext.Provider value={value}>
      {children}
    </SubAccountContext.Provider>
  );
};