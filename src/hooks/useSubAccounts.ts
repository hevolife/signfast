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
  const [tablesExist, setTablesExist] = useState(false);

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
        console.log('📋 Supabase non configuré, utilisation du localStorage');
        setTablesExist(false);
        const localSubAccounts = JSON.parse(localStorage.getItem(`sub_accounts_${user.id}`) || '[]');
        setSubAccounts(localSubAccounts);
        setTotalCount(localSubAccounts.length);
        setLoading(false);
        return;
      }
      
      // Tester si la table sub_accounts existe
      try {
        const { data, error } = await supabase
          .from('sub_accounts')
          .select('id')
          .limit(1);

        if (error && (error.code === 'PGRST116' || error.code === 'PGRST205' || error.code === '42P01' || error.code === 'NETWORK_ERROR')) {
          console.log('📋 Table sub_accounts non trouvée, utilisation du localStorage');
          setTablesExist(false);
          const localSubAccounts = JSON.parse(localStorage.getItem(`sub_accounts_${user.id}`) || '[]');
          setSubAccounts(localSubAccounts);
          setTotalCount(localSubAccounts.length);
          setLoading(false);
          return;
        }
        
        setTablesExist(true);
      } catch (testError) {
        console.log('📋 Erreur test table, utilisation du localStorage');
        setTablesExist(false);
        const localSubAccounts = JSON.parse(localStorage.getItem(`sub_accounts_${user.id}`) || '[]');
        setSubAccounts(localSubAccounts);
        setTotalCount(localSubAccounts.length);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('sub_accounts')
        .select('*')
        .eq('main_account_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur récupération sous-comptes:', error);
        setTablesExist(false);
        const localSubAccounts = JSON.parse(localStorage.getItem(`sub_accounts_${user.id}`) || '[]');
        setSubAccounts(localSubAccounts);
        setTotalCount(localSubAccounts.length);
      } else {
        setSubAccounts(data || []);
        setTotalCount(data?.length || 0);
      }
    } catch (error) {
      console.log('📋 Erreur Supabase, utilisation du localStorage');
      setTablesExist(false);
      const localSubAccounts = JSON.parse(localStorage.getItem(`sub_accounts_${user.id}`) || '[]');
      setSubAccounts(localSubAccounts);
      setTotalCount(localSubAccounts.length);
    } finally {
      setLoading(false);
    }
  };

  const createSubAccount = async (subAccountData: CreateSubAccountData): Promise<SubAccount | null> => {
    if (!user) return null;

    try {
      // Si les tables n'existent pas, utiliser localStorage
      if (!tablesExist) {
        return await createSubAccountLocal(subAccountData);
      }

      // Essayer avec Supabase
      try {
        const passwordHash = await hashPassword(subAccountData.password, user.id);
        
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
          if (error.code === '23505') {
            throw new Error('Ce nom d\'utilisateur existe déjà');
          } else {
            throw new Error('Erreur lors de la création du sous-compte');
          }
        }
        
        await fetchSubAccounts();
        return data;
      } catch (supabaseError) {
        console.log('⚠️ Erreur Supabase, utilisation du localStorage');
        return await createSubAccountLocal(subAccountData);
      }
      
    } catch (error) {
      console.log('⚠️ Supabase non disponible, utilisation du localStorage');
      return await createSubAccountLocal(subAccountData);
    }
  };

  const createSubAccountLocal = async (subAccountData: CreateSubAccountData): Promise<SubAccount | null> => {
    try {
      const existingSubAccounts = JSON.parse(localStorage.getItem(`sub_accounts_${user.id}`) || '[]');
      
      // Vérifier que le nom d'utilisateur n'existe pas déjà
      const usernameExists = existingSubAccounts.some((sa: SubAccount) => sa.username === subAccountData.username);
      if (usernameExists) {
        throw new Error('Ce nom d\'utilisateur existe déjà');
      }
      
      const passwordHash = await hashPassword(subAccountData.password, user.id);
      
      const newSubAccount: SubAccount = {
        id: crypto.randomUUID(),
        main_account_id: user.id,
        username: subAccountData.username,
        display_name: subAccountData.display_name,
        password_hash: passwordHash,
        permissions: subAccountData.permissions || { pdf_access: true, download_only: true },
        is_active: true,
        last_login_at: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const updatedSubAccounts = [...existingSubAccounts, newSubAccount];
      localStorage.setItem(`sub_accounts_${user.id}`, JSON.stringify(updatedSubAccounts));
      
      // Mettre à jour immédiatement l'état local
      setSubAccounts(updatedSubAccounts);
      setTotalCount(updatedSubAccounts.length);
      
      return newSubAccount;
    } catch (error) {
      throw error;
    }
  };

  const updateSubAccount = async (subAccountId: string, updates: Partial<SubAccount>): Promise<boolean> => {
    if (!user) return false;

    try {
      // Si les tables existent, essayer Supabase
      if (tablesExist) {
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
          throw error;
        }
        
        await fetchSubAccounts();
        return true;
        
      } catch (supabaseError) {
        console.log('⚠️ Supabase non disponible, utilisation du localStorage');
          // Fallback sera géré ci-dessous
      }
      }
      
      // Fallback vers localStorage
      const existingSubAccounts = JSON.parse(localStorage.getItem(`sub_accounts_${user.id}`) || '[]');
      const updatedSubAccounts = existingSubAccounts.map((sa: SubAccount) => 
        sa.id === subAccountId 
          ? { ...sa, ...updates, updated_at: new Date().toISOString() }
          : sa
      );
      
      localStorage.setItem(`sub_accounts_${user.id}`, JSON.stringify(updatedSubAccounts));
      
      setSubAccounts(updatedSubAccounts);
      setTotalCount(updatedSubAccounts.length);
      
      return true;

    } catch (error) {
      console.error('Erreur générale updateSubAccount:', error);
      return false;
    }
  };

  const deleteSubAccount = async (subAccountId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Si les tables existent, essayer Supabase
      if (tablesExist) {
      try {
        const { error } = await supabase
          .from('sub_accounts')
          .delete()
          .eq('id', subAccountId)
          .eq('main_account_id', user.id);

        if (error) {
          throw error;
        }
        
        await fetchSubAccounts();
        return true;
        
      } catch (supabaseError) {
        console.log('⚠️ Supabase non disponible, utilisation du localStorage');
          // Fallback sera géré ci-dessous
      }
      }
      
      // Fallback vers localStorage
      const existingSubAccounts = JSON.parse(localStorage.getItem(`sub_accounts_${user.id}`) || '[]');
      const updatedSubAccounts = existingSubAccounts.filter((sa: SubAccount) => sa.id !== subAccountId);
      
      localStorage.setItem(`sub_accounts_${user.id}`, JSON.stringify(updatedSubAccounts));
      
      setSubAccounts(updatedSubAccounts);
      setTotalCount(updatedSubAccounts.length);
      
      return true;

    } catch (error) {
      console.error('Erreur générale deleteSubAccount:', error);
      return false;
    }
  };

  const resetSubAccountPassword = async (subAccountId: string, newPassword: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const passwordHash = await hashPassword(newPassword, user.id);
      
      // Si les tables existent, essayer Supabase
      if (tablesExist) {
      try {
        const { error } = await supabase
          .from('sub_accounts')
          .update({
            password_hash: passwordHash,
            updated_at: new Date().toISOString()
          })
          .eq('id', subAccountId)
          .eq('main_account_id', user.id);

        if (error) {
          throw error;
        }
        
        // Mettre à jour immédiatement l'état local
        setSubAccounts(prev => prev.map(sa => 
          sa.id === subAccountId 
            ? { ...sa, password_hash: passwordHash, updated_at: new Date().toISOString() }
            : sa
        ));
        
        return true;
        
      } catch (supabaseError) {
        console.log('⚠️ Supabase non disponible, utilisation du localStorage');
          // Fallback sera géré ci-dessous
      }
      }
      
      // Fallback vers localStorage
      const existingSubAccounts = JSON.parse(localStorage.getItem(`sub_accounts_${user.id}`) || '[]');
      const updatedSubAccounts = existingSubAccounts.map((sa: SubAccount) => 
        sa.id === subAccountId 
          ? { ...sa, password_hash: passwordHash, updated_at: new Date().toISOString() }
          : sa
      );
      
      localStorage.setItem(`sub_accounts_${user.id}`, JSON.stringify(updatedSubAccounts));
      
      setSubAccounts(updatedSubAccounts);
      
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
    tablesExist,
    createSubAccount,
    updateSubAccount,
    deleteSubAccount,
    resetSubAccountPassword,
    refetch: fetchSubAccounts,
  };
};