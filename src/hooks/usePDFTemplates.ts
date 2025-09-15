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