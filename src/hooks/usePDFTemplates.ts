import { useState, useEffect } from 'react';
import { PDFTemplate } from '../types/pdf';
import { PDFTemplateService } from '../services/pdfTemplateService';
import { useAuth } from '../contexts/AuthContext';

export const usePDFTemplates = () => {
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTemplates = async () => {
    // Démarrer avec un loading plus court
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.log('📄 Timeout de chargement, affichage de la liste vide');
        setTemplates([]);
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
          const supabaseTemplates = await PDFTemplateService.getUserTemplates(targetUserId);
          clearTimeout(loadingTimeout);
          setTemplates(supabaseTemplates);
        } catch (supabaseError) {
          clearTimeout(loadingTimeout);
          // Fallback vers localStorage si Supabase n'est pas disponible
          const saved = localStorage.getItem('pdfTemplates');
          if (saved) {
            setTemplates(JSON.parse(saved));
          } else {
            setTemplates([]);
          }
        }
      } else {
        clearTimeout(loadingTimeout);
        // Utilisateur non connecté : fallback localStorage
        const saved = localStorage.getItem('pdfTemplates');
        if (saved) {
          setTemplates(JSON.parse(saved));
        } else {
          setTemplates([]);
        }
      }
    } catch (error) {
      clearTimeout(loadingTimeout);
      setTemplates([]);
    } finally {
      clearTimeout(loadingTimeout);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Chargement immédiat sans attendre
    setLoading(true);
    fetchTemplates();
  }, [user]);

  return {
    templates,
    loading,
    refetch: fetchTemplates,
  };
};