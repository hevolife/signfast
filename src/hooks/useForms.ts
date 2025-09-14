import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Form, FormResponse } from '../types/form';
import { useAuth } from '../contexts/AuthContext';

export const useForms = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchForms = async () => {
    if (!user) return;

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
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('user_id', targetUserId)
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
      // Silent error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
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
      
      await fetchForms();
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
      await fetchForms();
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
      await fetchForms();
      return true;
    } catch (error) {
      return false;
    }
  };

  return {
    forms,
    loading,
    createForm,
    updateForm,
    deleteForm,
    refetch: fetchForms,
  };
};

export const useFormResponses = (formId: string) => {
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('responses')
        .select('*')
        .eq('form_id', formId)
        .limit(500)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      // Silent error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formId) {
      fetchResponses();
    }
  }, [formId]);

  return {
    responses,
    loading,
    refetch: fetchResponses,
  };
};