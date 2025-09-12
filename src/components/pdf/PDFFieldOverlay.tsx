import React from 'react';
import { useDrag } from 'react-dnd';
import { PDFField } from '../../types/pdf';

interface PDFFieldOverlayProps {
  field: PDFField;
  scale: number;
  isSelected: boolean;
  onSelect: (field: PDFField) => void;
  onUpdate: (field: PDFField) => void;
  onDelete: (fieldId: string) => void;
  currentPage: number;
}

export const PDFFieldOverlay: React.FC<PDFFieldOverlayProps> = ({
  field,
  scale,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  currentPage
}) => {
  // Only render if field is on current page
  if (field.page !== currentPage) {
    return null;
  }

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'pdf-field',
    item: { id: field.id, type: 'existing-field' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleFieldClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🖱️ Clic sur champ:', field.id);
    onSelect(field);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🗑️ Suppression champ:', field.id);
    onDelete(field.id);
  };

  const getExampleText = (field: PDFField): string => {
    const variable = field.variable.toLowerCase();
    
    if (variable.includes('nom') || variable.includes('name')) {
      return 'Dupont';
    } else if (variable.includes('prenom') || variable.includes('firstname')) {
      return 'Jean';
    } else if (variable.includes('email') || variable.includes('mail')) {
      return 'jean.dupont@email.com';
    } else if (variable.includes('telephone') || variable.includes('phone')) {
      return '01 23 45 67 89';
    } else if (variable.includes('date')) {
      return '15/03/2024';
    } else {
      return field.placeholder || 'Exemple';
    }
  };

  const renderFieldContent = () => {
    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <div 
            className="truncate text-xs px-1 py-0.5"
            style={{ 
              fontSize: `${Math.max(8, (field.fontSize || 12) * scale)}px`,
              color: field.fontColor || '#000000'
            }}
          >
            {getExampleText(field)}
          </div>
        );
      
      case 'date':
        return (
          <div 
            className="truncate text-xs px-1 py-0.5"
            style={{ 
              fontSize: `${Math.max(8, (field.fontSize || 12) * scale)}px`,
              color: field.fontColor || '#000000'
            }}
          >
            15/03/2024
          </div>
        );
      
      case 'checkbox':
        const size = Math.min(field.width * scale, field.height * scale) - 4;
        return (
          <div className="flex items-center justify-center h-full">
            <div 
              className="border border-gray-400 flex items-center justify-center"
              style={{ 
                width: `${size}px`, 
                height: `${size}px`,
                fontSize: `${size * 0.6}px`
              }}
            >
              ✓
            </div>
          </div>
        );
      
      case 'signature':
        return (
          <div className="flex items-center justify-center h-full text-xs text-gray-500 italic">
            Signature
          </div>
        );
      
      case 'image':
        return (
          <div className="flex items-center justify-center h-full text-xs text-gray-500 border-2 border-dashed border-gray-300">
            📷 Image
          </div>
        );
      
      default:
        return (
          <div className="truncate text-xs px-1 py-0.5">
            {getExampleText(field)}
          </div>
        );
    }
  };

  return (
    <div
      ref={(node) => {
        drag(node);
      }}
      className={`absolute select-none border-2 transition-all duration-200 ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-300' 
          : 'border-gray-300 bg-white hover:border-blue-300 hover:shadow-md'
      } ${
        isDragging ? 'opacity-50 cursor-grabbing z-50' : 'cursor-move hover:cursor-grab'
      }`}
      style={{
        left: `${field.x * scale}px`,
        top: `${field.y * scale}px`,
        width: `${field.width * scale}px`,
        height: `${field.height * scale}px`,
        backgroundColor: field.backgroundColor || 'transparent',
        zIndex: isSelected ? 20 : 10,
        pointerEvents: 'auto'
      }}
      onClick={handleFieldClick}
    >
      {renderFieldContent()}
      
      {/* Delete button - Always visible when selected */}
      {isSelected && (
        <button
          className="absolute -top-4 -right-4 w-10 h-10 bg-red-500 text-white rounded-full text-xl font-bold hover:bg-red-600 flex items-center justify-center shadow-lg border-2 border-white z-50 cursor-pointer"
          onClick={handleDeleteClick}
          title="Supprimer le champ"
        >
          ×
        </button>
      )}
      
      {/* Resize handles when selected */}
      {isSelected && (
        <>
          <div 
            className="absolute -bottom-2 -right-2 w-5 h-5 bg-blue-500 cursor-se-resize border-2 border-white shadow-sm z-20"
          />
          <div 
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-5 h-4 bg-blue-500 cursor-s-resize border-2 border-white shadow-sm z-20"
          />
          <div 
            className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-5 bg-blue-500 cursor-e-resize border-2 border-white shadow-sm z-20"
          />
        </>
      )}
    </div>
  );
};