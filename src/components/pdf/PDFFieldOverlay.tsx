import React, { useState, useRef } from 'react';
import { PDFField } from '../../types/pdf';
import { Button } from '../ui/Button';
import { Trash2 } from 'lucide-react';

interface PDFFieldOverlayProps {
  field: PDFField;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<PDFField>) => void;
  onDelete: () => void;
  canvasRefs?: React.RefObject<(HTMLCanvasElement | null)[]>;
  currentPage?: number;
}

export const PDFFieldOverlay: React.FC<PDFFieldOverlayProps> = ({
  field,
  scale,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  currentPage = 1,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  // Ne pas afficher le champ s'il n'est pas sur la page courante
  if (field.page !== currentPage) {
    return null;
  }

  // Calculer la position en tenant compte de la page
  const getFieldPosition = () => {
    // Pour la page 1, position normale
    if (field.page === 1) {
      return {
        left: field.x * scale,
        top: field.y * scale,
      };
    }
    
    // Pour les autres pages, calculer l'offset
    const pageIndex = field.page - 1;
    
    let pageOffset = 0;
    
    // Calculer l'offset basé sur les pages précédentes
    if (canvasRefs?.current) {
      for (let i = 0; i < pageIndex; i++) {
        const canvas = canvasRefs.current[i];
        if (canvas) {
          // Hauteur du canvas + espacement + label
          pageOffset += canvas.height + 48; // 16px gap + 32px label
        } else {
          // Si le canvas n'est pas encore rendu, utiliser une estimation
          pageOffset += 600; // Estimation de hauteur de page
        }
      }
    }
    
    console.log(`🎯 Position calculée pour page ${field.page}:`, {
      originalX: field.x,
      originalY: field.y,
      pageOffset,
      finalLeft: field.x * scale,
      finalTop: pageOffset + field.y * scale + 32
    });
    
    return {
      left: field.x * scale,
      top: pageOffset + field.y * scale + 32,
    };
  };

  const position = getFieldPosition();
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🖱️ MouseDown sur champ:', field.variable);
    onSelect();
    
    if (isResizing) return; // Ne pas démarrer le drag si on redimensionne
    
    setIsDragging(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startFieldX = field.x;
    const startFieldY = field.y;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      const deltaX = (e.clientX - startX) / scale;
      const deltaY = (e.clientY - startY) / scale;
      
      const newX = Math.max(0, startFieldX + deltaX);
      const newY = Math.max(0, startFieldY + deltaY);
      
      onUpdate({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = field.width;
    const startHeight = field.height;

    const handleResizeMove = (e: MouseEvent) => {
      e.preventDefault();
      
      const deltaX = (e.clientX - startX) / scale;
      const deltaY = (e.clientY - startY) / scale;
      
      const newWidth = Math.max(20, startWidth + deltaX);
      const newHeight = Math.max(15, startHeight + deltaY);
      
      onUpdate({ width: newWidth, height: newHeight });
    };

    const handleResizeUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeUp);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeUp);
  };

  const getFieldIcon = () => {
    switch (field.type) {
      case 'text': return 'T';
      case 'date': return '📅';
      case 'number': return '#';
      case 'signature': return '✍️';
      case 'checkbox': return '☑️';
      case 'image': return '🖼️';
      default: return '?';
    }
  };

  return (
    <div
      ref={fieldRef}
      className={`absolute border-2 cursor-move select-none transition-all pointer-events-auto ${
        isSelected 
          ? 'border-blue-500 bg-blue-100/70 shadow-lg z-20' 
          : 'border-gray-400 bg-gray-100/50 hover:border-blue-400 z-10'
      } ${isDragging ? 'opacity-75 shadow-xl z-30' : ''}`}
      style={{
        left: position.left,
        top: position.top,
        width: field.width * scale,
        height: field.height * scale,
        minWidth: '40px',
        minHeight: '20px',
        userSelect: 'none',
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Contenu du champ */}
      <div className="flex items-center justify-start h-full text-xs font-medium text-gray-700 px-2 pointer-events-none">
        <span className="mr-1">{getFieldIcon()}</span>
        <span className="truncate">{field.variable || field.type}</span>
      </div>

      {/* Bouton de suppression */}
      {isSelected && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete();
          }}
          className="absolute -top-8 -right-2 bg-red-500 text-white hover:bg-red-600 text-xs px-2 py-1 shadow-lg z-10 pointer-events-auto"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}

      {/* Coin de redimensionnement */}
      {isSelected && (
        <div
          className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white cursor-se-resize pointer-events-auto"
          onMouseDown={handleResizeMouseDown}
        />
      )}
    </div>
  );
};