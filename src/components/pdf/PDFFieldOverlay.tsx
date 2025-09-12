import React from 'react';
import { PDFField } from '../../types/pdf';
import { useDrag, useDrop } from 'react-dnd';

interface PDFFieldOverlayProps {
  field: PDFField;
  scale: number;
  isSelected: boolean;
  onSelect: (field: PDFField) => void;
  onUpdate: (field: PDFField) => void;
  onDelete: (fieldId: string) => void;
  canvasRefs?: React.RefObject<HTMLCanvasElement>[];
  currentPage: number;
}

export const PDFFieldOverlay: React.FC<PDFFieldOverlayProps> = ({
  field,
  scale,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  canvasRefs,
  currentPage
}) => {
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'pdf-field',
    item: () => ({ 
      id: field.id, 
      type: field.type,
      originalX: field.x,
      originalY: field.y 
    }),
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult();
      if (!dropResult && monitor.didDrop()) {
        // Reset position if dropped outside valid area
        onUpdate({ ...field, x: item.originalX, y: item.originalY });
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'pdf-field',
    hover: (item: { id: string; originalX: number; originalY: number }, monitor) => {
      if (item.id === field.id) return;
      
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      if (!hoverBoundingRect) return;
      
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      
      // Calculate new position relative to the canvas
      const newX = (clientOffset.x - hoverBoundingRect.left) / scale;
      const newY = (clientOffset.y - hoverBoundingRect.top) / scale;
      
      // Update field position
      onUpdate({ ...field, x: newX, y: newY });
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const ref = React.useRef<HTMLDivElement>(null);
  
  // Combine drag and drop refs
  const dragDropRef = (el: HTMLDivElement | null) => {
    ref.current = el;
    drag(drop(el));
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete(field.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(field);
  };

  // Only render if field is on current page
  if (field.page !== currentPage) {
    return null;
  }

  const getExampleText = (field: PDFField): string => {
    const variable = field.variable.toLowerCase();
    
    // Exemples contextuels basés sur la variable
    if (variable.includes('nom') || variable.includes('name')) {
      return 'Dupont';
    } else if (variable.includes('prenom') || variable.includes('firstname')) {
      return 'Jean';
    } else if (variable.includes('email') || variable.includes('mail')) {
      return 'jean.dupont@email.com';
    } else if (variable.includes('telephone') || variable.includes('phone')) {
      return '01 23 45 67 89';
    } else if (variable.includes('adresse') || variable.includes('address')) {
      return '123 Rue de la Paix';
    } else if (variable.includes('ville') || variable.includes('city')) {
      return 'Paris';
    } else if (variable.includes('code') && variable.includes('postal')) {
      return '75001';
    } else if (variable.includes('date')) {
      return '15/03/2024';
    } else if (variable.includes('age')) {
      return '35';
    } else if (variable.includes('salaire') || variable.includes('salary')) {
      return '2500€';
    } else if (variable.includes('prix') || variable.includes('price')) {
      return '150€';
    } else if (variable.includes('numero') || variable.includes('number')) {
      return '12345';
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
      ref={dragDropRef}
      className={`absolute cursor-pointer select-none border-2 ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-lg' 
          : 'border-gray-300 bg-white hover:border-blue-300 hover:shadow-md'
      } transition-all duration-200 ${isDragging ? 'opacity-50 cursor-grabbing' : 'opacity-100 cursor-grab'} ${isOver ? 'ring-2 ring-blue-300' : ''}`}
      style={{
        left: `${field.x * scale}px`,
        top: `${field.y * scale}px`,
        width: `${field.width * scale}px`,
        height: `${field.height * scale}px`,
        backgroundColor: field.backgroundColor || 'transparent',
        zIndex: isSelected ? 20 : 10
      }}
      onClick={handleClick}
      onMouseDown={(e) => {
        // Prevent text selection during drag
        e.preventDefault();
      }}
    >
      {renderFieldContent()}
      
      {/* Delete button when selected */}
      {isSelected && (
        <button
          className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white rounded-full text-sm hover:bg-red-600 flex items-center justify-center shadow-lg border-2 border-white z-30 cursor-pointer"
          onClick={handleDelete}
          onMouseDown={(e) => e.stopPropagation()}
          title="Supprimer le champ"
        >
          ×
        </button>
      )}
      
      {/* Resize handles when selected */}
      {isSelected && (
        <>
          <div 
            className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 cursor-se-resize border border-white shadow-sm z-20"
            onMouseDown={(e) => e.stopPropagation()}
          ></div>
          <div 
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-3 bg-blue-500 cursor-s-resize border border-white shadow-sm z-20"
            onMouseDown={(e) => e.stopPropagation()}
          ></div>
          <div 
            className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-3 h-4 bg-blue-500 cursor-e-resize border border-white shadow-sm z-20"
            onMouseDown={(e) => e.stopPropagation()}
          ></div>
        </>
      )}
    </div>
  );
};