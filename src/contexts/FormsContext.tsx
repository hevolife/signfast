import React, { createContext, useContext, useState, useEffect } from 'react';
import { Form } from '../types/form';
import { useAuth } from './AuthContext';

interface FormsContextType {
  forms: Form[];
  addForm: (form: Omit<Form, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  updateForm: (id: string, updates: Partial<Form>) => void;
  deleteForm: (id: string) => void;
  getForm: (id: string) => Form | undefined;
  loading: boolean;
}

const FormsContext = createContext<FormsContextType | undefined>(undefined);

export const useForms = () => {
  const context = useContext(FormsContext);
  if (!context) {
    throw new Error('useForms must be used within FormsProvider');
  }
  return context;
};

export const FormsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Charger les formulaires depuis le localStorage au démarrage
  useEffect(() => {
    if (user) {
      const savedForms = localStorage.getItem(`forms_${user.id}`);
      if (savedForms) {
        try {
          setForms(JSON.parse(savedForms));
        } catch (error) {
          console.error('Erreur lors du chargement des formulaires:', error);
        }
      }
    }
  }, [user]);

  // Sauvegarder les formulaires dans le localStorage
  const saveForms = (newForms: Form[]) => {
    if (user) {
      localStorage.setItem(`forms_${user.id}`, JSON.stringify(newForms));
    }
  };

  const addForm = (formData: Omit<Form, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    const newForm: Form = {
      ...formData,
      id: `form_${Date.now()}`,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedForms = [...forms, newForm];
    setForms(updatedForms);
    saveForms(updatedForms);
  };

  const updateForm = (id: string, updates: Partial<Form>) => {
    const updatedForms = forms.map(form =>
      form.id === id
        ? { ...form, ...updates, updated_at: new Date().toISOString() }
        : form
    );
    setForms(updatedForms);
    saveForms(updatedForms);
  };

  const deleteForm = (id: string) => {
    const updatedForms = forms.filter(form => form.id !== id);
    setForms(updatedForms);
    saveForms(updatedForms);
  };

  const getForm = (id: string) => {
    return forms.find(form => form.id === id);
  };

  const value = {
    forms,
    addForm,
    updateForm,
    deleteForm,
    getForm,
    loading,
  };

  return (
    <FormsContext.Provider value={value}>
      {children}
    </FormsContext.Provider>
  );
};