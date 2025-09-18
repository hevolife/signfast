import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { 
  Settings, 
  FileText, 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit,
  Clock,
  Users,
  Crown,
  Eye,
  Download,
  Upload
} from 'lucide-react';
import { FormField } from '../../types/form';
import { PDFField } from '../../types/pdf';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { useDemo } from '../../contexts/DemoContext';

interface DemoSettings {
  durationMinutes: number;
  maxForms: number;
  maxTemplates: number;
  welcomeMessage: string;
  features: string[];
}

interface DemoFormTemplate {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  settings: any;
}

interface DemoPDFTemplate {
  id: string;
  name: string;
  description: string;
  fields: PDFField[];
  pages: number;
}

export const DemoManagementPanel: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'settings' | 'forms' | 'templates'>('settings');
  const { refreshDemoSettings } = useDemo();
  const [demoSettings, setDemoSettings] = useState<DemoSettings>({
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
  
  const [demoForms, setDemoForms] = useState<DemoFormTemplate[]>([]);
  const [demoTemplates, setDemoTemplates] = useState<DemoPDFTemplate[]>([]);
  const [editingForm, setEditingForm] = useState<DemoFormTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<DemoPDFTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  useEffect(() => {
    loadDemoConfiguration();
  }, []);

  const loadDemoConfiguration = () => {
    try {
      // Charger les paramètres de démo depuis localStorage
      const savedSettings = localStorage.getItem('demo_admin_settings');
      if (savedSettings) {
        setDemoSettings(JSON.parse(savedSettings));
      }

      // Charger les templates de formulaires de démo
      const savedForms = localStorage.getItem('demo_admin_forms');
      if (savedForms) {
        setDemoForms(JSON.parse(savedForms));
      } else {
        // Créer des formulaires par défaut
        setDemoForms([
          {
            id: 'demo-form-1',
            title: 'Contrat de Démonstration',
            description: 'Formulaire de démonstration pour tester SignFast',
            fields: [
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
            ],
            settings: {
              allowMultiple: true,
              requireAuth: false,
              collectEmail: true,
              generatePdf: true,
              emailPdf: false,
              savePdfToServer: true,
            }
          }
        ]);
      }

      // Charger les templates PDF de démo
      const savedTemplates = localStorage.getItem('demo_admin_templates');
      if (savedTemplates) {
        setDemoTemplates(JSON.parse(savedTemplates));
      } else {
        // Créer des templates par défaut
        setDemoTemplates([
          {
            id: 'demo-template-1',
            name: 'Contrat de Location Meublée',
            description: 'Template pour contrat de location avec champs pré-positionnés',
            fields: [
              {
                id: uuidv4(),
                type: 'text',
                page: 1,
                variable: '${nom_complet}',
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
                variable: '${date_de_debut}',
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
                variable: '${signature_electronique}',
                xRatio: 0.1,
                yRatio: 0.7,
                widthRatio: 0.35,
                heightRatio: 0.1,
                required: true,
              }
            ],
            pages: 1,
          },
          {
            id: 'demo-template-2',
            name: 'Facture de Prestation',
            description: 'Template pour factures avec calculs automatiques',
            fields: [
              {
                id: uuidv4(),
                type: 'text',
                page: 1,
                variable: '${adresse_email}',
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
                type: 'phone',
                page: 1,
                variable: '${telephone}',
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
          }
        ]);
      }
    } catch (error) {
      console.error('Erreur chargement configuration démo:', error);
    }
  };

  const saveDemoConfiguration = async () => {
    setSaving(true);
    try {
      // Sauvegarder les paramètres
      localStorage.setItem('demo_admin_settings', JSON.stringify(demoSettings));
      
      // Sauvegarder les formulaires de démo
      localStorage.setItem('demo_admin_forms', JSON.stringify(demoForms));
      
      // Sauvegarder les templates de démo
      localStorage.setItem('demo_admin_templates', JSON.stringify(demoTemplates));
      
      // Actualiser les paramètres dans le contexte démo
      refreshDemoSettings();
      
      // Déclencher un événement storage pour notifier les autres onglets/fenêtres
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'demo_admin_settings',
        newValue: JSON.stringify(demoSettings),
        storageArea: localStorage
      }));
      
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'demo_admin_forms',
        newValue: JSON.stringify(demoForms),
        storageArea: localStorage
      }));
      
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'demo_admin_templates',
        newValue: JSON.stringify(demoTemplates),
        storageArea: localStorage
      }));
      
      toast.success('Configuration de démo sauvegardée !');
      
      // Message informatif pour les démos en cours
      setTimeout(() => {
        toast('💡 Les démos en cours seront mises à jour au prochain démarrage', {
          duration: 4000,
          icon: '🔄'
        });
      }, 1000);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const addDemoForm = () => {
    const newForm: DemoFormTemplate = {
      id: uuidv4(),
      title: 'Nouveau formulaire de démo',
      description: 'Description du formulaire',
      fields: [
        {
          id: uuidv4(),
          type: 'text',
          label: 'Nom',
          required: true,
          placeholder: 'Votre nom'
        }
      ],
      settings: {
        allowMultiple: true,
        requireAuth: false,
        collectEmail: false,
        generatePdf: false,
        emailPdf: false,
        savePdfToServer: false,
      }
    };
    
    setDemoForms([...demoForms, newForm]);
    setEditingForm(newForm);
  };

  const addDemoTemplate = () => {
    const newTemplate: DemoPDFTemplate = {
      id: uuidv4(),
      name: 'Nouveau template PDF',
      description: 'Description du template',
      fields: [
        {
          id: uuidv4(),
          type: 'text',
          page: 1,
          variable: '${nom}',
          xRatio: 0.1,
          yRatio: 0.1,
          widthRatio: 0.25,
          heightRatio: 0.04,
          fontSize: 12,
          fontColor: '#000000',
          backgroundColor: '#ffffff',
          required: true,
        }
      ],
      pages: 1,
    };
    
    setDemoTemplates([...demoTemplates, newTemplate]);
    setEditingTemplate(newTemplate);
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      toast.error('Veuillez sélectionner un fichier PDF valide');
      return;
    }

    setUploadingPdf(true);
    
    try {
      // Convertir le PDF en base64
      const pdfDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Créer un nouveau template avec le PDF uploadé
      const newTemplate: DemoPDFTemplate = {
        id: uuidv4(),
        name: file.name.replace('.pdf', ''),
        description: `Template PDF uploadé - ${file.name}`,
        originalPdfUrl: pdfDataUrl,
        fields: [],
        pages: 1,
      };
      
      setDemoTemplates([...demoTemplates, newTemplate]);
      setEditingTemplate(newTemplate);
      toast.success('PDF uploadé avec succès ! Vous pouvez maintenant ajouter des champs.');
      
      // Reset input
      event.target.value = '';
    } catch (error) {
      console.error('Erreur upload PDF:', error);
      toast.error('Erreur lors de l\'upload du PDF');
    } finally {
      setUploadingPdf(false);
    }
  };

  const updateDemoForm = (id: string, updates: Partial<DemoFormTemplate>) => {
    setDemoForms(prev => prev.map(form => 
      form.id === id ? { ...form, ...updates } : form
    ));
    
    if (editingForm?.id === id) {
      setEditingForm(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const updateDemoTemplate = (id: string, updates: Partial<DemoPDFTemplate>) => {
    setDemoTemplates(prev => prev.map(template => 
      template.id === id ? { ...template, ...updates } : template
    ));
    
    if (editingTemplate?.id === id) {
      setEditingTemplate(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteDemoForm = (id: string) => {
    if (window.confirm('Supprimer ce formulaire de démo ?')) {
      setDemoForms(prev => prev.filter(form => form.id !== id));
      if (editingForm?.id === id) {
        setEditingForm(null);
      }
    }
  };

  const deleteDemoTemplate = (id: string) => {
    if (window.confirm('Supprimer ce template de démo ?')) {
      setDemoTemplates(prev => prev.filter(template => template.id !== id));
      if (editingTemplate?.id === id) {
        setEditingTemplate(null);
      }
    }
  };

  const addFieldToForm = (formId: string, fieldType: FormField['type']) => {
    const newField: FormField = {
      id: uuidv4(),
      type: fieldType,
      label: `Nouveau champ ${fieldType}`,
      required: false,
      ...(fieldType === 'radio' || fieldType === 'checkbox' ? { options: ['Option 1', 'Option 2'] } : {}),
    };

    updateDemoForm(formId, {
      fields: [...(demoForms.find(f => f.id === formId)?.fields || []), newField]
    });
  };

  const addFieldToTemplate = (templateId: string, fieldType: PDFField['type']) => {
    const newField: PDFField = {
      id: uuidv4(),
      type: fieldType,
      page: 1,
      variable: `\${nouveau_champ_${fieldType}}`,
      xRatio: 0.1,
      yRatio: 0.1,
      widthRatio: 0.2,
      heightRatio: 0.04,
      fontSize: 12,
      fontColor: '#000000',
      backgroundColor: '#ffffff',
      required: false,
    };

    updateDemoTemplate(templateId, {
      fields: [...(demoTemplates.find(t => t.id === templateId)?.fields || []), newField]
    });
  };

  const getSectionColorClasses = (section: string, isActive: boolean) => {
    const colorMap = {
      settings: isActive 
        ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 border-blue-300 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:shadow-md',
      forms: isActive 
        ? 'bg-gradient-to-br from-green-100 to-emerald-200 text-green-700 border-green-300 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-100 hover:text-green-600 hover:shadow-md',
      templates: isActive 
        ? 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 border-purple-300 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-purple-50 hover:to-purple-100 hover:text-purple-600 hover:shadow-md',
    };
    return colorMap[section] || colorMap.settings;
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec sauvegarde */}
      <Card className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border-pink-200 dark:border-pink-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">🎭</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-pink-900 dark:text-pink-300">
                  Gestion de la Démo
                </h2>
                <p className="text-sm text-pink-700 dark:text-pink-400">
                  Configurez l'expérience de démonstration pour les visiteurs
                </p>
              </div>
            </div>
            <Button
              onClick={saveDemoConfiguration}
              disabled={saving}
              className="flex items-center space-x-2 bg-pink-600 hover:bg-pink-700 text-white"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navigation des sections */}
      <div className="flex space-x-2 justify-center">
        <button
          onClick={() => setActiveSection('settings')}
          className={`py-2 px-3 rounded-lg font-medium text-xs transition-all active:scale-95 hover:scale-105 ${getSectionColorClasses('settings', activeSection === 'settings')}`}
        >
          <div className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span className="font-semibold">Paramètres</span>
          </div>
        </button>
        <button
          onClick={() => setActiveSection('forms')}
          className={`py-2 px-3 rounded-lg font-medium text-xs transition-all active:scale-95 hover:scale-105 ${getSectionColorClasses('forms', activeSection === 'forms')}`}
        >
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span className="font-semibold">Formulaires ({demoForms.length})</span>
          </div>
        </button>
        <button
          onClick={() => setActiveSection('templates')}
          className={`py-2 px-3 rounded-lg font-medium text-xs transition-all active:scale-95 hover:scale-105 ${getSectionColorClasses('templates', activeSection === 'templates')}`}
        >
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span className="font-semibold">Templates PDF ({demoTemplates.length})</span>
          </div>
        </button>
      </div>

      {/* Section Paramètres */}
      {activeSection === 'settings' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Paramètres généraux
                </h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Durée de la démo (minutes)"
                type="number"
                min="5"
                max="120"
                value={demoSettings.durationMinutes}
                onChange={(e) => setDemoSettings(prev => ({
                  ...prev,
                  durationMinutes: parseInt(e.target.value) || 30
                }))}
              />
              
              <Input
                label="Nombre max de formulaires"
                type="number"
                min="1"
                max="10"
                value={demoSettings.maxForms}
                onChange={(e) => setDemoSettings(prev => ({
                  ...prev,
                  maxForms: parseInt(e.target.value) || 3
                }))}
              />
              
              <Input
                label="Nombre max de templates"
                type="number"
                min="1"
                max="10"
                value={demoSettings.maxTemplates}
                onChange={(e) => setDemoSettings(prev => ({
                  ...prev,
                  maxTemplates: parseInt(e.target.value) || 3
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Message d'accueil
                </h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message de bienvenue
                </label>
                <textarea
                  value={demoSettings.welcomeMessage}
                  onChange={(e) => setDemoSettings(prev => ({
                    ...prev,
                    welcomeMessage: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fonctionnalités mises en avant
                </label>
                <div className="space-y-2">
                  {demoSettings.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...demoSettings.features];
                          newFeatures[index] = e.target.value;
                          setDemoSettings(prev => ({ ...prev, features: newFeatures }));
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newFeatures = demoSettings.features.filter((_, i) => i !== index);
                          setDemoSettings(prev => ({ ...prev, features: newFeatures }));
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDemoSettings(prev => ({
                      ...prev,
                      features: [...prev.features, 'Nouvelle fonctionnalité']
                    }))}
                    className="flex items-center space-x-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Ajouter une fonctionnalité</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section Formulaires */}
      {activeSection === 'forms' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Formulaires de démonstration
            </h3>
            <Button
              onClick={addDemoForm}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau formulaire</span>
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Liste des formulaires */}
            <div className="space-y-4">
              {demoForms.map((form) => (
                <Card key={form.id} className={`cursor-pointer transition-all ${
                  editingForm?.id === form.id ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {form.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {form.fields.length} champs
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingForm(form)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDemoForm(form.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Éditeur de formulaire */}
            {editingForm && (
              <Card>
                <CardHeader>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Édition : {editingForm.title}
                  </h4>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Titre"
                    value={editingForm.title}
                    onChange={(e) => updateDemoForm(editingForm.id, { title: e.target.value })}
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editingForm.description}
                      onChange={(e) => updateDemoForm(editingForm.id, { description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      rows={2}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Champs ({editingForm.fields.length})
                      </label>
                      <div className="flex space-x-1">
                        {['text', 'email', 'phone', 'radio', 'date', 'signature'].map(type => (
                          <Button
                            key={type}
                            variant="ghost"
                            size="sm"
                            onClick={() => addFieldToForm(editingForm.id, type as FormField['type'])}
                            className="text-xs"
                          >
                            +{type}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {editingForm.fields.map((field, index) => (
                        <div key={field.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="flex-1">
                            <Input
                              value={field.label}
                              onChange={(e) => {
                                const newFields = [...editingForm.fields];
                                newFields[index] = { ...field, label: e.target.value };
                                updateDemoForm(editingForm.id, { fields: newFields });
                              }}
                              className="text-sm"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newFields = editingForm.fields.filter((_, i) => i !== index);
                              updateDemoForm(editingForm.id, { fields: newFields });
                            }}
                            className="text-red-600 hover:text-red-700 ml-2"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Section Templates PDF */}
      {activeSection === 'templates' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Templates PDF de démonstration
            </h3>
            <div className="flex items-center space-x-2">
              <Button
                onClick={addDemoTemplate}
                variant="secondary"
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Template vide</span>
              </Button>
              <Button
                onClick={() => document.getElementById('demo-pdf-upload')?.click()}
                disabled={uploadingPdf}
                className="flex items-center space-x-2"
              >
                {uploadingPdf ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span>{uploadingPdf ? 'Upload...' : 'Upload PDF'}</span>
              </Button>
              <input
                id="demo-pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Liste des templates */}
            <div className="space-y-4">
              {demoTemplates.map((template) => (
                <Card key={template.id} className={`cursor-pointer transition-all ${
                  editingTemplate?.id === template.id ? 'ring-2 ring-purple-500' : 'hover:shadow-md'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {template.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {template.fields.length} champs • {template.pages} page(s)
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTemplate(template)}
                          className="text-purple-600 hover:text-purple-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDemoTemplate(template.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Éditeur de template */}
            {editingTemplate && (
              <Card>
                <CardHeader>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Édition : {editingTemplate.name}
                  </h4>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Nom"
                    value={editingTemplate.name}
                    onChange={(e) => updateDemoTemplate(editingTemplate.id, { name: e.target.value })}
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editingTemplate.description}
                      onChange={(e) => updateDemoTemplate(editingTemplate.id, { description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      rows={2}
                    />
                  </div>

                  <Input
                    label="Nombre de pages"
                    type="number"
                    min="1"
                    max="10"
                    value={editingTemplate.pages}
                    onChange={(e) => updateDemoTemplate(editingTemplate.id, { pages: parseInt(e.target.value) || 1 })}
                  />

                  {editingTemplate.originalPdfUrl && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900 dark:text-green-300">
                          PDF Template chargé
                        </span>
                      </div>
                      <p className="text-xs text-green-700 dark:text-green-400">
                        Taille: {Math.round(editingTemplate.originalPdfUrl.length / 1024)} KB
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateDemoTemplate(editingTemplate.id, { originalPdfUrl: '' })}
                        className="mt-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Supprimer le PDF
                      </Button>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Champs PDF ({editingTemplate.fields.length})
                      </label>
                      <div className="flex space-x-1">
                        {['text', 'date', 'number', 'signature', 'checkbox', 'image'].map(type => (
                          <Button
                            key={type}
                            variant="ghost"
                            size="sm"
                            onClick={() => addFieldToTemplate(editingTemplate.id, type as PDFField['type'])}
                            className="text-xs"
                          >
                            +{type}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {editingTemplate.fields.map((field, index) => (
                        <div key={field.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <Input
                              label="Variable"
                              value={field.variable}
                              onChange={(e) => {
                                const newFields = [...editingTemplate.fields];
                                newFields[index] = { ...field, variable: e.target.value };
                                updateDemoTemplate(editingTemplate.id, { fields: newFields });
                              }}
                              className="text-xs"
                              placeholder="${variable}"
                            />
                            <div className="flex items-end space-x-1">
                              <span className="text-xs text-gray-500">{field.type}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newFields = editingTemplate.fields.filter((_, i) => i !== index);
                                  updateDemoTemplate(editingTemplate.id, { fields: newFields });
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-1">
                            <Input
                              label="X"
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={field.xRatio}
                              onChange={(e) => {
                                const newFields = [...editingTemplate.fields];
                                newFields[index] = { ...field, xRatio: parseFloat(e.target.value) || 0 };
                                updateDemoTemplate(editingTemplate.id, { fields: newFields });
                              }}
                              className="text-xs"
                            />
                            <Input
                              label="Y"
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={field.yRatio}
                              onChange={(e) => {
                                const newFields = [...editingTemplate.fields];
                                newFields[index] = { ...field, yRatio: parseFloat(e.target.value) || 0 };
                                updateDemoTemplate(editingTemplate.id, { fields: newFields });
                              }}
                              className="text-xs"
                            />
                            <Input
                              label="W"
                              type="number"
                              step="0.01"
                              min="0.01"
                              max="1"
                              value={field.widthRatio}
                              onChange={(e) => {
                                const newFields = [...editingTemplate.fields];
                                newFields[index] = { ...field, widthRatio: parseFloat(e.target.value) || 0.1 };
                                updateDemoTemplate(editingTemplate.id, { fields: newFields });
                              }}
                              className="text-xs"
                            />
                            <Input
                              label="H"
                              type="number"
                              step="0.01"
                              min="0.01"
                              max="1"
                              value={field.heightRatio}
                              onChange={(e) => {
                                const newFields = [...editingTemplate.fields];
                                newFields[index] = { ...field, heightRatio: parseFloat(e.target.value) || 0.04 };
                                updateDemoTemplate(editingTemplate.id, { fields: newFields });
                              }}
                              className="text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Aperçu de la configuration */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Eye className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-300">
              Aperçu de la configuration
            </h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-indigo-600 mb-1">{demoSettings.durationMinutes} min</div>
              <div className="text-sm text-indigo-700 dark:text-indigo-400">Durée de démo</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 mb-1">{demoForms.length}</div>
              <div className="text-sm text-green-700 dark:text-green-400">Formulaires de démo</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600 mb-1">{demoTemplates.length}</div>
              <div className="text-sm text-purple-700 dark:text-purple-400">Templates PDF de démo</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};