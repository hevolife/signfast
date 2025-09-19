import React from 'react';
import { FormField } from '../../types/form';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Plus, Trash2, ChevronDown, ChevronRight, ChevronUp, ChevronDown as MoveDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface FieldPropertiesEditorProps {
  field: FormField;
  selectedFields?: Set<string>;
  isMultiSelectMode?: boolean;
  onUpdate: (updates: Partial<FormField>) => void;
}

export const FieldPropertiesEditor: React.FC<FieldPropertiesEditorProps> = ({
  field,
  selectedFields = new Set(),
  isMultiSelectMode = false,
  onUpdate,
}) => {
  const [expandedOptions, setExpandedOptions] = React.useState<Set<string>>(new Set());

  const handleAddOption = () => {
    const currentOptions = field.options || [];
    onUpdate({
      options: [...currentOptions, `Option ${currentOptions.length + 1}`]
    });
  };

  const handleUpdateOption = (index: number, value: string) => {
    const newOptions = [...(field.options || [])];
    const oldValue = newOptions[index];
    newOptions[index] = value;
    
    // Mettre à jour les champs conditionnels si la valeur de l'option change
    if (field.conditionalFields && oldValue !== value) {
      const newConditionalFields = { ...field.conditionalFields };
      if (newConditionalFields[oldValue]) {
        newConditionalFields[value] = newConditionalFields[oldValue];
        delete newConditionalFields[oldValue];
      }
      onUpdate({ options: newOptions, conditionalFields: newConditionalFields });
    } else {
      onUpdate({ options: newOptions });
    }
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = field.options?.filter((_, i) => i !== index) || [];
    const removedOption = field.options?.[index];
    
    // Supprimer aussi les champs conditionnels associés
    const newConditionalFields = { ...field.conditionalFields };
    if (removedOption && newConditionalFields[removedOption]) {
      delete newConditionalFields[removedOption];
    }
    
    onUpdate({ 
      options: newOptions,
      conditionalFields: Object.keys(newConditionalFields).length > 0 ? newConditionalFields : undefined
    });
  };

  const toggleOptionExpansion = (option: string) => {
    const newExpanded = new Set(expandedOptions);
    if (newExpanded.has(option)) {
      newExpanded.delete(option);
    } else {
      newExpanded.add(option);
    }
    setExpandedOptions(newExpanded);
  };

  const addConditionalField = (optionValue: string, fieldType: FormField['type']) => {
    const newField: FormField = {
      id: uuidv4(),
      type: fieldType,
      label: `Champ conditionnel ${fieldType}`,
      required: false,
      ...(fieldType === 'radio' || fieldType === 'checkbox' ? { options: ['Option 1', 'Option 2'] } : {}),
    };

    const currentConditionalFields = field.conditionalFields || {};
    const currentFields = currentConditionalFields[optionValue] || [];

    onUpdate({
      conditionalFields: {
        ...currentConditionalFields,
        [optionValue]: [...currentFields, newField]
      }
    });
  };

  const updateConditionalField = (optionValue: string, fieldIndex: number, updates: Partial<FormField>) => {
    const currentConditionalFields = field.conditionalFields || {};
    const currentFields = [...(currentConditionalFields[optionValue] || [])];
    currentFields[fieldIndex] = { ...currentFields[fieldIndex], ...updates };

    onUpdate({
      conditionalFields: {
        ...currentConditionalFields,
        [optionValue]: currentFields
      }
    });
  };

  const removeConditionalField = (optionValue: string, fieldIndex: number) => {
    const currentConditionalFields = field.conditionalFields || {};
    const currentFields = currentConditionalFields[optionValue] || [];
    const newFields = currentFields.filter((_, i) => i !== fieldIndex);

    if (newFields.length === 0) {
      const newConditionalFields = { ...currentConditionalFields };
      delete newConditionalFields[optionValue];
      onUpdate({
        conditionalFields: Object.keys(newConditionalFields).length > 0 ? newConditionalFields : undefined
      });
    } else {
      onUpdate({
        conditionalFields: {
          ...currentConditionalFields,
          [optionValue]: newFields
        }
      });
    }
  };

  const moveConditionalField = (optionValue: string, fieldIndex: number, direction: 'up' | 'down') => {
    const currentConditionalFields = field.conditionalFields || {};
    const currentFields = [...(currentConditionalFields[optionValue] || [])];
    
    const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    
    // Vérifier que le déplacement est possible
    if (newIndex < 0 || newIndex >= currentFields.length) {
      return;
    }
    
    // Échanger les éléments
    [currentFields[fieldIndex], currentFields[newIndex]] = [currentFields[newIndex], currentFields[fieldIndex]];
    
    onUpdate({
      conditionalFields: {
        ...currentConditionalFields,
        [optionValue]: currentFields
      }
    });
  };

  const showOptions = field.type === 'radio' || field.type === 'checkbox';
  const fieldTypes = [
    { type: 'text' as const, label: 'Texte' },
    { type: 'email' as const, label: 'Email' },
    { type: 'phone' as const, label: 'Téléphone' },
    { type: 'number' as const, label: 'Nombre' },
    { type: 'date' as const, label: 'Date' },
    { type: 'birthdate' as const, label: 'Date de naissance' },
    { type: 'textarea' as const, label: 'Zone de texte' },
    { type: 'file' as const, label: 'Fichier' },
    { type: 'signature' as const, label: 'Signature' },
  ];

  return (
    <div className="space-y-4">
      {/* Actions multi-sélection */}
      {isMultiSelectMode && selectedFields.size > 1 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">
            Actions pour {selectedFields.size} champs sélectionnés
          </h4>
          <div className="space-y-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                // Cette fonction sera appelée depuis le parent
                onUpdate({ placeholder: field.label });
              }}
              className="w-full text-xs bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
            >
              📋 Copier le libellé vers le placeholder
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => onUpdate({ required: true })}
                className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300"
              >
                ✅ Obligatoire
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => onUpdate({ required: false })}
                className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              >
                ⭕ Optionnel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div>
        <Input
          label="Libellé du champ"
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Entrez le libellé"
        />
      </div>

      <div>
        <Input
          label="Texte d'aide (placeholder)"
          value={field.placeholder || ''}
          onChange={(e) => onUpdate({ placeholder: e.target.value })}
          placeholder="Texte d'aide pour l'utilisateur"
        />
        <div className="mt-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onUpdate({ placeholder: field.label })}
            className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            📋 Copier depuis le libellé
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="required"
          checked={field.required}
          onChange={(e) => onUpdate({ required: e.target.checked })}
          className="text-blue-600"
        />
        <label htmlFor="required" className="text-sm text-gray-700 dark:text-gray-300">
          Champ obligatoire
        </label>
      </div>

      {showOptions && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Options et champs conditionnels
          </label>
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleOptionExpansion(option)}
                    className="p-1"
                  >
                    {expandedOptions.has(option) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <Input
                    value={option}
                    onChange={(e) => handleUpdateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveOption(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {expandedOptions.has(option) && (
                  <div className="ml-6 space-y-3 border-l-2 border-blue-200 pl-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Champs à afficher si "{option}" est sélectionné :
                    </div>
                    
                    {field.conditionalFields?.[option]?.map((conditionalField, fieldIndex) => (
                      <div key={conditionalField.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {conditionalField.type} - {conditionalField.label}
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded dark:bg-blue-900 dark:text-blue-300">
                              #{fieldIndex + 1}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveConditionalField(option, fieldIndex, 'up')}
                              disabled={fieldIndex === 0}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1"
                              title="Déplacer vers le haut"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveConditionalField(option, fieldIndex, 'down')}
                              disabled={fieldIndex === (field.conditionalFields?.[option]?.length || 1) - 1}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1"
                              title="Déplacer vers le bas"
                            >
                              <MoveDown className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeConditionalField(option, fieldIndex)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1"
                              title="Supprimer le champ"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Input
                            label="Libellé"
                            value={conditionalField.label}
                            onChange={(e) => updateConditionalField(option, fieldIndex, { label: e.target.value })}
                            className="text-sm"
                          />
                          {conditionalField.type === 'text' && (
                            <div>
                              <Input
                                label="Masque de saisie"
                                value={conditionalField.validation?.mask || ''}
                                onChange={(e) => updateConditionalField(option, fieldIndex, {
                                  validation: {
                                    ...conditionalField.validation,
                                    mask: e.target.value || undefined
                                  }
                                })}
                                placeholder="Ex: 99.99.99.99.99"
                                className="text-sm"
                              />
                              <div className="mt-1 text-xs text-gray-400 space-y-1">
                                <div><code>9</code> = chiffre • <code>A</code> = majuscule • <code>a</code> = minuscule</div>
                                <div>Ex: <code>99.99.99.99.99</code> pour sécurité sociale</div>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={conditionalField.required}
                              onChange={(e) => updateConditionalField(option, fieldIndex, { required: e.target.checked })}
                              className="text-blue-600"
                            />
                            <label className="text-sm text-gray-700 dark:text-gray-300">
                              Obligatoire
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-wrap gap-2">
                      {fieldTypes.map(({ type, label }) => (
                        <Button
                          key={type}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => addConditionalField(option, type)}
                          className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300"
                        >
                          + {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddOption}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter une option</span>
            </Button>
          </div>
        </div>
      )}

      {field.type === 'number' && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Valeur minimale"
            type="number"
            value={field.validation?.min || ''}
            onChange={(e) => onUpdate({
              validation: {
                ...field.validation,
                min: e.target.value ? parseInt(e.target.value) : undefined
              }
            })}
          />
          <Input
            label="Valeur maximale"
            type="number"
            value={field.validation?.max || ''}
            onChange={(e) => onUpdate({
              validation: {
                ...field.validation,
                max: e.target.value ? parseInt(e.target.value) : undefined
              }
            })}
          />
        </div>
      )}

      {(field.type === 'text' || field.type === 'textarea') && (
        <div>
          <Input
            label="Expression régulière (validation)"
            value={field.validation?.pattern || ''}
            onChange={(e) => onUpdate({
              validation: {
                ...field.validation,
                pattern: e.target.value || undefined
              }
            })}
            placeholder="Ex: ^[A-Za-z]+$"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optionnel : pattern de validation pour le champ
          </p>
        </div>
      )}

      {field.type === 'text' && (
        <div>
          <Input
            label="Masque de saisie"
            value={field.validation?.mask || ''}
            onChange={(e) => onUpdate({
              validation: {
                ...field.validation,
                mask: e.target.value || undefined
              }
            })}
            placeholder="Ex: 99.99.99.99.99 ou AA-999-AA"
          />
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-500">
              Optionnel : masque pour formater la saisie automatiquement
            </p>
            <div className="text-xs text-gray-400 space-y-1">
              <div><code>9</code> = chiffre (0-9)</div>
              <div><code>A</code> = lettre majuscule (A-Z)</div>
              <div><code>a</code> = lettre minuscule (a-z)</div>
              <div><code>*</code> = caractère alphanumérique</div>
              <div>Autres caractères = littéraux (-, ., /, etc.)</div>
            </div>
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">Exemples :</p>
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1 mt-1">
                <div><code>99.99.99.99.99</code> → Numéro de sécurité sociale</div>
                <div><code>99/99/9999</code> → Date (JJ/MM/AAAA)</div>
                <div><code>AA-999-AA</code> → Plaque d'immatriculation</div>
                <div><code>99 99 99 99 99</code> → Numéro de téléphone</div>
                <div><code>AAAAA-99999</code> → Code postal + numéro</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {field.type === 'phone' && (
        <div>
          <Input
            label="Format du téléphone (validation)"
            value={field.validation?.pattern || ''}
            onChange={(e) => onUpdate({
              validation: {
                ...field.validation,
                pattern: e.target.value || undefined
              }
            })}
            placeholder="Ex: ^[0-9]{10}$ pour 10 chiffres"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optionnel : pattern de validation pour le numéro de téléphone
          </p>
        </div>
      )}

      {field.type === 'birthdate' && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Âge minimum"
            type="number"
            value={field.validation?.min || ''}
            onChange={(e) => onUpdate({
              validation: {
                ...field.validation,
                min: e.target.value ? parseInt(e.target.value) : undefined
              }
            })}
            placeholder="Ex: 18"
          />
          <Input
            label="Âge maximum"
            type="number"
            value={field.validation?.max || ''}
            onChange={(e) => onUpdate({
              validation: {
                ...field.validation,
                max: e.target.value ? parseInt(e.target.value) : undefined
              }
            })}
            placeholder="Ex: 65"
          />
        </div>
      )}

      {field.type === 'file' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Types de fichiers acceptés
            </label>
            <div className="space-y-2">
              {[
                { value: 'image/*', label: 'Toutes les images (PNG, JPG, GIF, etc.)' },
                { value: 'image/png', label: 'PNG uniquement' },
                { value: 'image/jpeg', label: 'JPEG/JPG uniquement' },
                { value: 'image/gif', label: 'GIF uniquement' },
                { value: 'image/webp', label: 'WebP uniquement' },
                { value: 'application/pdf', label: 'PDF uniquement' },
                { value: '.doc,.docx', label: 'Documents Word' },
                { value: '.xls,.xlsx', label: 'Fichiers Excel' },
                { value: '.txt', label: 'Fichiers texte' },
                { value: '.zip,.rar', label: 'Archives (ZIP, RAR)' },
              ].map((fileType) => (
                <label key={fileType.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={(field.validation?.acceptedFileTypes || []).includes(fileType.value)}
                    onChange={(e) => {
                      const currentTypes = field.validation?.acceptedFileTypes || [];
                      const newTypes = e.target.checked
                        ? [...currentTypes, fileType.value]
                        : currentTypes.filter(type => type !== fileType.value);
                      
                      onUpdate({
                        validation: {
                          ...field.validation,
                          acceptedFileTypes: newTypes.length > 0 ? newTypes : undefined
                        }
                      });
                    }}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {fileType.label}
                  </span>
                </label>
              ))}
            </div>
            
            {/* Option personnalisée */}
            <div className="mt-3">
              <Input
                label="Types personnalisés (séparés par des virgules)"
                value={(field.validation?.acceptedFileTypes || []).filter(type => 
                  ![
                    'image/*', 'image/png', 'image/jpeg', 'image/gif', 'image/webp',
                    'application/pdf', '.doc,.docx', '.xls,.xlsx', '.txt', '.zip,.rar'
                  ].includes(type)
                ).join(', ')}
                onChange={(e) => {
                  const customTypes = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                  const predefinedTypes = (field.validation?.acceptedFileTypes || []).filter(type => 
                    [
                      'image/*', 'image/png', 'image/jpeg', 'image/gif', 'image/webp',
                      'application/pdf', '.doc,.docx', '.xls,.xlsx', '.txt', '.zip,.rar'
                    ].includes(type)
                  );
                  
                  const allTypes = [...predefinedTypes, ...customTypes];
                  
                  onUpdate({
                    validation: {
                      ...field.validation,
                      acceptedFileTypes: allTypes.length > 0 ? allTypes : undefined
                    }
                  });
                }}
                placeholder="Ex: .svg, .ai, application/json"
                className="text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ajoutez des types MIME ou extensions personnalisés
              </p>
            </div>
          </div>
          
          <Input
            label="Taille maximale (MB)"
            type="number"
            min="1"
            max="50"
            step="1"
            value={field.validation?.maxFileSize || ''}
            onChange={(e) => onUpdate({
              validation: {
                ...field.validation,
                maxFileSize: e.target.value ? parseInt(e.target.value) : undefined
              }
            })}
            placeholder="Ex: 5 pour 5MB maximum"
          />
          
          {/* Aperçu de la configuration */}
          {(field.validation?.acceptedFileTypes?.length || 0) > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                Configuration actuelle
              </h4>
              <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                <div>
                  <strong>Types acceptés :</strong> {field.validation?.acceptedFileTypes?.join(', ')}
                </div>
                {field.validation?.maxFileSize && (
                  <div>
                    <strong>Taille max :</strong> {field.validation.maxFileSize} MB
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {field.type === 'scan' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Paramètres de scan
            </label>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Format de sortie
                </label>
                <select
                  value={field.validation?.scanSettings?.outputFormat || 'jpeg'}
                  onChange={(e) => onUpdate({
                    validation: {
                      ...field.validation,
                      scanSettings: {
                        ...field.validation?.scanSettings,
                        outputFormat: e.target.value as 'jpeg' | 'png'
                      }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                >
                  <option value="jpeg">JPEG (plus petit, sans transparence)</option>
                  <option value="png">PNG (plus gros, avec transparence)</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Largeur max (px)"
                  type="number"
                  min="400"
                  max="4000"
                  step="100"
                  value={field.validation?.scanSettings?.maxWidth || 1600}
                  onChange={(e) => onUpdate({
                    validation: {
                      ...field.validation,
                      scanSettings: {
                        ...field.validation?.scanSettings,
                        maxWidth: parseInt(e.target.value) || 1600
                      }
                    }
                  })}
                />
                <Input
                  label="Hauteur max (px)"
                  type="number"
                  min="400"
                  max="4000"
                  step="100"
                  value={field.validation?.scanSettings?.maxHeight || 1200}
                  onChange={(e) => onUpdate({
                    validation: {
                      ...field.validation,
                      scanSettings: {
                        ...field.validation?.scanSettings,
                        maxHeight: parseInt(e.target.value) || 1200
                      }
                    }
                  })}
                />
              </div>
              
              <Input
                label="Qualité (0.1 - 1.0)"
                type="number"
                min="0.1"
                max="1.0"
                step="0.1"
                value={field.validation?.scanSettings?.quality || 0.9}
                onChange={(e) => onUpdate({
                  validation: {
                    ...field.validation,
                    scanSettings: {
                      ...field.validation?.scanSettings,
                      quality: parseFloat(e.target.value) || 0.9
                    }
                  }
                })}
              />
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`showGuides_${field.id}`}
                    checked={field.validation?.scanSettings?.showGuides !== false}
                    onChange={(e) => onUpdate({
                      validation: {
                        ...field.validation,
                        scanSettings: {
                          ...field.validation?.scanSettings,
                          showGuides: e.target.checked
                        }
                      }
                    })}
                    className="text-blue-600"
                  />
                  <label htmlFor={`showGuides_${field.id}`} className="text-sm text-gray-700 dark:text-gray-300">
                    Afficher les guides de centrage
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`autoCapture_${field.id}`}
                    checked={field.validation?.scanSettings?.autoCapture || false}
                    onChange={(e) => onUpdate({
                      validation: {
                        ...field.validation,
                        scanSettings: {
                          ...field.validation?.scanSettings,
                          autoCapture: e.target.checked
                        }
                      }
                    })}
                    className="text-blue-600"
                  />
                  <label htmlFor={`autoCapture_${field.id}`} className="text-sm text-gray-700 dark:text-gray-300">
                    Capture automatique (expérimental)
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Aperçu de la configuration */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-300 mb-2">
              Configuration du scanner
            </h4>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
              <div>📐 Résolution max: {field.validation?.scanSettings?.maxWidth || 1600}x{field.validation?.scanSettings?.maxHeight || 1200}px</div>
              <div>🎚️ Qualité: {Math.round((field.validation?.scanSettings?.quality || 0.9) * 100)}%</div>
              <div>📄 Format: {(field.validation?.scanSettings?.outputFormat || 'jpeg').toUpperCase()}</div>
              <div>🎯 Guides: {field.validation?.scanSettings?.showGuides !== false ? 'Activés' : 'Désactivés'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};