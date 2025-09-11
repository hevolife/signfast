import React from 'react';
import { useDrag } from 'react-dnd';
import { FormField } from '../../types/form';
import { Card, CardContent, CardHeader } from '../ui/Card';
import {
  Type,
  Mail,
  Hash,
  CircleDot,
  CheckSquare,
  Calendar,
  Upload,
  FileText,
  Phone,
  Cake,
  PenTool,
} from 'lucide-react';

interface FieldPaletteProps {
  onAddField: (type: FormField['type']) => void;
}

interface FieldTypeProps {
  type: FormField['type'];
  icon: React.ReactNode;
  label: string;
  onAdd: () => void;
}

const FieldType: React.FC<FieldTypeProps> = ({ type, icon, label, onAdd }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'field-type',
    item: { type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      onClick={onAdd}
      className={`p-3 lg:p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors active:scale-95 ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col lg:flex-row items-center lg:space-x-3 space-y-1 lg:space-y-0">
        <div className="text-blue-600">{icon}</div>
        <span className="text-xs lg:text-sm font-medium text-gray-900 dark:text-white text-center lg:text-left">
          {label}
        </span>
      </div>
    </div>
  );
};

export const FieldPalette: React.FC<FieldPaletteProps> = ({ onAddField }) => {
  const fieldTypes = [
    { type: 'text' as const, icon: <Type className="h-5 w-5" />, label: 'Texte' },
    { type: 'email' as const, icon: <Mail className="h-5 w-5" />, label: 'Email' },
    { type: 'phone' as const, icon: <Phone className="h-5 w-5" />, label: 'Téléphone' },
    { type: 'number' as const, icon: <Hash className="h-5 w-5" />, label: 'Nombre' },
    { type: 'radio' as const, icon: <CircleDot className="h-5 w-5" />, label: 'Choix unique' },
    { type: 'checkbox' as const, icon: <CheckSquare className="h-5 w-5" />, label: 'Cases à cocher' },
    { type: 'date' as const, icon: <Calendar className="h-5 w-5" />, label: 'Date' },
    { type: 'birthdate' as const, icon: <Cake className="h-5 w-5" />, label: 'Date de naissance' },
    { type: 'file' as const, icon: <Upload className="h-5 w-5" />, label: 'Fichier' },
    { type: 'textarea' as const, icon: <FileText className="h-5 w-5" />, label: 'Zone de texte' },
    { type: 'signature' as const, icon: <PenTool className="h-5 w-5" />, label: 'Signature' },
  ];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white lg:block hidden">
          Éléments de formulaire
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 lg:block hidden">
          Glissez ou cliquez pour ajouter un champ
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 lg:gap-3 lg:space-y-0">
          {fieldTypes.map(({ type, icon, label }) => (
            <FieldType
              key={type}
              type={type}
              icon={icon}
              label={label}
              onAdd={() => onAddField(type)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};