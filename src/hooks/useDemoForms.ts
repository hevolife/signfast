import { useState, useEffect } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { Form } from '../types/form';
import { PDFTemplate } from '../types/pdf';

export const useDemoForms = () => {
  const { isDemoMode, demoForms, createDemoForm, updateDemoForm, deleteDemoForm } = useDemo();
  const [loading, setLoading] = useState(false);

  // Écouter les changements de configuration admin
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'demo_admin_forms' && isDemoMode) {
        console.log('📝 Mise à jour des formulaires de démo détectée');
        // Force un re-render
        setLoading(true);
        setTimeout(() => setLoading(false), 100);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isDemoMode]);

  const forms = isDemoMode ? demoForms : [];

  const totalCount = forms.length;

  const createForm = async (formData: Partial<Form>) => {
    if (!isDemoMode) return null;

    // Limite de 3 formulaires en mode démo
    if (forms.length >= 3) {
      return null;
    }

    const newForm = createDemoForm(formData);
    return newForm;
  };

  const updateForm = async (id: string, updates: Partial<Form>) => {
    if (!isDemoMode) return false;
    return updateDemoForm(id, updates);
  };

  const deleteForm = async (id: string) => {
    if (!isDemoMode) return false;
    return deleteDemoForm(id);
  };

  const refetch = async () => {
    // En mode démo, simuler un refetch
    setLoading(true);
    setTimeout(() => setLoading(false), 200);
    return;
  };

  const fetchPage = async (page: number, limit: number) => {
    // En mode démo, simuler le chargement
    setLoading(true);
    setTimeout(() => setLoading(false), 200);
    return;
  };

  return {
    forms,
    totalCount,
    loading,
    createForm,
    updateForm,
    deleteForm,
    refetch,
    fetchPage,
  };
};

export const useDemoTemplates = () => {
  const { isDemoMode, demoTemplates, createDemoTemplate, updateDemoTemplate, deleteDemoTemplate } = useDemo();
  const [loading, setLoading] = useState(false);

  // Écouter les changements de configuration admin
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'demo_admin_templates' && isDemoMode) {
        console.log('📄 Mise à jour des templates de démo détectée');
        // Force un re-render
        setLoading(true);
        setTimeout(() => setLoading(false), 100);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isDemoMode]);

  const templates = isDemoMode ? demoTemplates : [];

  const totalCount = templates.length;

  const createTemplate = async (templateData: Partial<PDFTemplate>) => {
    if (!isDemoMode) return null;

    // Limite de 3 templates en mode démo
    const maxTemplates = 3;
    
    if (templates.length >= maxTemplates) {
      return null;
    }

    const newTemplate = createDemoTemplate(templateData);
    return newTemplate?.id || null;
  };

  const updateTemplate = async (id: string, updates: Partial<PDFTemplate>) => {
    if (!isDemoMode) return false;
    return updateDemoTemplate(id, updates);
  };

  const deleteTemplate = async (id: string) => {
    if (!isDemoMode) return false;
    return deleteDemoTemplate(id);
  };

  const refetch = async () => {
    // En mode démo, simuler un refetch
    setLoading(true);
    setTimeout(() => setLoading(false), 200);
    return;
  };

  const fetchPage = async (page: number, limit: number) => {
    // En mode démo, simuler le chargement
    setLoading(true);
    setTimeout(() => setLoading(false), 200);
    return;
  };

  return {
    templates,
    totalCount,
    totalPages: Math.ceil(totalCount / 10),
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch,
    fetchPage,
  };
};