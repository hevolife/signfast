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
      
      // Vérifier d'abord si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        setSubAccounts([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('sub_accounts')
        .select('*')
        .eq('main_account_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Table doesn't exist or other error - disable feature gracefully
        setSubAccounts([]);
        setTotalCount(0);
      } else {
        setSubAccounts(data || []);
        setTotalCount(data?.length || 0);
      }
    } catch (error) {
      // Any error - disable feature gracefully
      setSubAccounts([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const createSubAccount = async (subAccountData: CreateSubAccountData): Promise<SubAccount | null> => {
    if (!user) return null;

    // Vérifier si les sous-comptes sont disponibles
    if (!Array.isArray(subAccounts)) {
      toast.error('La fonctionnalité des sous-comptes n\'est pas configurée');
      return null;
    }

    try {
      // Hash the password before sending to database
      const passwordHash = await hashPassword(subAccountData.password, user.id);
      
      // Insertion directe dans la table
      const { data, error } = await supabase
        .from('sub_accounts')
        .insert([{
          main_account_id: user.id,
          username: subAccountData.username,
          display_name: subAccountData.display_name,
          password_hash: passwordHash,
          permissions: subAccountData.permissions || { pdf_access: true, download_only: true },
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        toast.error('Erreur lors de la création du sous-compte');
        return null;
      }
      
      // Rafraîchir la liste
      await fetchSubAccounts();
      
      return data;
    } catch (error) {
      toast.error('Erreur lors de la création du sous-compte');
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