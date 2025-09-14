import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Form, FormResponse } from '../types/form';
import { useAuth } from '../contexts/AuthContext';

// Cache pour éviter les requêtes répétées
const formsCache = new Map<string, { data: Form[]; timestamp: number; totalCount: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useForms = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Fonction pour nettoyer le cache expiré
  const cleanExpiredCache = () => {
    const now = Date.now();
    for (const [key, value] of formsCache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        formsCache.delete(key);
      }
    }
  };

  const fetchForms = async (page: number = 1, limit: number = 10) => {
    if (!user) return;

    // Vérifier si on est en mode impersonation
    const impersonationData = localStorage.getItem('admin_impersonation');
    let targetUserId = user.id;
    
    if (impersonationData) {
      try {
        const data = JSON.parse(impersonationData);
        targetUserId = data.target_user_id;
      } catch (error) {
        // Silent error
      }
    }

    // Vérifier le cache d'abord
    const cacheKey = `${targetUserId}-${page}-${limit}`;
    cleanExpiredCache();
    
    const cached = formsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setForms(cached.data);
      setTotalCount(cached.totalCount);
      setLoading(false);
      return;
    }

    try {
      // Requête optimisée avec sélection minimale pour le comptage
      const countPromise = supabase
        .from('forms')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', targetUserId);

      const offset = (page - 1) * limit;

      // Requête optimisée avec sélection des champs essentiels seulement
      const dataPromise = supabase
        .from('forms')
        .select('id, title, description, is_published, created_at, updated_at, user_id, fields, settings')
        .eq('user_id', targetUserId)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      // Exécuter les requêtes en parallèle
      const [countResult, dataResult] = await Promise.all([countPromise, dataPromise]);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      const count = countResult.count || 0;
      const data = dataResult.data || [];

      setForms(data || []);
      setTotalCount(count);

      // Mettre en cache le résultat
      formsCache.set(cacheKey, {
        data: data || [],
        totalCount: count,
        timestamp: Date.now()
      });

      // Sauvegarder seulement les données essentielles pour les templates PDF
      if (page === 1) {
        try {
          const essentialData = data.map(form => ({
            id: form.id,
            title: form.title,
            fields: form.fields
          }));
          localStorage.setItem('currentUserForms', JSON.stringify(essentialData));
          sessionStorage.setItem('currentUserForms', JSON.stringify(essentialData));
        } catch (error) {
          // Silent error - ignore storage errors
        }
      }
    } catch (error) {
      setForms([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Invalider le cache lors des mutations
  const invalidateCache = () => {
    formsCache.clear();
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
      
      invalidateCache();
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
      invalidateCache();
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
      invalidateCache();
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

// Cache pour les réponses
const responsesCache = new Map<string, { data: FormResponse[]; timestamp: number; totalCount: number }>();

export const useFormResponses = (formId: string) => {
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchResponses = async (page: number = 1, limit: number = 10) => {
    if (!formId) return;

    // Vérifier le cache
    const cacheKey = `responses-${formId}-${page}-${limit}`;
    const cached = responsesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setResponses(cached.data);
      setTotalCount(cached.totalCount);
      setLoading(false);
      return;
    }

    const offset = (page - 1) * limit;
    
    try {
      // Requêtes parallèles optimisées
      const countPromise = supabase
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .eq('form_id', formId);

      const dataPromise = supabase
        .from('responses')
        .select('id, form_id, created_at, ip_address')
        .eq('form_id', formId)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      const [countResult, dataResult] = await Promise.all([countPromise, dataPromise]);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      const count = countResult.count || 0;
      const data = dataResult.data || [];

      const responsesData = data.map(response => ({
        ...response,
        data: {}
      }));

      setResponses(responsesData);
      setTotalCount(count);

      // Mettre en cache
      responsesCache.set(cacheKey, {
        data: responsesData,
        totalCount: count,
        timestamp: Date.now()
      });

    } catch (error) {
      setResponses([]);
      setTotalCount(0);
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
      
      // Mettre à jour seulement la réponse spécifique
      setResponses(prev => prev.map(response => 
        response.id === responseId 
          ? { ...response, data: data.data }
          : response
      ));
      
      return data.data;
    } catch (error) {
      return null;
    }
  };

  // Invalider le cache des réponses
  const invalidateResponsesCache = () => {
    for (const key of responsesCache.keys()) {
      if (key.includes(`responses-${formId}`)) {
        responsesCache.delete(key);
      }
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
    invalidateCache: invalidateResponsesCache,
  };
};