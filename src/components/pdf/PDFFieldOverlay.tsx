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
  canvasRefs: React.RefObject<(HTMLCanvasElement | null)[]>;
}

export const PDFFieldOverlay: React.FC<PDFFieldOverlayProps> = ({
  field,
  scale,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  canvasRefs,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: field.x, y: field.y });
  const fieldRef = useRef<HTMLDivElement>(null);

  // Calculer la position du champ par rapport au canvas de sa page
  const getFieldPosition = () => {
    if (!canvasRefs.current || !canvasRefs.current[field.page - 1]) {
      return { left: 0, top: 0 };
    }

    const canvas = canvasRefs.current[field.page - 1];
    if (!canvas) {
      return { left: 0, top: 0 };
    }

    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = canvas.closest('.overflow-auto')?.getBoundingClientRect();
    
    if (!containerRect) {
      return { left: 0, top: 0 };
    }
    const currentX = isDragging ? dragPosition.x : field.x;
    const currentY = isDragging ? dragPosition.y : field.y;
    
    const left = canvasRect.left - containerRect.left + (currentX * scale);
    const top = canvasRect.top - containerRect.top + (currentY * scale);
    const left = canvasRect.left - containerRect.left + (field.x * scale);
    const top = canvasRect.top - containerRect.top + (field.y * scale);

    // Add drag offset for smooth dragging
    return { 
      left: left + (isDragging ? dragOffset.x : 0), 
      top: top + (isDragging ? dragOffset.y : 0) 
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    setIsDragging(true);
    setDragPosition({ x: field.x, y: field.y });

    const startX = e.clientX;
    const startY = e.clientY;
    const startFieldX = field.x;
    const startFieldY = field.y;
    
    setDragOffset({ x: 0, y: 0 });

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - startX) / scale;
      const deltaY = (e.clientY - startY) / scale;
      
      // Update drag offset for immediate visual feedback
      const newX = Math.max(0, startFieldX + deltaX);
      const newY = Math.max(0, startFieldY + deltaY);
      
      // Throttle actual position updates
      // Mise à jour immédiate de la position visuelle
      setDragPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      // Appliquer la position finale une seule fois
      onUpdate({ 
        x: dragPosition.x, 
        y: dragPosition.y
      });
      
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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

  const position = getFieldPosition();

  const style = {
    position: 'absolute' as const,
    left: position.left,
    top: position.top,
    width: field.width * scale,
    height: field.height * scale,
    minWidth: '40px',
    minHeight: '20px',
    zIndex: isSelected ? 1000 : 500,
    pointerEvents: 'auto' as const,
    transform: isDragging ? 'scale(1.05)' : 'scale(1)',
    transition: isDragging ? 'none' : 'transform 0.1s ease',
  };

  return (
    <div
      ref={fieldRef}
      className={`border-2 cursor-move select-none transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-100/70' 
          : 'border-gray-400 bg-gray-100/50 hover:border-blue-400'
      } ${isDragging ? 'opacity-75' : ''}`}
      style={style}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Contenu du champ */}
      <div className="flex items-center justify-center h-full text-xs font-medium text-gray-700 px-1">
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
            onDelete();
          }}
          className="absolute -top-8 -right-2 bg-red-500 text-white hover:bg-red-600 text-xs px-2 py-1 shadow-lg"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};