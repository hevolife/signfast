import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Form, FormResponse } from '../types/form';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useDemoForms } from './useDemoForms';

export const useOptimizedForms = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const demoFormsHook = useDemoForms();

  // Mode démo
  if (isDemoMode) {
    return demoFormsHook;
  }

  const fetchForms = useCallback(async (page: number = 1, limit: number = 10) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Vérifier la configuration Supabase
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
        setForms([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const offset = (page - 1) * limit;
      
      // Requêtes parallèles optimisées
      const [countResult, dataResult] = await Promise.all([
        supabase
          .from('forms')
          .select('id', { count: 'estimated', head: true })
          .eq('user_id', user.id),
        supabase
          .from('forms')
          .select('*')
          .eq('user_id', user.id)
          .range(offset, offset + limit - 1)
          .order('created_at', { ascending: false })
      ]);

      const { count, error: countError } = countResult;
      const { data, error: dataError } = dataResult;

      if (dataError) {
        throw dataError;
      }

      setTotalCount(count || 0);
      setForms(data || []);
      
    } catch (err: any) {
      console.error('❌ Erreur récupération formulaires:', err);
      setError(err.message);
      setForms([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createForm = useCallback(async (formData: Partial<Form>) => {
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
    } catch (err: any) {
      console.error('❌ Erreur création formulaire:', err);
      return null;
    }
  }, [user, fetchForms]);

  const updateForm = useCallback(async (id: string, updates: Partial<Form>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('forms')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Mise à jour locale immédiate
      setForms(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
      
      return true;
    } catch (err: any) {
      console.error('❌ Erreur mise à jour formulaire:', err);
      return false;
    }
  }, [user]);

  const deleteForm = useCallback(async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Mise à jour locale immédiate
      setForms(prev => prev.filter(f => f.id !== id));
      setTotalCount(prev => prev - 1);
      
      return true;
    } catch (err: any) {
      console.error('❌ Erreur suppression formulaire:', err);
      return false;
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchForms(1, 10);
    } else {
      setLoading(false);
    }
  }, [user, fetchForms]);

  return {
    forms,
    totalCount,
    loading,
    error,
    createForm,
    updateForm,
    deleteForm,
    refetch: fetchForms,
    fetchPage: fetchForms,
  };
};

export const useOptimizedFormResponses = (formId: string) => {
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { isDemoMode } = useDemo();

  const fetchResponses = useCallback(async (page: number = 1, limit: number = 10) => {
    if (isDemoMode) {
      setResponses([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const offset = (page - 1) * limit;
      
      const [countResult, dataResult] = await Promise.all([
        supabase
          .from('responses')
          .select('id', { count: 'exact', head: true })
          .eq('form_id', formId),
        supabase
          .from('responses')
          .select('*')
          .eq('form_id', formId)
          .range(offset, offset + limit - 1)
          .order('created_at', { ascending: false })
      ]);

      const { count, error: countError } = countResult;
      const { data, error: dataError } = dataResult;

      if (dataError) throw dataError;

      setTotalCount(count || 0);
      setResponses(data || []);
      
    } catch (err: any) {
      console.error('❌ Erreur récupération réponses:', err);
      setError(err.message);
      setResponses([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [formId, isDemoMode]);

  useEffect(() => {
    if (formId) {
      fetchResponses();
    }
  }, [formId, fetchResponses]);

  return {
    responses,
    totalCount,
    loading,
    error,
    refetch: fetchResponses,
    fetchPage: fetchResponses,
  };
};