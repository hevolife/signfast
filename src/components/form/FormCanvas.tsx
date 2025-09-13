import React from 'react';
import { useDrop } from 'react-dnd';
import { FormField } from '../../types/form';
import { FormFieldEditor } from './FormFieldEditor';
import { FieldPropertiesEditor } from './FieldPropertiesEditor';
import { Card, CardContent } from '../ui/Card';
import { Plus } from 'lucide-react';

interface FormCanvasProps {
  fields: FormField[];
  selectedField: string | null;
  selectedFields: Set<string>;
  isMultiSelectMode: boolean;
  onSelectField: (id: string | null) => void;
  onUpdateField: (id: string, updates: Partial<FormField>) => void;
  onRemoveField: (id: string) => void;
  onMoveField: (dragIndex: number, hoverIndex: number) => void;
  onFieldDrop: (fieldType: FormField['type']) => void;
}

export const FormCanvas: React.FC<FormCanvasProps> = ({
  fields,
  selectedField,
  selectedFields,
  isMultiSelectMode,
  onSelectField,
  onUpdateField,
  onRemoveField,
  onMoveField,
  onFieldDrop,
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'field-type',
    drop: (item: { type: FormField['type'] }) => {
      onFieldDrop(item.type);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div
              ref={drop}
              className={`min-h-64 lg:min-h-96 border-2 border-dashed rounded-lg ${
                isOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              } ${fields.length === 0 ? 'flex items-center justify-center' : 'p-2 lg:p-4 space-y-2 lg:space-y-4'}`}
            >
              {fields.length === 0 ? (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 text-gray-400 rounded-full mb-4">
                    <Plus className="h-8 w-8" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="hidden lg:inline">Glissez des éléments ici pour créer votre formulaire</span>
                    <span className="lg:hidden">Appuyez sur le menu pour ajouter des champs</span>
                  </p>
                </div>
              ) : (
                fields.map((field, index) => (
                  <FormFieldEditor
                    key={field.id}
                    field={field}
                    index={index}
                    isSelected={selectedField === field.id}
                    isMultiSelected={selectedFields.has(field.id)}
                    isMultiSelectMode={isMultiSelectMode}
                    onClick={() => onSelectField(field.id)}
                    onUpdate={(updates) => onUpdateField(field.id, updates)}
                    onRemove={() => onRemoveField(field.id)}
                    onMove={onMoveField}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 hidden lg:block">
        {selectedField ? (
          <Card>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isMultiSelectMode && selectedFields.size > 1 
                  ? `Propriétés (${selectedFields.size} champs)` 
                  : 'Propriétés du champ'
                }
              </h3>
            </div>
            <CardContent className="p-6">
              {(() => {
                const field = fields.find(f => f.id === selectedField);
                return field ? (
                  <FieldPropertiesEditor
                    field={field}
                    selectedFields={selectedFields}
                    isMultiSelectMode={isMultiSelectMode}
                    onUpdate={(updates) => onUpdateField(selectedField, updates)}
                  />
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Champ non trouvé
                  </p>
                );
              })()}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isMultiSelectMode 
                  ? 'Cliquez sur les champs pour les sélectionner (mode multi-sélection)'
                  : 'Cliquez sur un champ pour modifier ses propriétés'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};