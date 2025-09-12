import React, { useState, useRef } from 'react';
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
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fieldRef = useRef<HTMLDivElement>(null);

  // Afficher seulement si sur la page courante
  if (field.page !== currentPage) {
    return null;
  }

  const snapToGrid = (value: number, gridSize: number = 5) => {
    return Math.round(value / gridSize) * gridSize;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.delete-button') || 
        (e.target as HTMLElement).closest('.resize-handle')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    onSelect(field);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    
    const canvas = document.querySelector(`canvas[data-page="${currentPage}"]`) as HTMLCanvasElement;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    
    let newX = (e.clientX - rect.left) / scale;
    let newY = (e.clientY - rect.top) / scale;
    
    // Contraintes
    const maxX = (rect.width / scale) - field.width;
    const maxY = (rect.height / scale) - field.height;
    
    newX = Math.max(0, Math.min(maxX, newX));
    newY = Math.max(0, Math.min(maxY, newY));
    
    // Aligner sur grille
    newX = snapToGrid(newX, 5);
    newY = snapToGrid(newY, 5);
    
    onUpdate({
      ...field,
      x: Math.round(newX),
      y: Math.round(newY)
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const handleResizeStart = (e: React.MouseEvent, handle: 'se' | 's' | 'e') => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    
    document.addEventListener('mousemove', (e) => handleResizeMove(e, handle));
    document.addEventListener('mouseup', handleResizeEnd);
    
    const cursor = handle === 'se' ? 'se-resize' : handle === 's' ? 's-resize' : 'e-resize';
    document.body.style.cursor = cursor;
    document.body.style.userSelect = 'none';
  };

  const handleResizeMove = (e: MouseEvent, handle: 'se' | 's' | 'e') => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    let newWidth = field.width;
    let newHeight = field.height;
    
    if (handle === 'se' || handle === 'e') {
      newWidth = Math.max(20, field.width + deltaX / scale);
    }
    
    if (handle === 'se' || handle === 's') {
      newHeight = Math.max(15, field.height + deltaY / scale);
    }
    
    // Contraintes par type
    const constraints = {
      checkbox: { minWidth: 15, maxWidth: 30, minHeight: 15, maxHeight: 30 },
      signature: { minWidth: 100, maxWidth: 300, minHeight: 30, maxHeight: 100 },
      image: { minWidth: 50, maxWidth: 400, minHeight: 50, maxHeight: 300 },
      default: { minWidth: 50, maxWidth: 400, minHeight: 20, maxHeight: 100 }
    };
    
    const constraint = constraints[field.type] || constraints.default;
    newWidth = Math.max(constraint.minWidth, Math.min(constraint.maxWidth, newWidth));
    newHeight = Math.max(constraint.minHeight, Math.min(constraint.maxHeight, newHeight));
    
    newWidth = snapToGrid(newWidth, 5);
    newHeight = snapToGrid(newHeight, 5);
    
    onUpdate({
      ...field,
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete(field.id);
  };

  const getExampleText = (field: PDFField): string => {
    const variable = field.variable.toLowerCase();
    
    if (variable.includes('nom')) return 'Dupont';
    if (variable.includes('prenom')) return 'Jean';
    if (variable.includes('email')) return 'jean@email.com';
    if (variable.includes('telephone')) return '01 23 45 67 89';
    if (variable.includes('date')) return '15/03/2024';
    
    return field.placeholder || 'Exemple';
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
      ref={fieldRef}
      className={`absolute select-none border-2 transition-all duration-200 ${
        isSelected 
          ? 'border-blue-500 bg-blue-50/80 shadow-lg ring-2 ring-blue-300/50' 
          : 'border-gray-300 bg-white/90 hover:border-blue-300 hover:shadow-md'
      } ${
        isDragging
          ? 'opacity-70 cursor-grabbing z-50 shadow-2xl scale-105' 
          : isResizing
          ? 'z-50 shadow-xl'
          : 'cursor-grab hover:cursor-grab'
      }`}
      style={{
        left: `${field.x * scale}px`,
        top: `${field.y * scale}px`,
        width: `${field.width * scale}px`,
        height: `${field.height * scale}px`,
        backgroundColor: field.backgroundColor || 'transparent',
        zIndex: isSelected ? 30 : isDragging || isResizing ? 50 : 10,
        pointerEvents: 'auto'
      }}
      onMouseDown={handleMouseDown}
    >
      {renderFieldContent()}
      
      {/* Bouton supprimer */}
      {isSelected && (
        <button
          className="delete-button absolute -top-4 -right-4 w-8 h-8 bg-red-500 text-white rounded-full text-sm font-bold hover:bg-red-600 flex items-center justify-center shadow-lg border-2 border-white z-50"
          onClick={handleDeleteClick}
          title="Supprimer le champ"
        >
          ×
        </button>
      )}
      
      {/* Poignées de redimensionnement */}
      {isSelected && !isDragging && !isResizing && (
        <>
          <div 
            className="resize-handle absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 cursor-se-resize border-2 border-white shadow-lg z-30 hover:bg-blue-600 transition-colors rounded-sm"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            title="Redimensionner"
          />
          <div 
            className="resize-handle absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-3 bg-blue-500 cursor-s-resize border-2 border-white shadow-lg z-30 hover:bg-blue-600 transition-colors rounded-sm"
            onMouseDown={(e) => handleResizeStart(e, 's')}
            title="Redimensionner hauteur"
          />
          <div 
            className="resize-handle absolute -right-2 top-1/2 transform -translate-y-1/2 w-3 h-4 bg-blue-500 cursor-e-resize border-2 border-white shadow-lg z-30 hover:bg-blue-600 transition-colors rounded-sm"
            onMouseDown={(e) => handleResizeStart(e, 'e')}
            title="Redimensionner largeur"
          />
        </>
      )}
      
      {/* Indicateur de position */}
      {isSelected && (
        <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg z-30">
          ({Math.round(field.x)}, {Math.round(field.y)}) - {Math.round(field.width)}×{Math.round(field.height)}
        </div>
      )}
    </div>
  );
};