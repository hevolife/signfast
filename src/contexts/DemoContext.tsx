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

interface DemoTemplate {
  id: string;
  name: string;
  description: string;
  originalPdfUrl: string;
  fields: any[];
  linkedFormId?: string;
  pages: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface DemoContextType {
  isDemoMode: boolean;
  demoUser: DemoUser | null;
  demoForms: DemoForm[];
  demoTemplates: DemoTemplate[];
  timeRemaining: number;
  demoSettings: any;
  startDemo: () => void;
  endDemo: () => void;
  createDemoForm: (formData: Partial<DemoForm>) => DemoForm | null;
  updateDemoForm: (id: string, updates: Partial<DemoForm>) => boolean;
  deleteDemoForm: (id: string) => boolean;
  createDemoTemplate: (templateData: Partial<DemoTemplate>) => DemoTemplate | null;
  updateDemoTemplate: (id: string, updates: Partial<DemoTemplate>) => boolean;
  deleteDemoTemplate: (id: string) => boolean;
  refreshDemoSettings: () => void;
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
  const [demoTemplates, setDemoTemplates] = useState<DemoTemplate[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [demoSettings, setDemoSettings] = useState<any>({
    durationMinutes: 30,
    maxForms: 3,
    maxTemplates: 3,
    welcomeMessage: 'Bienvenue dans la démo SignFast ! Testez toutes les fonctionnalités pendant 30 minutes.',
    features: [
      'Création de formulaires illimitée',
      'Templates PDF avec champs dynamiques',
      'Génération PDF automatique',
      'Signature électronique',
      'Interface responsive'
    ]
  });

  // Vérifier si une démo est en cours au chargement
  useEffect(() => {
    // Charger les paramètres de démo depuis localStorage
    loadDemoSettings();
    
    const savedDemo = localStorage.getItem('signfast_demo');
    if (savedDemo) {
      try {
        const demoData = JSON.parse(savedDemo);
        const now = Date.now();
        
        if (demoData.expiresAt > now) {
          setIsDemoMode(true);
          setDemoUser(demoData.user);
          setDemoForms(demoData.forms || []);
          setDemoTemplates(demoData.templates || []);
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

  const loadDemoSettings = () => {
    try {
      const savedSettings = localStorage.getItem('demo_admin_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setDemoSettings(settings);
        console.log('🎭 Paramètres de démo chargés:', settings);
      }
    } catch (error) {
      console.error('Erreur chargement paramètres démo:', error);
    }
  };

  const refreshDemoSettings = () => {
    loadDemoSettings();
  };

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
    // Charger les paramètres de démo actuels
    loadDemoSettings();
    const currentSettings = JSON.parse(localStorage.getItem('demo_admin_settings') || '{}');
    const durationMinutes = currentSettings.durationMinutes || 30;
    const maxForms = currentSettings.maxForms || 3;
    
    const now = Date.now();
    const expiresAt = now + (durationMinutes * 60 * 1000);
    
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

    // Créer des templates PDF de démonstration
    const demoTemplates: DemoTemplate[] = [
      {
        id: uuidv4(),
        name: 'Contrat de Location Meublée',
        description: 'Template pour contrat de location avec champs pré-positionnés',
        originalPdfUrl: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggMTAwCj4+CnN0cmVhbQpCVApxCjcyIDcyMCBUZApxCi9GMSAxMiBUZgooQ09OVFJBVCBERSBMT0NBVElPTikgVGoKRVQKcQo3MiA2ODAgVGQKcQovRjEgMTAgVGYKKE5vbSBkdSBsb2NhdGFpcmU6KSBUagpFVApxCjcyIDY0MCBUZA==',
        fields: [
          {
            id: uuidv4(),
            type: 'text',
            page: 1,
            variable: '${nom}',
            xRatio: 0.3,
            yRatio: 0.2,
            widthRatio: 0.25,
            heightRatio: 0.04,
            fontSize: 12,
            fontColor: '#000000',
            backgroundColor: '#ffffff',
            required: true,
          },
          {
            id: uuidv4(),
            type: 'date',
            page: 1,
            variable: '${date_debut}',
            xRatio: 0.6,
            yRatio: 0.3,
            widthRatio: 0.15,
            heightRatio: 0.04,
            fontSize: 12,
            fontColor: '#000000',
            backgroundColor: '#ffffff',
            required: true,
          },
          {
            id: uuidv4(),
            type: 'signature',
            page: 1,
            variable: '${signature}',
            xRatio: 0.1,
            yRatio: 0.7,
            widthRatio: 0.35,
            heightRatio: 0.1,
            required: true,
          }
        ],
        linkedFormId: initialDemoForm.id,
        pages: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: newDemoUser.id,
      },
      {
        id: uuidv4(),
        name: 'Facture de Prestation',
        description: 'Template pour factures avec calculs automatiques',
        originalPdfUrl: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggODAKPj4Kc3RyZWFtCkJUCnEKNzIgNzIwIFRkCnEKL0YxIDEyIFRmCihGQUNUVVJFKSBUagpFVApxCjcyIDY4MCBUZA==',
        fields: [
          {
            id: uuidv4(),
            type: 'text',
            page: 1,
            variable: '${entreprise}',
            xRatio: 0.1,
            yRatio: 0.15,
            widthRatio: 0.3,
            heightRatio: 0.04,
            fontSize: 12,
            fontColor: '#000000',
            backgroundColor: '#ffffff',
            required: true,
          },
          {
            id: uuidv4(),
            type: 'number',
            page: 1,
            variable: '${montant}',
            xRatio: 0.7,
            yRatio: 0.5,
            widthRatio: 0.15,
            heightRatio: 0.04,
            fontSize: 12,
            fontColor: '#000000',
            backgroundColor: '#ffffff',
            required: true,
          }
        ],
        pages: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: newDemoUser.id,
      }
    ];


    const demoData = {
      user: newDemoUser,
      forms: [initialDemoForm],
      templates: demoTemplates,
      expiresAt,
    };

    localStorage.setItem('signfast_demo', JSON.stringify(demoData));
    
    setIsDemoMode(true);
    setDemoUser(newDemoUser);
    setDemoForms([initialDemoForm]);
    setDemoTemplates(demoTemplates);
    setTimeRemaining(durationMinutes * 60);
    
    console.log('🎭 Démo démarrée avec durée:', durationMinutes, 'minutes');
  };

  const endDemo = () => {
    localStorage.removeItem('signfast_demo');
    setIsDemoMode(false);
    setDemoUser(null);
    setDemoForms([]);
    setDemoTemplates([]);
    setTimeRemaining(0);
  };

  const createDemoForm = (formData: Partial<DemoForm>): DemoForm | null => {
    if (!isDemoMode || !demoUser) return null;

    // Limite selon les paramètres admin
    const maxForms = demoSettings.maxForms || 3;
    if (demoForms.length >= maxForms) {
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

  const createDemoTemplate = (templateData: Partial<DemoTemplate>): DemoTemplate | null => {
    if (!isDemoMode || !demoUser) return null;

    // Limite selon les paramètres admin
    const maxTemplates = demoSettings.maxTemplates || 3;
    if (demoTemplates.length >= maxTemplates) {
      return null;
    }

    const newTemplate: DemoTemplate = {
      id: uuidv4(),
      name: templateData.name || 'Nouveau template',
      description: templateData.description || '',
      originalPdfUrl: templateData.originalPdfUrl || '',
      fields: templateData.fields || [],
      linkedFormId: templateData.linkedFormId,
      pages: templateData.pages || 1,
      user_id: demoUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedTemplates = [...demoTemplates, newTemplate];
    setDemoTemplates(updatedTemplates);
    
    // Sauvegarder dans localStorage
    const demoData = JSON.parse(localStorage.getItem('signfast_demo') || '{}');
    demoData.templates = updatedTemplates;
    localStorage.setItem('signfast_demo', JSON.stringify(demoData));

    return newTemplate;
  };

  const updateDemoTemplate = (id: string, updates: Partial<DemoTemplate>): boolean => {
    if (!isDemoMode) return false;

    const updatedTemplates = demoTemplates.map(template =>
      template.id === id ? { ...template, ...updates, updated_at: new Date().toISOString() } : template
    );
    
    setDemoTemplates(updatedTemplates);
    
    // Sauvegarder dans localStorage
    const demoData = JSON.parse(localStorage.getItem('signfast_demo') || '{}');
    demoData.templates = updatedTemplates;
    localStorage.setItem('signfast_demo', JSON.stringify(demoData));

    return true;
  };

  const deleteDemoTemplate = (id: string): boolean => {
    if (!isDemoMode) return false;

    const updatedTemplates = demoTemplates.filter(template => template.id !== id);
    setDemoTemplates(updatedTemplates);
    
    // Sauvegarder dans localStorage
    const demoData = JSON.parse(localStorage.getItem('signfast_demo') || '{}');
    demoData.templates = updatedTemplates;
    localStorage.setItem('signfast_demo', JSON.stringify(demoData));

    return true;
  };

  const value = {
    isDemoMode,
    demoUser,
    demoForms,
    demoTemplates,
    timeRemaining,
    demoSettings,
    startDemo,
    endDemo,
    createDemoForm,
    updateDemoForm,
    deleteDemoForm,
    createDemoTemplate,
    updateDemoTemplate,
    deleteDemoTemplate,
    refreshDemoSettings,
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
};