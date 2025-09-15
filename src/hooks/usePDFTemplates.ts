import { useState, useEffect } from 'react';
import { PDFTemplate } from '../types/pdf';
import { PDFTemplateService } from '../services/pdfTemplateService';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useDemoTemplates } from './useDemoForms';

export const usePDFTemplates = () => {
  const { user } = useAuth();
  const { isDemoMode, demoTemplates } = useDemo();
  const demoTemplatesHook = useDemoTemplates();
  
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async (page: number = 1, limit: number = 10) => {
    // Si on est en mode démo, déléguer au hook démo
    if (isDemoMode) {
      return;
    }

    try {
      if (user) {
        // L'utilisateur effectif est déjà géré par le contexte Auth
        const targetUserId = user.id;

        try {
          // Utilisateur connecté : récupérer ses templates depuis Supabase
          const result = await PDFTemplateService.getUserTemplates(targetUserId, page, limit);
          setTemplates(result.templates);
          setTotalCount(result.totalCount);
          setTotalPages(result.totalPages);
        } catch (supabaseError) {
          // Vérifier si c'est une erreur de réseau
          if (supabaseError instanceof TypeError && supabaseError.message === 'Failed to fetch') {
            // Vous pouvez ajouter une notification toast ici si nécessaire
          } else {
          }
          
          // Fallback vers localStorage si Supabase n'est pas disponible
          const saved = localStorage.getItem('pdfTemplates');
          if (saved) {
            setTemplates(JSON.parse(saved));
            setTotalCount(JSON.parse(saved).length);
            setTotalPages(1);
          } else {
            setTemplates([]);
            setTotalCount(0);
            setTotalPages(0);
          }
        }
      } else {
        // Utilisateur non connecté : fallback localStorage
        const saved = localStorage.getItem('pdfTemplates');
        if (saved) {
          setTemplates(JSON.parse(saved));
          setTotalCount(JSON.parse(saved).length);
          setTotalPages(1);
        } else {
          setTemplates([]);
          setTotalCount(0);
          setTotalPages(0);
        }
      }
    } catch (error) {
      setTemplates([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDemoMode) {
      // En mode démo, utiliser les données du hook démo
      setTemplates(demoTemplatesHook.templates);
      setTotalCount(demoTemplatesHook.totalCount);
      setTotalPages(demoTemplatesHook.totalPages);
      setLoading(demoTemplatesHook.loading);
      return;
    }

    if (user) {
      fetchTemplates(1, 10);
    } else {
      setLoading(false);
    }
  }, [user, isDemoMode, demoTemplatesHook.templates, demoTemplatesHook.totalCount, demoTemplatesHook.totalPages, demoTemplatesHook.loading]);

  // Si on est en mode démo, retourner les données du hook démo
  if (isDemoMode) {
    return {
      templates: demoTemplatesHook.templates,
      totalCount: demoTemplatesHook.totalCount,
      totalPages: demoTemplatesHook.totalPages,
      loading: demoTemplatesHook.loading,
      refetch: demoTemplatesHook.refetch,
      fetchPage: demoTemplatesHook.fetchPage,
    };
  }

  return {
    templates,
    totalCount,
    totalPages,
    loading,
    refetch: fetchTemplates,
    fetchPage: fetchTemplates,
  };
};