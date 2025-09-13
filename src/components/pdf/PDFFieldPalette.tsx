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

export const PDFFieldPalette: React.FC<PDFFieldPaletteProps> = ({ onAddField }) => {
  const fieldTypes = [
    { type: 'text' as const, icon: <Type className="h-5 w-5" />, label: 'Texte', color: 'blue' },
    { type: 'date' as const, icon: <Calendar className="h-5 w-5" />, label: 'Date', color: 'green' },
    { type: 'number' as const, icon: <Hash className="h-5 w-5" />, label: 'Nombre', color: 'purple' },
    { type: 'signature' as const, icon: <PenTool className="h-5 w-5" />, label: 'Signature', color: 'orange' },
    { type: 'checkbox' as const, icon: <CheckSquare className="h-5 w-5" />, label: 'Case à cocher', color: 'indigo' },
    { type: 'image' as const, icon: <Image className="h-5 w-5" />, label: 'Image', color: 'teal' },
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'from-blue-100 to-blue-200 text-blue-700 border-blue-300 hover:from-blue-200 hover:to-blue-300',
      green: 'from-green-100 to-emerald-200 text-green-700 border-green-300 hover:from-green-200 hover:to-emerald-300',
      purple: 'from-purple-100 to-purple-200 text-purple-700 border-purple-300 hover:from-purple-200 hover:to-purple-300',
      orange: 'from-orange-100 to-orange-200 text-orange-700 border-orange-300 hover:from-orange-200 hover:to-orange-300',
      indigo: 'from-indigo-100 to-indigo-200 text-indigo-700 border-indigo-300 hover:from-indigo-200 hover:to-indigo-300',
      teal: 'from-teal-100 to-teal-200 text-teal-700 border-teal-300 hover:from-teal-200 hover:to-teal-300',
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-lg">🎨</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300">
              Champs PDF
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-400">
              Cliquez pour ajouter un champ au PDF
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {fieldTypes.map(({ type, icon, label, color }) => (
            <div
              key={type}
              onClick={() => onAddField(type)}
              className={`p-3 border-2 border-dashed rounded-lg cursor-pointer transition-all active:scale-95 hover:shadow-lg hover:scale-105 bg-gradient-to-br ${getColorClasses(color)}`}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className="p-2 bg-white/50 rounded-lg shadow-sm">{icon}</div>
                <span className="text-xs font-semibold text-center leading-tight">
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};