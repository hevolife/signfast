import React, { useState, useEffect, useRef } from 'react';
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
  containerRef: React.RefObject<HTMLDivElement>;
  pageOffset: { top: number; left: number };
}

export const PDFFieldOverlay: React.FC<PDFFieldOverlayProps> = ({
  field,
  scale,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  containerRef,
  pageOffset,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    setIsDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startFieldX = field.x;
    const startFieldY = field.y;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - startX) / scale;
      const deltaY = (e.clientY - startY) / scale;
      
      onUpdate({ 
        x: Math.max(0, startFieldX + deltaX), 
        y: Math.max(0, startFieldY + deltaY)
      });
    };

    const handleMouseUp = () => {
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

  // Position directe basée sur les coordonnées du champ
  const style = {
    position: 'absolute' as const,
    left: pageOffset.left + (field.x * scale),
    top: pageOffset.top + (field.y * scale),
    width: field.width * scale,
    height: field.height * scale,
    minWidth: '40px',
    minHeight: '20px',
    zIndex: isSelected ? 1000 : 500,
    pointerEvents: 'auto' as const,
  };

  return (
    <div
      ref={fieldRef}
      className={`border-2 cursor-move select-none ${
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

      {/* Bouton de suppression pour champ sélectionné */}
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