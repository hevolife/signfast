import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from './useSubscription';
import { useForms } from './useForms';
import { usePDFTemplates } from './usePDFTemplates';
import { PDFService } from '../services/pdfService';
import { stripeConfig } from '../stripe-config';

interface LimitData {
  current: number;
  max: number;
  canCreate: boolean;
  canSave?: boolean;
}

export const useLimits = () => {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const { forms } = useForms();
  const { templates } = usePDFTemplates();
  const [savedPdfsCount, setSavedPdfsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Debug pour vérifier l'état de l'abonnement
  useEffect(() => {
    console.log('🔍 useLimits - État abonnement:', {
      isSubscribed,
      formsCount: forms.length,
      templatesCount: templates.length,
      savedPdfsCount
    });
  }, [isSubscribed, forms.length, templates.length, savedPdfsCount]);

  const refreshLimits = async () => {
    try {
      const count = await PDFService.countPDFs();
      setSavedPdfsCount(count);
    } catch (error) {
      console.error('Erreur refresh limits:', error);
      setSavedPdfsCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLimits();
  }, [user]);

  // Calculer les limites selon l'abonnement
  const getFormsLimits = (): LimitData => {
    const current = forms.length;
    const max = isSubscribed ? Infinity : stripeConfig.freeLimits.maxForms;
    
    console.log('🔍 getFormsLimits:', {
      isSubscribed,
      current,
      max,
      canCreate: isSubscribed || current < max
    });
    
    return {
      current,
      max,
      canCreate: isSubscribed || current < max,
    };
  };

  const getPdfTemplatesLimits = (): LimitData => {
    const current = templates.length;
    const max = isSubscribed ? Infinity : stripeConfig.freeLimits.maxPdfTemplates;
    
    console.log('🔍 getPdfTemplatesLimits:', {
      isSubscribed,
      current,
      max,
      canCreate: isSubscribed || current < max
    });
    
    return {
      current,
      max,
      canCreate: isSubscribed || current < max,
    };
  };

  const getSavedPdfsLimits = (): LimitData => {
    const current = savedPdfsCount;
    const max = isSubscribed ? Infinity : stripeConfig.freeLimits.maxSavedPdfs;
    
    console.log('📊 Limites PDFs calculées:', {
      current,
      max,
      isSubscribed,
      canCreate: isSubscribed || current < max,
      canSave: isSubscribed || current < max
    });
    
    return {
      current,
      max,
      canCreate: isSubscribed || current < max,
      canSave: isSubscribed || current < max,
    };
  };

  return {
    forms: getFormsLimits(),
    pdfTemplates: getPdfTemplatesLimits(),
    savedPdfs: getSavedPdfsLimits(),
    loading,
    refreshLimits,
  };
};