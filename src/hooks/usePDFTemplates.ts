import { useState, useEffect } from 'react';
import { PDFTemplate } from '../types/pdf';
import { PDFTemplateService } from '../services/pdfTemplateService';
import { useAuth } from '../contexts/AuthContext';

// Cache pour éviter les requêtes répétées
const templatesCache = new Map<string, { data: PDFTemplate[]; timestamp: number; totalCount: number; totalPages: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const usePDFTemplates = () => {
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Nettoyer le cache expiré
  const cleanExpiredCache = () => {
    const now = Date.now();
    for (const [key, value] of templatesCache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        templatesCache.delete(key);
      }
    }
  };

  const fetchTemplates = async (page: number = 1, limit: number = 10) => {
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

        // Vérifier le cache
        const cacheKey = `${targetUserId}-${page}-${limit}`;
        cleanExpiredCache();
        
        const cached = templatesCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          setTemplates(cached.data);
          setTotalCount(cached.totalCount);
          setTotalPages(cached.totalPages);
          setLoading(false);
          return;
        }

        try {
          // Timeout de 3 secondes pour éviter les blocages
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 3000);
          });

          const result = await PDFTemplateService.getUserTemplates(targetUserId, page, limit);
          
          setTemplates(result.templates);
          setTotalCount(result.totalCount);
          setTotalPages(result.totalPages);

          // Mettre en cache
          templatesCache.set(cacheKey, {
            data: result.templates,
            totalCount: result.totalCount,
            totalPages: result.totalPages,
            timestamp: Date.now()
          });

        } catch (supabaseError) {
          // Fallback silencieux
          setTemplates([]);
          setTotalCount(0);
          setTotalPages(0);
        }
      } else {
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

  // Invalider le cache
  const invalidateCache = () => {
    templatesCache.clear();
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
    invalidateCache,
  };
};