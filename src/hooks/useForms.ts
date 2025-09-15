import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Form, FormResponse } from '../types/form';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useDemoForms } from './useDemoForms';

export const useForms = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user, isImpersonating, impersonationData } = useAuth();
  const { isDemoMode } = useDemo();
  const demoFormsHook = useDemoForms();

  // Si on est en mode démo, utiliser les données de démo
  if (isDemoMode) {
    console.log('📝 Mode démo actif, utilisation hook démo');
    return demoFormsHook;
  }

  const fetchForms = async (page: number = 1, limit: number = 10) => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Check if Supabase is configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
      console.warn('Supabase non configuré, impossible de récupérer les formulaires');
      setForms([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    // L'utilisateur effectif est déjà géré par le contexte Auth
    const targetUserId = user.id;

    try {
      // Requêtes parallèles pour optimiser les performances
      const offset = (page - 1) * limit;
      
      const [countResult, dataResult] = await Promise.all([
        supabase
          .from('forms')
          .select('id', { count: 'estimated', head: true })
          .eq('user_id', targetUserId),
        supabase
          .from('forms')
          .select('*')
          .eq('user_id', targetUserId)
          .range(offset, offset + limit - 1)
          .order('created_at', { ascending: false })
      ]);

      const { count, error: countError } = countResult;
      const { data, error } = dataResult;

      if (error) {
        throw error;
      }

      if (countError) {
        console.warn('Impossible de compter les formulaires:', countError.message);
        setTotalCount(data?.length || 0);
      } else {
        setTotalCount(count || 0);
      }

      setForms(data || []);
      
      // Sauvegarder dans localStorage ET sessionStorage pour les templates PDF
      try {
        localStorage.setItem('currentUserForms', JSON.stringify(data || []));
        sessionStorage.setItem('currentUserForms', JSON.stringify(data || []));
        
        // Déclencher un événement pour notifier les autres composants
        window.dispatchEvent(new CustomEvent('formsLoaded', { 
          detail: { forms: data || [], userId: targetUserId }
        }));
        
        if (typeof window !== 'undefined') {
          // Silent error
        }
      } catch (error) {
        // Silent error
      }
    } catch (error) {
      setForms([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchForms(1, 10);
    } else {
      setLoading(false);
    }
  }, [user, isDemoMode]);

  const createForm = async (formData: Partial<Form>) => {
    if (!user) {
      return null;
    }

    const targetUserId = user.id;

    try {
      const { data, error } = await supabase
        .from('forms')
        .insert([{
          ...formData,
          user_id: targetUserId,
        }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchForms(1, 10);
      return data;
    } catch (error) {
      return null;
    }
  };

  const updateForm = async (id: string, updates: Partial<Form>) => {
    if (!user) {
      return false;
    }

    try {
      const targetUserId = user.id;

      const { error } = await supabase
        .from('forms')
        .update(updates)
        .eq('id', id)
        .eq('user_id', targetUserId);

      if (error) {
        // Check if it's a network error
        if (error.message.includes('Failed to fetch') || error.message.includes('Network error')) {
          throw new Error('Erreur de connexion au serveur. Vérifiez votre connexion internet.');
        }
        
        throw error;
      }
      
      // Vérifier que la mise à jour a bien eu lieu
      const { data: verifyData, error: verifyError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .eq('user_id', targetUserId)
        .single();
      
      if (verifyError) {
        return false;
      }
      
      // Mettre à jour le formulaire dans la liste locale immédiatement
      setForms(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
      
      // Puis recharger depuis la base pour être sûr
      setTimeout(() => {
        fetchForms(1, 10);
      }, 100);
      
      return true;
    } catch (error) {
      // Re-throw with a user-friendly message
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        throw new Error('Impossible de se connecter au serveur. Vérifiez votre connexion internet et réessayez.');
      }
      
      return false;
    }
  };

  const deleteForm = async (id: string) => {
    if (!user) {
      return false;
    }

    const targetUserId = user.id;

    try {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', id)
        .eq('user_id', targetUserId);

      if (error) {
        throw error;
      }
      
      await fetchForms(1, 10); // Recharger la liste
      return true;
    } catch (error) {
      return false;
    }
  };

  return {
    forms,
    totalCount,
    loading,
    createForm,
    updateForm,
    deleteForm,
    refetch: fetchForms,
    fetchPage: fetchForms,
  };
};

export const useFormResponses = (formId: string) => {
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const { isDemoMode } = useDemo();

  // If in demo mode, return empty data without making Supabase requests
  if (isDemoMode) {
    return {
      responses: [],
      totalCount: 0,
      loading: false,
      fetchSingleResponseData: async () => null,
      refetch: async () => {},
      fetchPage: async () => {},
    };
  }

  const fetchResponses = async (page: number = 1, limit: number = 10) => {
    const offset = (page - 1) * limit;
    
    try {
      // First get the total count
      const { count, error: countError } = await supabase
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .eq('form_id', formId);

      if (countError) throw countError;
      setTotalCount(count || 0);

      // Fetch only essential metadata first to avoid timeout
      const { data, error } = await supabase
        .from('responses')
        .select('id, form_id, created_at, ip_address, user_agent')
        .eq('form_id', formId)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Set responses with empty data field initially
      setResponses((data || []).map(response => ({
        ...response,
        data: {}
      })));
    } catch (error) {
      // Silent error
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleResponseData = async (responseId: string) => {
    try {
      const { data, error } = await supabase
        .from('responses')
        .select('data')
        .eq('id', responseId)
        .single();

      if (error) throw error;
      
      // Update the specific response with its data
      setResponses(prev => prev.map(response => 
        response.id === responseId 
          ? { ...response, data: data.data }
          : response
      ));
      
      return data.data;
    } catch (error) {
      console.error('Error fetching response data:', error);
      return null;
    }
  };
  useEffect(() => {
    if (formId) {
      fetchResponses();
    }
  }, [formId]);

  return {
    responses,
    totalCount,
    loading,
    fetchSingleResponseData,
    refetch: fetchResponses,
    fetchPage: fetchResponses,
  };
};