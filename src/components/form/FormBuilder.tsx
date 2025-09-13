import React, { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { FormField } from '../../types/form';
import { FieldPalette } from './FieldPalette';
import { FormCanvas } from './FormCanvas';
import { FormPreview } from './FormPreview';
import { FieldPropertiesEditor } from './FieldPropertiesEditor';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Eye, EyeOff, Save, Menu, X, Settings, Layers, Palette, CheckSquare } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

interface FormBuilderProps {
  initialFields?: FormField[];
  onSave: (fields: FormField[]) => void;
  saving?: boolean;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({
  initialFields = [],
  onSave,
  saving = false,
}) => {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [showMobileProperties, setShowMobileProperties] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Détecter si on est sur mobile
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Backend DnD adaptatif
  const dndBackend = isMobile ? TouchBackend : HTML5Backend;
  const dndOptions = isMobile ? { enableMouseEvents: true } : {};

  const addField = useCallback((type: FormField['type']) => {
    const newField: FormField = {
      id: uuidv4(),
      type,
      label: getDefaultLabel(type),
      required: false,
      ...(type === 'radio' || type === 'checkbox' ? { options: ['Option 1', 'Option 2'] } : {}),
    };
    
    setFields(prev => [...prev, newField]);
    setSelectedField(newField.id);
    
    // Sur mobile, fermer la palette et ouvrir les propriétés
    if (isMobile) {
      setShowMobilePalette(false);
      setShowMobileProperties(true);
    }
  }, []);

  const handleFieldDrop = useCallback((fieldType: FormField['type']) => {
    addField(fieldType);
  }, [addField]);
  const updateField = useCallback((id: string, updates: Partial<FormField>) => {
    setFields(prev => prev.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  }, []);

  const removeField = useCallback((id: string) => {
    setFields(prev => prev.filter(field => field.id !== id));
    if (selectedField === id) {
      setSelectedField(null);
    }
  }, [selectedField]);

  const moveField = useCallback((dragIndex: number, hoverIndex: number) => {
    setFields(prev => {
      const newFields = [...prev];
      const [draggedField] = newFields.splice(dragIndex, 1);
      newFields.splice(hoverIndex, 0, draggedField);
      return newFields;
    });
  }, []);

  const handleSave = () => {
    onSave(fields);
  };

  const selectedFieldData = selectedField ? fields.find(f => f.id === selectedField) : null;

  // Fermer les panneaux mobiles quand on sélectionne un champ
  const handleFieldSelect = (fieldId: string | null) => {
    if (isMultiSelectMode && fieldId) {
      const newSelectedFields = new Set(selectedFields);
      if (newSelectedFields.has(fieldId)) {
        newSelectedFields.delete(fieldId);
      } else {
        newSelectedFields.add(fieldId);
      }
      setSelectedFields(newSelectedFields);
      // En mode multi-sélection, on garde le dernier champ sélectionné comme champ principal
      if (newSelectedFields.size > 0) {
        setSelectedField(fieldId);
      } else {
        setSelectedField(null);
      }
    } else {
      setSelectedField(fieldId);
      setSelectedFields(new Set(fieldId ? [fieldId] : []));
    }
    
    if (isMobile && fieldId) {
      setShowMobileProperties(true);
      setShowMobilePalette(false);
    }
  };

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    if (!isMultiSelectMode) {
      // Entrer en mode multi-sélection : garder la sélection actuelle
      if (selectedField) {
        setSelectedFields(new Set([selectedField]));
      }
    } else {
      // Sortir du mode multi-sélection : garder seulement le dernier sélectionné
      setSelectedFields(new Set(selectedField ? [selectedField] : []));
    }
  };

  const updateMultipleFields = (updates: Partial<FormField>) => {
    setFields(prev => prev.map(field => 
      selectedFields.has(field.id) ? { ...field, ...updates } : field
    ));
  };

  const copyLabelsToPlaceholders = () => {
    const fieldsToUpdate = fields.filter(field => selectedFields.has(field.id));
    fieldsToUpdate.forEach(field => {
      updateField(field.id, { placeholder: field.label });
    });
    toast.success(`Libellés copiés vers les placeholders pour ${fieldsToUpdate.length} champ(s)`);
  };

  const bulkSetRequired = (required: boolean) => {
    updateMultipleFields({ required });
    const count = selectedFields.size;
    toast.success(`${count} champ(s) ${required ? 'marqués comme obligatoires' : 'marqués comme optionnels'}`);
  };

  return (
    <DndProvider backend={dndBackend} options={dndOptions}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
          {/* En-tête responsive */}
          <div className="mb-6 lg:mb-8">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                  Constructeur de Formulaire
                </h1>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Créez des formulaires interactifs avec glisser-déposer et aperçu en temps réel
              </p>
            </div>
            
            {/* Statistiques du formulaire */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">{fields.length}</div>
                  <div className="text-xs text-blue-600">Champs totaux</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">{fields.filter(f => f.required).length}</div>
                  <div className="text-xs text-green-600">Obligatoires</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">{fields.filter(f => f.type === 'radio' || f.type === 'checkbox').length}</div>
                  <div className="text-xs text-purple-600">Choix multiples</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600 mb-1">{fields.filter(f => f.type === 'signature' || f.type === 'file').length}</div>
                  <div className="text-xs text-orange-600">Fichiers/Signatures</div>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex items-center justify-between space-x-2 lg:space-x-4">
              {/* Boutons mobiles */}
              {isMobile && !showPreview && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowMobilePalette(!showMobilePalette);
                      setShowMobileProperties(false);
                    }}
                    className={`lg:hidden flex items-center space-x-2 ${showMobilePalette ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-white dark:bg-gray-800 shadow-md'}`}
                  >
                    <Menu className="h-4 w-4" />
                    <span className="text-xs">Champs</span>
                  </Button>
                  {selectedField && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowMobileProperties(!showMobileProperties);
                        setShowMobilePalette(false);
                      }}
                      className={`lg:hidden flex items-center space-x-2 ${showMobileProperties ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' : 'bg-white dark:bg-gray-800 shadow-md'}`}
                    >
                      <Settings className="h-4 w-4" />
                      <span className="text-xs">Propriétés</span>
                    </Button>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-center space-x-3 lg:space-x-4 flex-1">
                {/* Mode sélection multiple */}
                <Button
                  onClick={toggleMultiSelectMode}
                  variant="ghost"
                  size="sm"
                  className={`flex items-center space-x-2 transition-all ${
                    isMultiSelectMode 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:from-blue-600 hover:to-purple-700' 
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <CheckSquare className="h-4 w-4" />
                  <span className="text-xs lg:text-sm">
                    {isMultiSelectMode ? `Sélection (${selectedFields.size})` : 'Sélection'}
                  </span>
                </Button>
                
                <Button
                  onClick={() => setShowPreview(!showPreview)}
                  variant="ghost"
                  size="sm"
                  className={`flex items-center space-x-2 transition-all ${
                    showPreview 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:from-green-600 hover:to-emerald-700' 
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="hidden sm:inline">{showPreview ? 'Éditer' : 'Aperçu'}</span>
                </Button>
                
                <Button
                  onClick={handleSave}
                  disabled={saving || fields.length === 0}
                  size="sm"
                  className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Barre d'outils multi-sélection */}
          {isMultiSelectMode && selectedFields.size > 0 && !showPreview && (
            <Card className="mb-6 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border-blue-200 dark:border-blue-800 shadow-lg">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <CheckSquare className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-blue-900 dark:text-blue-300">
                        Mode Multi-Sélection
                      </span>
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        {selectedFields.size} champ(s) sélectionné(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={copyLabelsToPlaceholders}
                      className="text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md transition-all"
                    >
                      <Palette className="h-3 w-3 mr-1" />
                      Copier libellés → placeholders
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => bulkSetRequired(true)}
                      className="text-xs bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 shadow-md transition-all"
                    >
                      <CheckSquare className="h-3 w-3 mr-1" />
                      Marquer obligatoires
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => bulkSetRequired(false)}
                      className="text-xs bg-gradient-to-r from-gray-400 to-gray-600 text-white hover:from-gray-500 hover:to-gray-700 shadow-md transition-all"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Marquer optionnels
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {showPreview ? (
            // Mode aperçu - pleine largeur sur mobile
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-green-900 dark:text-green-300">
                      Aperçu du Formulaire
                    </h2>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Prévisualisation en temps réel de votre formulaire
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <FormPreview fields={fields} />
              </CardContent>
            </Card>
          ) : (
            // Mode édition - layout adaptatif
            <div className="relative">
              {/* Palette des éléments - au-dessus du canvas */}
              <div className="mb-6 relative">
                <FieldPalette onAddField={addField} />
                {fields.length === 0 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-100/90 via-purple-100/90 to-pink-100/90 dark:from-blue-900/90 dark:via-purple-900/90 dark:to-pink-900/90 rounded-lg flex items-center justify-center border-2 border-blue-300 dark:border-blue-700 border-dashed">
                    <div className="text-center p-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Palette className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-2">
                        Commencez ici !
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        Cliquez sur un type de champ ci-dessus pour commencer à construire votre formulaire
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Layout desktop */}
              <div className="hidden lg:block">
                <div>
                  <FormCanvas
                    fields={fields}
                    selectedField={selectedField}
                    selectedFields={selectedFields}
                    isMultiSelectMode={isMultiSelectMode}
                    onSelectField={handleFieldSelect}
                    onUpdateField={updateField}
                    onRemoveField={removeField}
                    onMoveField={moveField}
                    onFieldDrop={handleFieldDrop}
                  />
                </div>
              </div>

              {/* Layout mobile */}
              <div className="lg:hidden">
                {/* Canvas principal mobile */}
                <FormCanvas
                  fields={fields}
                  selectedField={selectedField}
                  selectedFields={selectedFields}
                  isMultiSelectMode={isMultiSelectMode}
                  onSelectField={handleFieldSelect}
                  onUpdateField={updateField}
                  onRemoveField={removeField}
                  onMoveField={moveField}
                  onFieldDrop={handleFieldDrop}
                />

                {/* Palette mobile - overlay */}
                {showMobilePalette && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
                    <div className="absolute bottom-16 left-0 right-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 rounded-t-xl max-h-[60vh] overflow-y-auto shadow-2xl border-t-4 border-blue-500">
                      <div className="flex justify-between items-center p-4 border-b border-blue-200 dark:border-blue-700">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <Palette className="h-4 w-4 text-white" />
                          </div>
                          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300">
                            Ajouter un Champ
                          </h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowMobilePalette(false)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-800"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-4">
                        <FieldPalette onAddField={addField} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Propriétés mobile - overlay */}
                {showMobileProperties && selectedFieldData && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
                    <div className="absolute bottom-16 left-0 right-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 rounded-t-xl max-h-[60vh] overflow-y-auto shadow-2xl border-t-4 border-purple-500">
                      <div className="flex justify-between items-center p-4 border-b border-purple-200 dark:border-purple-700">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                            <Settings className="h-4 w-4 text-white" />
                          </div>
                          <h3 className="text-lg font-bold text-purple-900 dark:text-purple-300">
                            Propriétés du Champ
                          </h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowMobileProperties(false)}
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:hover:bg-purple-800"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-4">
                        <FieldPropertiesEditor
                          field={selectedFieldData}
                          onUpdate={(updates) => updateField(selectedFieldData.id, updates)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

    </DndProvider>
  );
};

function getDefaultLabel(type: FormField['type']): string {
  const labels = {
    text: 'Champ de texte',
    email: 'Adresse email',
    phone: 'Numéro de téléphone',
    number: 'Nombre',
    radio: 'Choix unique',
    checkbox: 'Cases à cocher',
    date: 'Date',
    birthdate: 'Date de naissance',
    file: 'Fichier',
    textarea: 'Zone de texte',
    signature: 'Signature',
  };
  
  return labels[type];
}