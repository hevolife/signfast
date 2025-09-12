import { useState, useEffect } from 'react';
import { PDFTemplate } from '../types/pdf';
import { PDFTemplateService } from '../services/pdfTemplateService';
import { useAuth } from '../contexts/AuthContext';

export const usePDFTemplates = () => {
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTemplates = async () => {
    try {
      if (user) {
        // Vérifier si on est en mode impersonation
        const impersonationData = localStorage.getItem('admin_impersonation');
        let targetUserId = user.id;
        
        if (impersonationData) {
          try {
            const data = JSON.parse(impersonationData);
            targetUserId = data.target_user_id;
            console.log('🎭 Mode impersonation: récupération des templates pour', data.target_email);
          } catch (error) {
            console.error('Erreur parsing impersonation data:', error);
          }
        }

        try {
          // Utilisateur connecté : récupérer ses templates depuis Supabase
          const supabaseTemplates = await PDFTemplateService.getUserTemplates(targetUserId);
          setTemplates(supabaseTemplates);
          console.log('📄 Templates Supabase chargés:', supabaseTemplates.length);
        } catch (supabaseError) {
          console.warn('📄 Erreur Supabase, fallback localStorage:', supabaseError);
          // Fallback vers localStorage si Supabase n'est pas disponible
          const saved = localStorage.getItem('pdfTemplates');
          if (saved) {
            setTemplates(JSON.parse(saved));
            console.log('📄 Templates localStorage chargés');
          } else {
            setTemplates([]);
          }
        }
      } else {
        // Utilisateur non connecté : fallback localStorage
        const saved = localStorage.getItem('pdfTemplates');
        if (saved) {
          setTemplates(JSON.parse(saved));
          console.log('📄 Templates localStorage chargés');
        } else {
          setTemplates([]);
        }
      }
    } catch (error) {
      console.warn('📄 Erreur générale chargement templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  return {
    templates,
    loading,
    refetch: fetchTemplates,
  };
};