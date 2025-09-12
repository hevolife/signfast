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

    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForms(data || []);
      
      // Sauvegarder dans localStorage ET sessionStorage pour les templates PDF
      try {
        localStorage.setItem('currentUserForms', JSON.stringify(data || []));
        sessionStorage.setItem('currentUserForms', JSON.stringify(data || []));
        
        // Aussi sauvegarder dans une variable globale pour accès immédiat
        if (typeof window !== 'undefined') {
          (window as any).currentUserForms = data || [];
        }
        
        console.log('💾 Formulaires sauvegardés:', (data || []).length, 'formulaires');
        console.log('💾 IDs sauvegardés:', (data || []).map(f => f.id));
        console.log('💾 Détails des formulaires:', (data || []).map(f => ({
          id: f.id,
          title: f.title,
          fieldsCount: f.fields?.length || 0,
          fieldLabels: f.fields?.map((field: any) => field.label) || []
        })));
      } catch (error) {
        console.warn('Impossible de sauvegarder les formulaires:', error);
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [user]);

  const createForm = async (formData: Partial<Form>) => {
    if (!user) return null;

    // Vérifier si on est en mode impersonation
    const impersonationData = localStorage.getItem('admin_impersonation');
    let targetUserId = user.id;
    
    if (impersonationData) {
      try {
        const data = JSON.parse(impersonationData);
        targetUserId = data.target_user_id;
      } catch (error) {
        console.error('Erreur parsing impersonation data:', error);
      }
    }
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
      
      await fetchForms();
      return data;
    } catch (error) {
      console.error('Error creating form:', error);
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
      console.error('Error updating form:', error);
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
      console.error('Error deleting form:', error);
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error('Error fetching responses:', error);
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