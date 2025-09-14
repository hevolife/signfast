import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FormField } from '../types/form';

interface DemoUser {
  id: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}

interface DemoForm {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  settings: any;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_published: boolean;
  password: string | null;
}

interface DemoContextType {
  isDemoMode: boolean;
  demoUser: DemoUser | null;
  demoForms: DemoForm[];
  timeRemaining: number;
  startDemo: () => void;
  endDemo: () => void;
  createDemoForm: (formData: Partial<DemoForm>) => DemoForm | null;
  updateDemoForm: (id: string, updates: Partial<DemoForm>) => boolean;
  deleteDemoForm: (id: string) => boolean;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within DemoProvider');
  }
  return context;
};

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoUser, setDemoUser] = useState<DemoUser | null>(null);
  const [demoForms, setDemoForms] = useState<DemoForm[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Vérifier si une démo est en cours au chargement
  useEffect(() => {
    const savedDemo = localStorage.getItem('signfast_demo');
    if (savedDemo) {
      try {
        const demoData = JSON.parse(savedDemo);
        const now = Date.now();
        
        if (demoData.expiresAt > now) {
          setIsDemoMode(true);
          setDemoUser(demoData.user);
          setDemoForms(demoData.forms || []);
          setTimeRemaining(Math.floor((demoData.expiresAt - now) / 1000));
        } else {
          // Démo expirée, nettoyer
          localStorage.removeItem('signfast_demo');
        }
      } catch (error) {
        localStorage.removeItem('signfast_demo');
      }
    }
  }, []);

  // Timer pour décompter le temps restant
  useEffect(() => {
    if (!isDemoMode || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          endDemo();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isDemoMode, timeRemaining]);

  const startDemo = () => {
    const now = Date.now();
    const expiresAt = now + (30 * 60 * 1000); // 30 minutes
    
    const newDemoUser: DemoUser = {
      id: uuidv4(),
      email: 'demo@signfast.com',
      createdAt: now,
      expiresAt,
    };

    // Créer un formulaire de démonstration
    const demoFormFields: FormField[] = [
      {
        id: uuidv4(),
        type: 'text',
        label: 'Nom complet',
        required: true,
        placeholder: 'Votre nom et prénom'
      },
      {
        id: uuidv4(),
        type: 'email',
        label: 'Adresse email',
        required: true,
        placeholder: 'votre@email.com'
      },
      {
        id: uuidv4(),
        type: 'phone',
        label: 'Téléphone',
        required: false,
        placeholder: '01 23 45 67 89'
      },
      {
        id: uuidv4(),
        type: 'radio',
        label: 'Type de contrat',
        required: true,
        options: ['Location', 'Prestation de service', 'Contrat de travail']
      },
      {
        id: uuidv4(),
        type: 'date',
        label: 'Date de début',
        required: true
      },
      {
        id: uuidv4(),
        type: 'signature',
        label: 'Signature électronique',
        required: true
      }
    ];

    const initialDemoForm: DemoForm = {
      id: uuidv4(),
      title: 'Contrat de Démonstration',
      description: 'Formulaire de démonstration pour tester SignFast',
      fields: demoFormFields,
      settings: {
        allowMultiple: true,
        requireAuth: false,
        collectEmail: true,
        generatePdf: true,
        emailPdf: false,
        savePdfToServer: true,
      },
      user_id: newDemoUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_published: true,
      password: null,
    };

    const demoData = {
      user: newDemoUser,
      forms: [initialDemoForm],
      expiresAt,
    };

    localStorage.setItem('signfast_demo', JSON.stringify(demoData));
    
    setIsDemoMode(true);
    setDemoUser(newDemoUser);
    setDemoForms([initialDemoForm]);
    setTimeRemaining(30 * 60); // 30 minutes en secondes
  };

  const endDemo = () => {
    localStorage.removeItem('signfast_demo');
    setIsDemoMode(false);
    setDemoUser(null);
    setDemoForms([]);
    setTimeRemaining(0);
  };

  const createDemoForm = (formData: Partial<DemoForm>): DemoForm | null => {
    if (!isDemoMode || !demoUser) return null;

    // Limite de 3 formulaires en mode démo
    if (demoForms.length >= 3) {
      return null;
    }

    const newForm: DemoForm = {
      id: uuidv4(),
      title: formData.title || 'Nouveau formulaire',
      description: formData.description || '',
      fields: formData.fields || [],
      settings: formData.settings || {
        allowMultiple: true,
        requireAuth: false,
        collectEmail: false,
        generatePdf: false,
        emailPdf: false,
        savePdfToServer: false,
      },
      user_id: demoUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_published: formData.is_published || false,
      password: null,
    };

    const updatedForms = [...demoForms, newForm];
    setDemoForms(updatedForms);
    
    // Sauvegarder dans localStorage
    const demoData = JSON.parse(localStorage.getItem('signfast_demo') || '{}');
    demoData.forms = updatedForms;
    localStorage.setItem('signfast_demo', JSON.stringify(demoData));

    return newForm;
  };

  const updateDemoForm = (id: string, updates: Partial<DemoForm>): boolean => {
    if (!isDemoMode) return false;

    const updatedForms = demoForms.map(form =>
      form.id === id ? { ...form, ...updates, updated_at: new Date().toISOString() } : form
    );
    
    setDemoForms(updatedForms);
    
    // Sauvegarder dans localStorage
    const demoData = JSON.parse(localStorage.getItem('signfast_demo') || '{}');
    demoData.forms = updatedForms;
    localStorage.setItem('signfast_demo', JSON.stringify(demoData));

    return true;
  };

  const deleteDemoForm = (id: string): boolean => {
    if (!isDemoMode) return false;

    const updatedForms = demoForms.filter(form => form.id !== id);
    setDemoForms(updatedForms);
    
    // Sauvegarder dans localStorage
    const demoData = JSON.parse(localStorage.getItem('signfast_demo') || '{}');
    demoData.forms = updatedForms;
    localStorage.setItem('signfast_demo', JSON.stringify(demoData));

    return true;
  };

  const value = {
    isDemoMode,
    demoUser,
    demoForms,
    timeRemaining,
    startDemo,
    endDemo,
    createDemoForm,
    updateDemoForm,
    deleteDemoForm,
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
};