import React from 'react';
import { useDrag } from 'react-dnd';
import { PDFField } from '../../types/pdf';
import { Card, CardContent, CardHeader } from '../ui/Card';
import {
  Type,
  Calendar,
  Hash,
  PenTool,
  CheckSquare,
  Image,
} from 'lucide-react';

interface PDFFieldPaletteProps {
  onAddField: (type: PDFField['type']) => void;
}

interface FieldTypeProps {
  type: PDFField['type'];
  icon: React.ReactNode;
  label: string;
  onAdd: () => void;
}

const FieldType: React.FC<FieldTypeProps> = ({ type, icon, label, onAdd }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'pdf-field-type',
    item: { type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      onClick={onAdd}
      className={`p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className="flex items-center space-x-2">
        <div className="text-blue-600">{icon}</div>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </span>
      </div>
    </div>
  );
};

export const PDFFieldPalette: React.FC<PDFFieldPaletteProps> = ({ onAddField }) => {
  const fieldTypes = [
    { type: 'text' as const, icon: <Type className="h-4 w-4" />, label: 'Texte' },
    { type: 'date' as const, icon: <Calendar className="h-4 w-4" />, label: 'Date' },
    { type: 'number' as const, icon: <Hash className="h-4 w-4" />, label: 'Nombre' },
    { type: 'signature' as const, icon: <PenTool className="h-4 w-4" />, label: 'Signature' },
    { type: 'checkbox' as const, icon: <CheckSquare className="h-4 w-4" />, label: 'Case à cocher' },
    { type: 'image' as const, icon: <Image className="h-4 w-4" />, label: 'Image' },
  ];

  return (
    <Card>
      <CardHeader>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          Champs PDF
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Glissez ou cliquez pour ajouter un champ
        </p>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:space-y-2 sm:grid-cols-none">
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