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
  Scan,
} from 'lucide-react';

interface FieldPaletteProps {
  onAddField: (type: FormField['type']) => void;
}

interface FieldTypeProps {
  type: FormField['type'];
  icon: React.ReactNode;
  label: string;
  color: string;
  onAdd: () => void;
}

const FieldType: React.FC<FieldTypeProps> = ({ type, icon, label, color, onAdd }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'field-type',
    item: { type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'from-blue-100 to-blue-200 text-blue-700 border-blue-300 hover:from-blue-200 hover:to-blue-300',
      green: 'from-green-100 to-emerald-200 text-green-700 border-green-300 hover:from-green-200 hover:to-emerald-300',
      purple: 'from-purple-100 to-purple-200 text-purple-700 border-purple-300 hover:from-purple-200 hover:to-purple-300',
      orange: 'from-orange-100 to-orange-200 text-orange-700 border-orange-300 hover:from-orange-200 hover:to-orange-300',
      indigo: 'from-indigo-100 to-indigo-200 text-indigo-700 border-indigo-300 hover:from-indigo-200 hover:to-indigo-300',
      teal: 'from-teal-100 to-teal-200 text-teal-700 border-teal-300 hover:from-teal-200 hover:to-teal-300',
      pink: 'from-pink-100 to-pink-200 text-pink-700 border-pink-300 hover:from-pink-200 hover:to-pink-300',
      rose: 'from-rose-100 to-rose-200 text-rose-700 border-rose-300 hover:from-rose-200 hover:to-rose-300',
      yellow: 'from-yellow-100 to-yellow-200 text-yellow-700 border-yellow-300 hover:from-yellow-200 hover:to-yellow-300',
      cyan: 'from-cyan-100 to-cyan-200 text-cyan-700 border-cyan-300 hover:from-cyan-200 hover:to-cyan-300',
      emerald: 'from-emerald-100 to-emerald-200 text-emerald-700 border-emerald-300 hover:from-emerald-200 hover:to-emerald-300',
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div
      ref={drag}
      onClick={onAdd}
      className={`p-3 border-2 border-dashed rounded-lg cursor-pointer transition-all active:scale-95 hover:shadow-lg hover:scale-105 bg-gradient-to-br ${getColorClasses(color)} ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center space-y-2">
        <div className="p-2 bg-white/50 rounded-lg shadow-sm">{icon}</div>
        <span className="text-xs font-semibold text-center leading-tight">
          {label}
        </span>
      </div>
    </div>
  );
};

export const FieldPalette: React.FC<FieldPaletteProps> = ({ onAddField }) => {
  const fieldTypes = [
    { type: 'text' as const, icon: <Type className="h-5 w-5" />, label: 'Texte', color: 'blue' },
    { type: 'email' as const, icon: <Mail className="h-5 w-5" />, label: 'Email', color: 'green' },
    { type: 'phone' as const, icon: <Phone className="h-5 w-5" />, label: 'Téléphone', color: 'purple' },
    { type: 'number' as const, icon: <Hash className="h-5 w-5" />, label: 'Nombre', color: 'orange' },
    { type: 'radio' as const, icon: <CircleDot className="h-5 w-5" />, label: 'Choix unique', color: 'indigo' },
    { type: 'checkbox' as const, icon: <CheckSquare className="h-5 w-5" />, label: 'Cases à cocher', color: 'teal' },
    { type: 'date' as const, icon: <Calendar className="h-5 w-5" />, label: 'Date', color: 'pink' },
    { type: 'birthdate' as const, icon: <Cake className="h-5 w-5" />, label: 'Date de naissance', color: 'rose' },
    { type: 'file' as const, icon: <Upload className="h-5 w-5" />, label: 'Fichier', color: 'yellow' },
    { type: 'scan' as const, icon: <Scan className="h-5 w-5" />, label: 'Scanner document', color: 'emerald' },
    { type: 'textarea' as const, icon: <FileText className="h-5 w-5" />, label: 'Zone de texte', color: 'cyan' },
    { type: 'signature' as const, icon: <PenTool className="h-5 w-5" />, label: 'Signature', color: 'emerald' },
  ];

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 shadow-lg" data-tutorial="field-palette">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-lg">🎨</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300">
              Éléments de formulaire
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Cliquez pour ajouter un champ au formulaire
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {fieldTypes.map(({ type, icon, label, color }) => (
            <FieldType
              key={type}
              type={type}
              icon={icon}
              label={label}
              color={color}
              onAdd={() => onAddField(type)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};