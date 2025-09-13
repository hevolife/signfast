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
  Palette,
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
      className={`p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all active:scale-95 hover:shadow-lg hover:-translate-y-1 group ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center space-y-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <span className="text-xs font-bold text-gray-900 dark:text-white text-center leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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
    <Card className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20 border-blue-200 dark:border-blue-800 shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Palette className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300">
              Éléments de Formulaire
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Cliquez ou glissez pour ajouter un champ au formulaire
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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