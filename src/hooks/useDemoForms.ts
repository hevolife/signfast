import { useState, useEffect } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { Form } from '../types/form';

export const useDemoForms = () => {
  const { isDemoMode, demoForms, createDemoForm, updateDemoForm, deleteDemoForm } = useDemo();
  const [loading, setLoading] = useState(false);

  const forms = isDemoMode ? demoForms.map(form => ({
    ...form,
    // Convertir au format Form attendu
  } as Form)) : [];

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
    // En mode démo, pas besoin de refetch
    return;
  };

  const fetchPage = async (page: number, limit: number) => {
    // En mode démo, pas de pagination
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