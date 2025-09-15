import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SubAccount, CreateSubAccountData } from '../types/subAccount';
import toast from 'react-hot-toast';

export const useSubAccounts = () => {
  const { user } = useAuth();
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchSubAccounts();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchSubAccounts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('sub_accounts')
        .select('*')
        .eq('main_account_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Si la table n'existe pas encore, on ignore l'erreur silencieusement
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table') || error.message?.includes('sub_accounts')) {
          console.log('Table sub_accounts pas encore créée - fonctionnalité désactivée temporairement');
          setSubAccounts([]);
          setTotalCount(0);
          return;
        }
        console.error('Erreur récupération sous-comptes:', error);
        // Pour les autres erreurs, on définit quand même des valeurs par défaut
        setSubAccounts([]);
        setTotalCount(0);
      } else {
        setSubAccounts(data || []);
        setTotalCount(data?.length || 0);
      }
    } catch (error: any) {
      console.error('Error fetching sub accounts:', error);
      
      // Check if the error is due to missing table - check both message and details
      const errorMessage = error?.message || '';
      const errorDetails = error?.details || '';
      const errorBody = typeof error === 'string' ? error : JSON.stringify(error);
      
      if (errorMessage.includes('PGRST205') || 
          errorMessage.includes('sub_accounts') ||
          errorDetails.includes('sub_accounts') ||
          errorBody.includes('PGRST205') ||
          errorBody.includes('sub_accounts')) {
        setTableExists(false);
        setSubAccounts([]);
        setError(null);
      } else {
        setError(error.message || 'Failed to fetch sub accounts');
        setSubAccounts([]);
        setTableExists(true);
      }
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const createSubAccount = async (subAccountData: CreateSubAccountData): Promise<SubAccount | null> => {
    if (!user) return null;

    try {
      console.log('👤 Création sous-compte:', subAccountData.username);
      
      const { data, error } = await supabase.rpc('create_sub_account', {
        p_username: subAccountData.username,
        p_display_name: subAccountData.display_name,
        p_password: subAccountData.password,
        p_permissions: subAccountData.permissions || { pdf_access: true, download_only: true }
      });

      if (error) {
        console.error('Erreur création sous-compte:', error);
        return null;
      }

      if (!data.success) {
        toast.error(data.error || 'Erreur lors de la création du sous-compte');
        return null;
      }

      console.log('✅ Sous-compte créé:', data.sub_account_id);
      
      // Rafraîchir la liste
      await fetchSubAccounts();
      
      // Retourner le nouveau sous-compte
      const newSubAccount = subAccounts.find(sa => sa.id === data.sub_account_id);
      return newSubAccount || null;
    } catch (error) {
      console.error('Erreur générale createSubAccount:', error);
      return null;
    }
  };

  const updateSubAccount = async (subAccountId: string, updates: Partial<SubAccount>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('sub_accounts')
        .update({
          display_name: updates.display_name,
          is_active: updates.is_active,
          permissions: updates.permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', subAccountId)
        .eq('main_account_id', user.id);

      if (error) {
        console.error('Erreur mise à jour sous-compte:', error);
        return false;
      }

      // Rafraîchir la liste
      await fetchSubAccounts();
      return true;
    } catch (error) {
      console.error('Erreur générale updateSubAccount:', error);
      return false;
    }
  };

  const deleteSubAccount = async (subAccountId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('sub_accounts')
        .delete()
        .eq('id', subAccountId)
        .eq('main_account_id', user.id);

      if (error) {
        console.error('Erreur suppression sous-compte:', error);
        return false;
      }

      // Rafraîchir la liste
      await fetchSubAccounts();
      return true;
    } catch (error) {
      console.error('Erreur générale deleteSubAccount:', error);
      return false;
    }
  };

  const resetSubAccountPassword = async (subAccountId: string, newPassword: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Hasher le nouveau mot de passe
      const passwordHash = await hashPassword(newPassword, user.id);
      
      const { error } = await supabase
        .from('sub_accounts')
        .update({
          password_hash: passwordHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', subAccountId)
        .eq('main_account_id', user.id);

      if (error) {
        console.error('Erreur reset mot de passe:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur générale resetSubAccountPassword:', error);
      return false;
    }
  };

  // Fonction utilitaire pour hasher le mot de passe côté client
  const hashPassword = async (password: string, salt: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  return {
    subAccounts,
    totalCount,
    loading,
    createSubAccount,
    updateSubAccount,
    deleteSubAccount,
    resetSubAccountPassword,
    refetch: fetchSubAccounts,
  };
};