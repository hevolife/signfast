import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Form, FormResponse } from '../types/form';
import { useAuth } from '../contexts/AuthContext';
import { formsCache, cachedRequest } from '../utils/cache';

export const useForms = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchForms = async (page: number = 1, limit: number = 10) => {
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

    const cacheKey = `forms_${targetUserId}_${page}_${limit}`;
    const countCacheKey = `forms_count_${targetUserId}`;

    try {
      // Compter le total avec cache
      const count = await cachedRequest(
        countCacheKey,
        async () => {
          const { count, error: countError } = await supabase
            .from('forms')
            .select('id', { count: 'estimated', head: true })
            .eq('user_id', targetUserId);

          if (countError) {
            console.error('Error counting forms:', countError);
            return 0;
          }
          return count || 0;
        },
        2 * 60 * 1000, // 2 minutes de cache pour le count
        formsCache
      );

      setTotalCount(count);

      // Calculer l'offset pour la pagination
      const offset = (page - 1) * limit;

      // Récupérer les formulaires avec cache
      const data = await cachedRequest(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('forms')
            .select('*')
            .eq('user_id', targetUserId)
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

          if (error) throw error;
          return data || [];
        },
        1 * 60 * 1000, // 1 minute de cache pour les données
        formsCache
      );

      setForms(data);
      
      // Sauvegarder dans localStorage ET sessionStorage pour les templates PDF
      try {
        localStorage.setItem('currentUserForms', JSON.stringify(data));
        sessionStorage.setItem('currentUserForms', JSON.stringify(data));
        
        if (typeof window !== 'undefined') {
          // Silent error
        }
      } catch (error) {
        // Silent error
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
      // En cas d'erreur, essayer de récupérer depuis le cache même expiré
      const cachedData = formsCache.get(cacheKey);
      if (cachedData) {
        console.log('📦 Utilisation cache expiré en fallback');
        setForms(cachedData);
      } else {
        setForms([]);
      }
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
      
      // Invalider le cache après création
      formsCache.invalidatePattern(`forms_${user.id}`);
      
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
      
      // Invalider le cache après mise à jour
      if (user) {
        formsCache.invalidatePattern(`forms_${user.id}`);
      }
      
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
      
      // Invalider le cache après suppression
      if (user) {
        formsCache.invalidatePattern(`forms_${user.id}`);
      }
      
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
    const cacheKey = `responses_${formId}_${page}_${limit}`;
    const countCacheKey = `responses_count_${formId}`;
    
    try {
      // Compter le total avec cache
      const count = await cachedRequest(
        countCacheKey,
        async () => {
          const { count, error: countError } = await supabase
            .from('responses')
            .select('id', { count: 'exact', head: true })
            .eq('form_id', formId);

          if (countError) throw countError;
          return count || 0;
        },
        3 * 60 * 1000, // 3 minutes de cache pour le count
        formsCache
      );

      setTotalCount(count);

      // Récupérer les réponses avec cache
      const data = await cachedRequest(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('responses')
            .select('id, form_id, created_at, ip_address, user_agent')
            .eq('form_id', formId)
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

          if (error) throw error;
          return (data || []).map(response => ({
            ...response,
            data: {}
          }));
        },
        1 * 60 * 1000, // 1 minute de cache
        formsCache
      );

      setResponses(data);
    } catch (error) {
      console.error('Error fetching responses:', error);
      setResponses([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleResponseData = async (responseId: string) => {
    const cacheKey = `response_data_${responseId}`;
    
    try {
      const responseData = await cachedRequest(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('responses')
            .select('data')
            .eq('id', responseId)
            .single();

          if (error) throw error;
          return data.data;
        },
        5 * 60 * 1000, // 5 minutes de cache pour les données de réponse
        formsCache
      );
      
      // Update the specific response with its data
      setResponses(prev => prev.map(response => 
        response.id === responseId 
          ? { ...response, data: responseData }
          : response
      ));
      
      return responseData;
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