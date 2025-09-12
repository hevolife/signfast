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
      className={`p-2 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-center ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center space-y-1">
        <div className="text-blue-600">{icon}</div>
        <span className="text-xs font-medium text-gray-900 dark:text-white">
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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Champs PDF
      </h3>
      <div className="flex flex-wrap gap-2">
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
    </div>
  );
};