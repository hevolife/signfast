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
import { Eye, EyeOff, Save, Menu, X, Settings } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

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
          <div className="mb-4 lg:mb-8">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center">
              Constructeur de formulaire
            </h1>
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
                    className={`lg:hidden ${showMobilePalette ? 'bg-blue-100 text-blue-600' : ''}`}
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                  {selectedField && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowMobileProperties(!showMobileProperties);
                        setShowMobilePalette(false);
                      }}
                      className={`lg:hidden ${showMobileProperties ? 'bg-blue-100 text-blue-600' : ''}`}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
              
              <div className="flex items-center space-x-2 lg:space-x-4">
                {/* Mode sélection multiple */}
                <Button
                  onClick={toggleMultiSelectMode}
                  variant={isMultiSelectMode ? "primary" : "ghost"}
                  size="sm"
                  className="flex items-center space-x-1 lg:space-x-2"
                >
                  <span className="text-xs lg:text-sm">
                    {isMultiSelectMode ? `Multi (${selectedFields.size})` : 'Multi'}
                  </span>
                </Button>
                <Button
                  onClick={() => setShowPreview(!showPreview)}
                  variant="ghost"
                  className="flex items-center space-x-1 lg:space-x-2"
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="hidden sm:inline">{showPreview ? 'Éditer' : 'Aperçu'}</span>
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || fields.length === 0}
                  className="flex items-center space-x-1 lg:space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Barre d'outils multi-sélection */}
          {isMultiSelectMode && selectedFields.size > 0 && !showPreview && (
            <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2 lg:gap-4">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                    {selectedFields.size} champ(s) sélectionné(s)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={copyLabelsToPlaceholders}
                      className="text-xs bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
                    >
                      Copier libellés → placeholders
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => bulkSetRequired(true)}
                      className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300"
                    >
                      Marquer obligatoires
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => bulkSetRequired(false)}
                      className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                    >
                      Marquer optionnels
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {showPreview ? (
            // Mode aperçu - pleine largeur sur mobile
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Aperçu du formulaire
                </h2>
              </CardHeader>
              <CardContent>
                <FormPreview fields={fields} />
              </CardContent>
            </Card>
          ) : (
            // Mode édition - layout adaptatif
            <div className="relative">
              {/* Layout desktop */}
              <div className="hidden lg:grid lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1">
                  <FieldPalette onAddField={addField} />
                </div>
                
                <div className="lg:col-span-3">
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
                    <div className="absolute bottom-16 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-xl max-h-[60vh] overflow-y-auto">
                      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Ajouter un champ
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowMobilePalette(false)}
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
                    <div className="absolute bottom-16 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-xl max-h-[60vh] overflow-y-auto">
                      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Propriétés du champ
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowMobileProperties(false)}
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