import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { 
  Plus, 
  Save, 
  Eye, 
  ArrowLeft,
  Type,
  Mail,
  Hash,
  Calendar,
  FileText,
  Phone,
  CheckSquare,
  Circle,
  Upload,
  PenTool,
  Trash2,
  GripVertical,
  Settings
} from 'lucide-react';
import { FormField } from '../../types/form';
import toast from 'react-hot-toast';

const fieldTypes = [
  { type: 'text', label: 'Texte', icon: Type },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'number', label: 'Nombre', icon: Hash },
  { type: 'phone', label: 'Téléphone', icon: Phone },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'textarea', label: 'Texte long', icon: FileText },
  { type: 'radio', label: 'Choix unique', icon: Circle },
  { type: 'checkbox', label: 'Cases à cocher', icon: CheckSquare },
  { type: 'file', label: 'Fichier', icon: Upload },
  { type: 'signature', label: 'Signature', icon: PenTool },
];

export const NewForm: React.FC = () => {
  const navigate = useNavigate();
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    allowMultiple: false,
    requireAuth: false,
    collectEmail: true,
    generatePdf: true,
    emailPdf: false,
    savePdfToServer: true,
  });

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: `Nouveau champ ${type}`,
      placeholder: '',
      required: false,
      options: type === 'radio' || type === 'checkbox' ? ['Option 1', 'Option 2'] : undefined,
    };
    setFields([...fields, newField]);
    setSelectedField(newField.id);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
    if (selectedField === id) {
      setSelectedField(null);
    }
  };

  const moveField = (id: string, direction: 'up' | 'down') => {
    const index = fields.findIndex(field => field.id === id);
    if (
      (direction === 'up' && index > 0) ||
      (direction === 'down' && index < fields.length - 1)
    ) {
      const newFields = [...fields];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      setFields(newFields);
    }
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast.error('Le titre du formulaire est requis');
      return;
    }

    if (fields.length === 0) {
      toast.error('Ajoutez au moins un champ au formulaire');
      return;
    }

    try {
      // Ici on sauvegarderait en base de données
      toast.success('Formulaire créé avec succès !');
      navigate('/forms');
    } catch (error) {
      toast.error('Erreur lors de la création du formulaire');
    }
  };

  const selectedFieldData = fields.find(field => field.id === selectedField);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/forms')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Nouveau Formulaire
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Créez votre formulaire avec signature électronique
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Aperçu</span>
            </Button>
            <Button onClick={handleSave} className="flex items-center space-x-2">
              <Save className="h-4 w-4" />
              <span>Sauvegarder</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Panneau des types de champs */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Types de champs
                </h3>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {fieldTypes.map((fieldType) => {
                    const Icon = fieldType.icon;
                    return (
                      <button
                        key={fieldType.type}
                        onClick={() => addField(fieldType.type as FormField['type'])}
                        className="w-full flex items-center space-x-3 p-3 text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-600 dark:hover:bg-blue-900/20 transition-all"
                      >
                        <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {fieldType.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Paramètres du formulaire */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Paramètres
                  </h3>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.generatePdf}
                      onChange={(e) => setSettings({...settings, generatePdf: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Générer un PDF
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.collectEmail}
                      onChange={(e) => setSettings({...settings, collectEmail: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Collecter l'email
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.emailPdf}
                      onChange={(e) => setSettings({...settings, emailPdf: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Envoyer PDF par email
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.requireAuth}
                      onChange={(e) => setSettings({...settings, requireAuth: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Connexion requise
                    </span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Éditeur de formulaire */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="space-y-4">
                  <Input
                    label="Titre du formulaire"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Contrat de prestation de services"
                    className="text-lg font-semibold"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Description du formulaire..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {fields.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                      Aucun champ ajouté
                    </p>
                    <p className="text-sm text-gray-400">
                      Sélectionnez un type de champ à gauche pour commencer
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedField === field.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedField(field.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <GripVertical className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {field.label}
                              </div>
                              <div className="text-sm text-gray-500">
                                {fieldTypes.find(t => t.type === field.type)?.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveField(field.id, 'up');
                              }}
                              disabled={index === 0}
                              className="p-1"
                            >
                              ↑
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveField(field.id, 'down');
                              }}
                              disabled={index === fields.length - 1}
                              className="p-1"
                            >
                              ↓
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeField(field.id);
                              }}
                              className="p-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Panneau de propriétés */}
          <div className="lg:col-span-1">
            {selectedFieldData ? (
              <Card>
                <CardHeader>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Propriétés du champ
                  </h3>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <Input
                      label="Libellé"
                      value={selectedFieldData.label}
                      onChange={(e) => updateField(selectedFieldData.id, { label: e.target.value })}
                    />
                    
                    <Input
                      label="Placeholder"
                      value={selectedFieldData.placeholder || ''}
                      onChange={(e) => updateField(selectedFieldData.id, { placeholder: e.target.value })}
                    />

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedFieldData.required}
                        onChange={(e) => updateField(selectedFieldData.id, { required: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Champ obligatoire
                      </span>
                    </label>

                    {(selectedFieldData.type === 'radio' || selectedFieldData.type === 'checkbox') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Options
                        </label>
                        <div className="space-y-2">
                          {selectedFieldData.options?.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...(selectedFieldData.options || [])];
                                  newOptions[index] = e.target.value;
                                  updateField(selectedFieldData.id, { options: newOptions });
                                }}
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newOptions = selectedFieldData.options?.filter((_, i) => i !== index);
                                  updateField(selectedFieldData.id, { options: newOptions });
                                }}
                                className="p-1 text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newOptions = [...(selectedFieldData.options || []), `Option ${(selectedFieldData.options?.length || 0) + 1}`];
                              updateField(selectedFieldData.id, { options: newOptions });
                            }}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter une option
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Sélectionnez un champ pour modifier ses propriétés
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};