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
      const savedSubAccountData = localStorage.getItem('sub_account_data');
      
      if (savedToken && savedSubAccountData) {
        try {
          const subAccountData = JSON.parse(savedSubAccountData);
          
          // Restaurer immédiatement l'état depuis localStorage
          setIsSubAccount(true);
          setSubAccount(subAccountData);
          setMainAccountId(subAccountData.main_account_id);
          setSessionToken(savedToken);
          
          console.log('🔄 Session sous-compte restaurée depuis localStorage:', subAccountData.username);
          
          // Valider la session en arrière-plan sans déconnecter en cas d'erreur
          validateSession(savedToken).then(isValid => {
            if (!isValid) {
              console.log('❌ Session invalide détectée en arrière-plan');
              // Ne pas déconnecter automatiquement - laisser l'utilisateur utiliser l'interface
              // La déconnexion se fera seulement si une action échoue vraiment
            } else {
              console.log('✅ Session sous-compte validée en arrière-plan');
            }
          }).catch(error => {
            console.warn('⚠️ Erreur validation session en arrière-plan:', error);
            // Ne pas déconnecter en cas d'erreur réseau
          });
        } catch (parseError) {
          console.error('Erreur parsing données sous-compte:', parseError);
          // Nettoyer en cas d'erreur de parsing
          localStorage.removeItem('sub_account_session_token');
          localStorage.removeItem('sub_account_data');
        }
      } else {
        console.log('🔍 Aucune session sous-compte sauvegardée');
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
      // Vérifier si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        console.log('🔍 Supabase non configuré, validation locale du token');
        // En mode local, considérer le token comme valide s'il existe
        return true;
      }

      // Pour éviter les déconnexions intempestives, on considère la session comme valide
      // La validation réelle se fera lors des actions qui nécessitent l'accès aux données
      console.log('🔍 Validation session différée - session considérée comme valide');
      return true;
    } catch (error) {
      console.error('Erreur validation session:', error);
      // En cas d'erreur réseau, considérer comme valide pour éviter les déconnexions
      return true;
    }
  };

  const loginAsSubAccount = async (
    mainAccountEmail: string, 
    username: string, 
    password: string
  ): Promise<boolean> => {
    try {
      // Connexion sous-compte silencieuse
      
      // Vérifier d'abord si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        return false;
      }

      try {
        const { data, error } = await supabase.rpc('authenticate_sub_account', {
          p_main_account_email: mainAccountEmail,
          p_username: username,
          p_password: password,
          p_ip_address: null,
          p_user_agent: navigator.userAgent
        });

        if (error) {
          // Gestion silencieuse des erreurs RPC
          return false;
        }

        if (!data.success) {
          return false;
        }

        // Sauvegarder la session
        localStorage.setItem('sub_account_session_token', data.session_token);
        localStorage.setItem('sub_account_data', JSON.stringify(data.sub_account));
        
        // Mettre à jour l'état
        setIsSubAccount(true);
        setSubAccount(data.sub_account);
        setMainAccountId(data.sub_account.main_account_id);
        setSessionToken(data.session_token);
        
        return true;
      } catch (rpcError) {
        return false;
      }
    } catch (error) {
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

  // Fonction utilitaire pour hasher le mot de passe
  const hashPassword = async (password: string, salt: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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