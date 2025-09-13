import React from 'react';
import { useDrop } from 'react-dnd';
import { FormField } from '../../types/form';
import { FormFieldEditor } from './FormFieldEditor';
import { FieldPropertiesEditor } from './FieldPropertiesEditor';
import { Card, CardContent } from '../ui/Card';
import { Plus, Sparkles, Settings } from 'lucide-react';

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
        <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 shadow-lg">
          <CardContent className="p-4 lg:p-6">
            <div
              ref={drop}
              className={`min-h-64 lg:min-h-96 border-2 border-dashed rounded-xl transition-all ${
                isOver
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 shadow-inner'
                  : 'border-gray-300 dark:border-gray-600'
              } ${fields.length === 0 ? 'flex items-center justify-center' : 'p-3 lg:p-6 space-y-3 lg:space-y-4'}`}
            >
              {fields.length === 0 ? (
                <div className="text-center p-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-700 dark:to-blue-900/30 text-blue-500 rounded-2xl mb-6 shadow-lg">
                    <Sparkles className="h-10 w-10" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    Zone de Construction
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                    <span className="hidden lg:inline">Glissez des éléments depuis la palette ci-dessus ou cliquez directement pour créer votre formulaire</span>
                    <span className="lg:hidden">Utilisez le menu "Champs" pour ajouter des éléments à votre formulaire</span>
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
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 shadow-lg">
            <div className="px-6 py-4 border-b border-purple-200 dark:border-purple-700">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                  <Settings className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-purple-900 dark:text-purple-300">
                    {isMultiSelectMode && selectedFields.size > 1 
                      ? `Propriétés (${selectedFields.size} champs)` 
                      : 'Propriétés du Champ'
                    }
                  </h3>
                  <p className="text-xs text-purple-700 dark:text-purple-400">
                    Personnalisez les paramètres du champ sélectionné
                  </p>
                </div>
              </div>
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
          <Card className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 border-gray-200 dark:border-gray-700 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                Propriétés
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {isMultiSelectMode 
                  ? 'Cliquez sur les champs pour les sélectionner et modifier leurs propriétés en lot'
                  : 'Sélectionnez un champ dans la zone de construction pour modifier ses propriétés'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};