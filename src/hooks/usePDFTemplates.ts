import { useState, useEffect } from 'react';
import { PDFTemplate } from '../types/pdf';
import { PDFTemplateService } from '../services/pdfTemplateService';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useDemoTemplates } from './useDemoForms';

export const usePDFTemplates = () => {
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { isDemoMode, demoTemplates } = useDemo();
  const demoTemplatesHook = useDemoTemplates();

  // Si on est en mode démo, utiliser les données de démo
  if (isDemoMode) {
    return demoTemplatesHook;
  }

  const fetchTemplates = async (page: number = 1, limit: number = 10) => {
    // Démarrer avec un loading plus court
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.log('📄 Timeout de chargement, affichage de la liste vide');
        setTemplates([]);
        setTotalCount(0);
        setTotalPages(0);
        setLoading(false);
      }
    }, 2000); // 2 secondes max

    try {
      if (user) {
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

        try {
          // Utilisateur connecté : récupérer ses templates depuis Supabase
          const result = await PDFTemplateService.getUserTemplates(targetUserId, page, limit);
          clearTimeout(loadingTimeout);
          setTemplates(result.templates);
          setTotalCount(result.totalCount);
          setTotalPages(result.totalPages);
        } catch (supabaseError) {
          clearTimeout(loadingTimeout);
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
        clearTimeout(loadingTimeout);
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
      clearTimeout(loadingTimeout);
      setTemplates([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      clearTimeout(loadingTimeout);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Chargement immédiat sans attendre
    setLoading(true);
    fetchTemplates(1, 10);
  }, [user, isDemoMode, demoTemplates]);

  return {
    templates,
    totalCount,
    totalPages,
    loading,
    refetch: fetchTemplates,
    fetchPage: fetchTemplates,
  };
};