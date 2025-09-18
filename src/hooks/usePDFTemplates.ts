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
    try {
      if (user) {
        // L'utilisateur effectif est déjà géré par le contexte Auth
        const targetUserId = user.id;

        try {
          // Utilisateur connecté : récupérer ses templates depuis Supabase
          console.log('📄 Récupération templates (pas de cache):', targetUserId);
          const result = await PDFTemplateService.getUserTemplates(targetUserId, page, limit);
          setTemplates(result.templates);
          setTotalCount(result.totalCount);
          setTotalPages(result.totalPages);
        } catch (supabaseError) {
          console.warn('📄 Erreur Supabase templates:', supabaseError);
          // Vérifier si c'est une erreur de réseau
          if (supabaseError instanceof TypeError && supabaseError.message === 'Failed to fetch') {
            // Vous pouvez ajouter une notification toast ici si nécessaire
          } else {
          }
          
          // Pas de fallback cache - données vides en cas d'erreur
          setTemplates([]);
          setTotalCount(0);
          setTotalPages(0);
        }
      } else {
        // Utilisateur non connecté : données vides
        setTemplates([]);
        setTotalCount(0);
        setTotalPages(0);
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
    if (user) {
      fetchTemplates(1, 10);
    } else {
      setLoading(false);
    }
  }, [user]);

  return {
    templates,
    totalCount,
    totalPages,
    loading,
    refetch: fetchTemplates,
    fetchPage: fetchTemplates,
  };
};