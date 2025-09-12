import React, { useState, useRef } from 'react';
import { PDFField } from '../../types/pdf';
import { useDrag } from 'react-dnd';

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
  const [resizeHandle, setResizeHandle] = useState<'se' | 's' | 'e' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [originalPosition, setOriginalPosition] = useState({ x: field.x, y: field.y });
  const [originalSize, setOriginalSize] = useState({ width: field.width, height: field.height });
  const fieldRef = useRef<HTMLDivElement>(null);

  // Configuration du drag pour react-dnd
  const [{ isDraggingDnd }, drag] = useDrag(() => ({
    type: 'pdf-field',
    item: { id: field.id },
    collect: (monitor) => ({
      isDraggingDnd: monitor.isDragging(),
    }),
  }));

  // Only render if field is on current page
  if (field.page !== currentPage) {
    return null;
  }

  // Fonction pour aligner sur la grille (optionnel)
  const snapToGrid = (value: number, gridSize: number = 5) => {
    return Math.round(value / gridSize) * gridSize;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignorer si c'est le bouton supprimer
    if ((e.target as HTMLElement).closest('.delete-button') || 
        (e.target as HTMLElement).closest('.resize-handle')) {
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
    
    // Empêcher la sélection de texte pendant le drag
    e.preventDefault();
    
    // Ajouter les événements globaux
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Changer le curseur
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    
    // Trouver le canvas de la page courante
    const canvas = document.querySelector('.pdf-canvas-container canvas') as HTMLCanvasElement;
    if (!canvas) {
      // Fallback: chercher tous les canvas et prendre celui de la page courante
      const allCanvas = document.querySelectorAll('canvas');
      const targetCanvas = Array.from(allCanvas)[currentPage - 1];
      if (!targetCanvas) return;
    }
    
    const targetCanvas = canvas || document.querySelectorAll('canvas')[currentPage - 1] as HTMLCanvasElement;
    if (!canvas) return;
    
    const rect = targetCanvas.getBoundingClientRect();
    
    // Calculer la nouvelle position avec contraintes
    let newX = (e.clientX - rect.left) / scale;
    let newY = (e.clientY - rect.top) / scale;
    
    // Contraintes pour garder le champ dans les limites du canvas
    const maxX = (rect.width / scale) - field.width;
    const maxY = (rect.height / scale) - field.height;
    
    newX = Math.max(0, Math.min(maxX, newX));
    newY = Math.max(0, Math.min(maxY, newY));
    
    // Optionnel: aligner sur une grille pour un positionnement plus propre
    newX = snapToGrid(newX, 5);
    newY = snapToGrid(newY, 5);
    
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

  const handleResizeStart = (e: React.MouseEvent, handle: 'se' | 's' | 'e') => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔧 Début redimensionnement:', handle);
    setIsResizing(true);
    setResizeHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setOriginalSize({ width: field.width, height: field.height });
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    
    document.body.style.cursor = handle === 'se' ? 'se-resize' : handle === 's' ? 's-resize' : 'e-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || !resizeHandle) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    let newWidth = originalSize.width;
    let newHeight = originalSize.height;
    
    if (resizeHandle === 'se' || resizeHandle === 'e') {
      newWidth = Math.max(20, originalSize.width + deltaX / scale);
    }
    
    if (resizeHandle === 'se' || resizeHandle === 's') {
      newHeight = Math.max(15, originalSize.height + deltaY / scale);
    }
    
    // Contraintes de taille selon le type de champ
    const getConstraints = (type: PDFField['type']) => {
      switch (type) {
        case 'checkbox':
          return { minWidth: 15, maxWidth: 30, minHeight: 15, maxHeight: 30 };
        case 'signature':
          return { minWidth: 100, maxWidth: 300, minHeight: 30, maxHeight: 100 };
        case 'image':
          return { minWidth: 50, maxWidth: 400, minHeight: 50, maxHeight: 300 };
        default:
          return { minWidth: 50, maxWidth: 400, minHeight: 20, maxHeight: 100 };
      }
    };
    
    const constraints = getConstraints(field.type);
    newWidth = Math.max(constraints.minWidth, Math.min(constraints.maxWidth, newWidth));
    newHeight = Math.max(constraints.minHeight, Math.min(constraints.maxHeight, newHeight));
    
    // Aligner sur la grille
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
    setResizeHandle(null);
    
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const handleFieldClick = (e: React.MouseEvent) => {
    // Si on n'est pas en train de dragger, c'est juste une sélection
    if (!isDragging && !isResizing) {
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
      {...(drag(fieldRef) as any)}
      className={`absolute select-none border-2 transition-all duration-200 ${
        isSelected 
          ? 'border-blue-500 bg-blue-50/80 shadow-lg ring-2 ring-blue-300/50' 
          : 'border-gray-300 bg-white/90 hover:border-blue-300 hover:shadow-md'
      } ${
        isDragging || isDraggingDnd
          ? 'opacity-70 cursor-grabbing z-50 shadow-2xl scale-105' 
          : isResizing
          ? 'z-50 shadow-xl'
          : 'cursor-grab hover:cursor-grab hover:scale-102'
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
      {isSelected && !isDragging && !isResizing && (
        <>
          {/* Poignée coin bas-droite */}
          <div 
            className="resize-handle absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500 cursor-se-resize border-2 border-white shadow-lg z-30 hover:bg-blue-600 transition-colors rounded-sm"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            title="Redimensionner"
          />
          {/* Poignée bas */}
          <div 
            className="resize-handle absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-4 bg-blue-500 cursor-s-resize border-2 border-white shadow-lg z-30 hover:bg-blue-600 transition-colors rounded-sm"
            onMouseDown={(e) => handleResizeStart(e, 's')}
            title="Redimensionner hauteur"
          />
          {/* Poignée droite */}
          <div 
            className="resize-handle absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-6 bg-blue-500 cursor-e-resize border-2 border-white shadow-lg z-30 hover:bg-blue-600 transition-colors rounded-sm"
            onMouseDown={(e) => handleResizeStart(e, 'e')}
            title="Redimensionner largeur"
          />
        </>
      )}
      
      {/* Indicateur de position quand sélectionné */}
      {isSelected && (
        <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg z-30">
          ({Math.round(field.x)}, {Math.round(field.y)}) - {Math.round(field.width)}×{Math.round(field.height)}
        </div>
      )}
    </div>
  );
};