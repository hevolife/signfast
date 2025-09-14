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
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const demoFormsHook = useDemoForms();

  // Si on est en mode démo, utiliser les données de démo
  if (isDemoMode) {
    return demoFormsHook;
  }

  const fetchForms = async (page: number = 1, limit: number = 10) => {
    if (!user) return;

    // Check if Supabase is configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
      console.warn('Supabase non configuré, impossible de récupérer les formulaires');
      setLoading(false);
      return;
    }

    // Vérifier si on est en mode impersonation
    const impersonationData = localStorage.getItem('admin_impersonation');
    let targetUserId = user.id;
    
    if (impersonationData) {
      try {
        const data = JSON.parse(impersonationData);
        targetUserId = data.target_user_id;
        console.log('🎭 Mode impersonation: récupération des formulaires pour', data.target_email);
      } catch (error) {
        console.error('Erreur parsing impersonation data:', error);
      }
    }
    try {
      // Compter le total d'abord
      const { count, error: countError } = await supabase
        .from('forms')
        .select('id', { count: 'estimated', head: true })
        .eq('user_id', targetUserId);

      if (countError) {
        console.warn('Impossible de compter les formulaires:', countError.message);
        setTotalCount(0);
      } else {
        setTotalCount(count || 0);
      }

      // Calculer l'offset pour la pagination
      const offset = (page - 1) * limit;

      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('user_id', targetUserId)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForms(data || []);
      
      // Sauvegarder dans localStorage ET sessionStorage pour les templates PDF
      try {
        localStorage.setItem('currentUserForms', JSON.stringify(data || []));
        sessionStorage.setItem('currentUserForms', JSON.stringify(data || []));
        
        if (typeof window !== 'undefined') {
          // Silent error
        }
      } catch (error) {
        // Silent error
      }
    } catch (error) {
      console.warn('Impossible de récupérer les formulaires:', error instanceof Error ? error.message : 'Erreur inconnue');
      setForms([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms(1, 10);
  }, [user]);

  const createForm = async (formData: Partial<Form>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('forms')
        .insert([{
          ...formData,
          user_id: user.id,
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
    try {
      const { error } = await supabase
        .from('forms')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchForms(1, 10);
      return true;
    } catch (error) {
      return false;
    }
  };

  const deleteForm = async (id: string) => {
    try {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchForms(1, 10);
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