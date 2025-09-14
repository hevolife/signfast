import { useState, useEffect } from 'react';
import { PDFTemplate } from '../types/pdf';
import { PDFTemplateService } from '../services/pdfTemplateService';
import { useAuth } from '../contexts/AuthContext';
import { templatesCache, cachedRequest } from '../utils/cache';

export const usePDFTemplates = () => {
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTemplates = async (page: number = 1, limit: number = 10) => {
    if (!user) {
      setTemplates([]);
      setTotalCount(0);
      setTotalPages(0);
      setLoading(false);
      return;
    }

    // Vérifier si on est en mode impersonation
    const impersonationData = localStorage.getItem('admin_impersonation');
    let targetUserId = user.id;
    
    if (impersonationData) {
      try {
        const data = JSON.parse(impersonationData);
        targetUserId = data.target_user_id;
      } catch (error) {
        console.error('Erreur parsing impersonation data:', error);
      }
    }

    const cacheKey = `templates_${targetUserId}_${page}_${limit}`;

    try {
      // Récupérer les templates avec cache intelligent
      const result = await cachedRequest(
        cacheKey,
        async () => {
          return await PDFTemplateService.getUserTemplates(targetUserId, page, limit);
        },
        5 * 60 * 1000, // 5 minutes de cache
        templatesCache
      );

      setTemplates(result.templates);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error('Error fetching templates:', error);
      
      // Fallback vers localStorage si Supabase n'est pas disponible
      try {
        const saved = localStorage.getItem('pdfTemplates');
        if (saved) {
          const localTemplates = JSON.parse(saved);
          setTemplates(localTemplates);
          setTotalCount(localTemplates.length);
          setTotalPages(1);
        } else {
          setTemplates([]);
          setTotalCount(0);
          setTotalPages(0);
        }
      } catch (localError) {
        console.error('Error loading from localStorage:', localError);
        setTemplates([]);
        setTotalCount(0);
        setTotalPages(0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates(1, 10);
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