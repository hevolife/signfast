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
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [originalPosition, setOriginalPosition] = useState({ x: field.x, y: field.y });
  const fieldRef = useRef<HTMLDivElement>(null);

  // Only render if field is on current page
  if (field.page !== currentPage) {
    return null;
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignorer si c'est le bouton supprimer
    if ((e.target as HTMLElement).closest('.delete-button')) {
      return;
    }

    console.log('🖱️ MouseDown sur champ:', field.id);
    e.preventDefault();
    e.stopPropagation();
    
    // Sélectionner le champ
    onSelect(field);
    
    // Préparer le drag
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setOriginalPosition({ x: field.x, y: field.y });
    
    // Ajouter les événements globaux
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Changer le curseur
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    // Calculer la position directe de la souris par rapport au canvas
    const canvas = document.querySelector('.pdf-canvas-container canvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const newX = Math.max(0, Math.min(600, (e.clientX - rect.left) / scale));
    const newY = Math.max(0, Math.min(800, (e.clientY - rect.top) / scale));
    
    console.log('🖱️ MouseMove - nouvelle position:', { newX, newY });
    
    // Mettre à jour la position en temps réel
    onUpdate({
      ...field,
      x: Math.round(newX),
      y: Math.round(newY)
    });
  };

  const handleMouseUp = (e: MouseEvent) => {
    console.log('🖱️ MouseUp - fin du drag');
    
    setIsDragging(false);
    
    // Nettoyer les événements
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Restaurer le curseur
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const handleFieldClick = (e: React.MouseEvent) => {
    // Si on n'est pas en train de dragger, c'est juste une sélection
    if (!isDragging) {
      console.log('🖱️ Clic simple sur champ:', field.id);
      e.stopPropagation();
      onSelect(field);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    console.log('🗑️ Suppression champ:', field.id);
    e.stopPropagation();
    e.preventDefault();
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
      ref={fieldRef}
      className={`absolute select-none border-2 transition-all duration-200 ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-300' 
          : 'border-gray-300 bg-white hover:border-blue-300 hover:shadow-md'
      } ${
        isDragging 
          ? 'opacity-70 cursor-grabbing z-50 shadow-2xl' 
          : 'cursor-grab hover:cursor-grab'
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
      onMouseDown={handleMouseDown}
      onClick={handleFieldClick}
    >
      {renderFieldContent()}
      
      {/* Bouton supprimer - toujours visible quand sélectionné */}
      {isSelected && (
        <button
          className="delete-button absolute -top-4 -right-4 w-10 h-10 bg-red-500 text-white rounded-full text-lg font-bold hover:bg-red-600 flex items-center justify-center shadow-lg border-2 border-white z-50"
          onClick={handleDeleteClick}
          onMouseDown={(e) => {
            console.log('🗑️ MouseDown sur bouton supprimer');
            e.stopPropagation();
          }}
          title="Supprimer le champ"
          style={{ pointerEvents: 'auto' }}
        >
          ×
        </button>
      )}
      
      {/* Poignées de redimensionnement quand sélectionné */}
      {isSelected && !isDragging && (
        <>
          <div 
            className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500 cursor-se-resize border-2 border-white shadow-sm z-20"
            style={{ pointerEvents: 'none' }}
          />
          <div 
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-4 bg-blue-500 cursor-s-resize border-2 border-white shadow-sm z-20"
            style={{ pointerEvents: 'none' }}
          />
          <div 
            className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-6 bg-blue-500 cursor-e-resize border-2 border-white shadow-sm z-20"
            style={{ pointerEvents: 'none' }}
          />
        </>
      )}
    </div>
  );
};