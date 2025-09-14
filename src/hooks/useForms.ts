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
      setLoading(false);
      return;
    }

    // L'utilisateur effectif est déjà géré par le contexte Auth
    const targetUserId = user.id;
    console.log('📝 Récupération formulaires pour userId:', targetUserId);
    
    if (isImpersonating && impersonationData) {
      console.log('🎭 Mode impersonation actif pour:', impersonationData.target_email);
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
  }, [user, isDemoMode]);

  const createForm = async (formData: Partial<Form>) => {
    if (!user) {
      console.error('❌ Pas d\'utilisateur pour createForm');
      return null;
    }

    const targetUserId = user.id;
    console.log('📝 Création formulaire pour userId:', targetUserId);
    
    if (isImpersonating && impersonationData) {
      console.log('🎭 Mode impersonation: création pour', impersonationData.target_email);
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
      
      await fetchForms(1, 10);
      return data;
    } catch (error) {
      return null;
    }
  };

  const updateForm = async (id: string, updates: Partial<Form>) => {
    if (!user) {
      console.error('❌ Pas d\'utilisateur pour updateForm');
      return false;
    }

    console.log('📝 === DÉBUT UPDATE FORM DEBUG ===');
    console.log('📝 Form ID à mettre à jour:', id);
    console.log('📝 User depuis contexte:', user?.id, user?.email);
    console.log('📝 IsImpersonating:', isImpersonating);
    console.log('📝 ImpersonationData:', impersonationData);
    console.log('📝 Updates à appliquer:', updates);
    
    let targetUserId = user.id;
    console.log('📝 User ID initial:', targetUserId);
    
    if (isImpersonating && impersonationData) {
      targetUserId = impersonationData.target_user_id;
      targetUserId = impersonationData.target_user_id;
      console.log('🎭 Mode impersonation détecté');
      console.log('🎭 Admin user:', impersonationData.admin_email);
      console.log('🎭 Target user:', impersonationData.target_email);
      console.log('🎭 Target user ID:', targetUserId);
      console.log('🎭 Target user ID:', targetUserId);
    }

    try {
      console.log('📝 === TENTATIVE MISE À JOUR SUPABASE ===');
      console.log('📝 Paramètres finaux:', {
        formId: id,
        targetUserId: targetUserId,
        updatesKeys: Object.keys(updates),
        updatesSize: JSON.stringify(updates).length
      });
      
      const { error } = await supabase
        .from('forms')
        .update(updates)
        .eq('id', id)
        .eq('user_id', targetUserId);

      if (error) {
        console.error('📝 === ERREUR SUPABASE ===');
        console.error('📝 Message:', error.message);
        console.error('📝 Code:', error.code);
        console.error('📝 Détails:', error.details);
        console.error('📝 Hint:', error.hint);
        console.error('📝 Erreur complète:', error);
        console.error('📝 Contexte de l\'erreur:', {
          formId: id,
          targetUserId: targetUserId,
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('📝 === SUCCÈS MISE À JOUR ===');
      console.log('📝 Formulaire mis à jour avec succès pour user:', targetUserId);
      await fetchForms(1, 10); // Recharger la liste
      console.log('📝 Liste des formulaires rechargée');
      return true;
    } catch (error) {
      console.error('📝 === ERREUR GÉNÉRALE UPDATE FORM ===');
      console.error('📝 Type d\'erreur:', typeof error);
      console.error('📝 Instance Error?:', error instanceof Error);
      console.error('📝 Message:', error instanceof Error ? error.message : String(error));
      console.error('📝 Stack:', error instanceof Error ? error.stack : 'Pas de stack');
      console.error('📝 Erreur complète:', error);
      return false;
    }
  };

  const deleteForm = async (id: string) => {
    if (!user) {
      console.error('❌ Pas d\'utilisateur pour deleteForm');
      return false;
    }

    const targetUserId = user.id;
    console.log('📝 Suppression formulaire pour userId:', targetUserId);
    
    if (isImpersonating && impersonationData) {
      console.log('🎭 Mode impersonation: suppression pour', impersonationData.target_email);
    }

    try {
      console.log('📝 Tentative mise à jour avec:', { id, targetUserId, updates });
      
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', id)
        .eq('user_id', targetUserId);

      if (error) {
        console.error('❌ Erreur Supabase updateForm:', error);
        console.error('❌ Détails erreur:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('✅ Formulaire supprimé avec succès');
      await fetchForms(1, 10); // Recharger la liste
      return true;
    } catch (error) {
      console.error('❌ Erreur générale updateForm:', error);
      console.error('❌ Type d\'erreur:', typeof error);
      console.error('❌ Message d\'erreur:', error instanceof Error ? error.message : String(error));
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