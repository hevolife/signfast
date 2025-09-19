import React, { useState, useCallback, useMemo } from 'react';
import { FormField } from '../../types/form';
import { FieldPalette } from '../form/FieldPalette';
import { FormCanvas } from '../form/FormCanvas';
import { FormPreview } from '../form/FormPreview';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Eye, EyeOff, Save, Layers, Zap } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

interface OptimizedFormBuilderProps {
  initialFields?: FormField[];
  onSave: (fields: FormField[]) => void;
  saving?: boolean;
}

export const OptimizedFormBuilder: React.FC<OptimizedFormBuilderProps> = ({
  initialFields = [],
  onSave,
  saving = false,
}) => {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Détecter mobile
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mémoisation des champs pour optimiser les performances
  const memoizedFields = useMemo(() => fields, [fields]);

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
    toast.success(`Champ ${type} ajouté`);
  }, []);

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
    toast.success('Champ supprimé');
  }, [selectedField]);

  const moveField = useCallback((dragIndex: number, hoverIndex: number) => {
    setFields(prev => {
      const newFields = [...prev];
      const [draggedField] = newFields.splice(dragIndex, 1);
      newFields.splice(hoverIndex, 0, draggedField);
      return newFields;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (fields.length === 0) {
      toast.error('Ajoutez au moins un champ');
      return;
    }
    onSave(fields);
  }, [fields, onSave]);

  const handleFieldSelect = useCallback((fieldId: string | null) => {
    if (isMultiSelectMode && fieldId) {
      const newSelectedFields = new Set(selectedFields);
      if (newSelectedFields.has(fieldId)) {
        newSelectedFields.delete(fieldId);
      } else {
        newSelectedFields.add(fieldId);
      }
      setSelectedFields(newSelectedFields);
      if (newSelectedFields.size > 0) {
        setSelectedField(fieldId);
      } else {
        setSelectedField(null);
      }
    } else {
      setSelectedField(fieldId);
      setSelectedFields(new Set(fieldId ? [fieldId] : []));
    }
  }, [isMultiSelectMode, selectedFields]);

  const toggleMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(!isMultiSelectMode);
    if (!isMultiSelectMode && selectedField) {
      setSelectedFields(new Set([selectedField]));
    } else {
      setSelectedFields(new Set(selectedField ? [selectedField] : []));
    }
  }, [isMultiSelectMode, selectedField]);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header optimisé */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl shadow-2xl mb-8">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 shadow-lg">
              <Layers className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Constructeur de Formulaire
            </h1>
            <p className="text-white/90 mb-6">
              Interface drag & drop optimisée pour créer vos formulaires
            </p>
            
            <div className="flex items-center justify-center space-x-4">
              <Button
                onClick={toggleMultiSelectMode}
                variant={isMultiSelectMode ? "primary" : "ghost"}
                className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30"
              >
                {isMultiSelectMode ? `Sélection (${selectedFields.size})` : 'Multi-sélection'}
              </Button>
              
              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant="ghost"
                className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30"
              >
                {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showPreview ? 'Éditer' : 'Aperçu'}
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={saving || fields.length === 0}
                className="bg-white text-blue-600 hover:bg-gray-100 font-bold"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        </div>

        {/* Barre d'outils multi-sélection */}
        {isMultiSelectMode && selectedFields.size > 0 && !showPreview && (
          <Card className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{selectedFields.size}</span>
                  </div>
                  <span className="font-semibold text-indigo-900 dark:text-indigo-300">
                    {selectedFields.size} champ(s) sélectionné(s)
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      selectedFields.forEach(fieldId => {
                        const field = fields.find(f => f.id === fieldId);
                        if (field) {
                          updateField(fieldId, { placeholder: field.label });
                        }
                      });
                      toast.success('Placeholders mis à jour');
                    }}
                    className="bg-green-100 text-green-700 hover:bg-green-200"
                  >
                    📋 Copier libellés
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      selectedFields.forEach(fieldId => {
                        updateField(fieldId, { required: true });
                      });
                      toast.success('Champs marqués obligatoires');
                    }}
                    className="bg-orange-100 text-orange-700 hover:bg-orange-200"
                  >
                    ✅ Obligatoires
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {showPreview ? (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Aperçu du formulaire
              </h2>
            </CardHeader>
            <CardContent>
              <FormPreview fields={memoizedFields} />
            </CardContent>
          </Card>
        ) : (
          <div>
            <div className="mb-6">
              <FieldPalette onAddField={addField} />
            </div>
            
            <FormCanvas
              fields={memoizedFields}
              selectedField={selectedField}
              selectedFields={selectedFields}
              isMultiSelectMode={isMultiSelectMode}
              onSelectField={handleFieldSelect}
              onUpdateField={updateField}
              onRemoveField={removeField}
              onMoveField={moveField}
              onFieldDrop={addField}
            />
          </div>
        )}
      </div>
    </div>
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
    scan: 'Scanner de document',
  };
  
  return labels[type];
}