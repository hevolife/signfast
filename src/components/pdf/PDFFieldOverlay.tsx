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
}

export const PDFFieldOverlay: React.FC<PDFFieldOverlayProps> = ({
  field,
  scale,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fieldRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    console.log('🖱️ MouseDown sur champ:', field.variable);
    e.stopPropagation();
    e.preventDefault();
    
    onSelect();
    setIsDragging(true);
    
    // Enregistrer la position de départ
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });

    const startFieldX = field.x;
    const startFieldY = field.y;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      // Calculer le déplacement
      const deltaX = (e.clientX - dragStart.x) / scale;
      const deltaY = (e.clientY - dragStart.y) / scale;
      
      // Nouvelle position
      const newX = Math.max(0, startFieldX + deltaX);
      const newY = Math.max(0, startFieldY + deltaY);
      
      console.log(`🖱️ Drag: delta(${deltaX.toFixed(1)}, ${deltaY.toFixed(1)}) -> position(${newX.toFixed(1)}, ${newY.toFixed(1)})`);
      
      // Mettre à jour immédiatement
      onUpdate({ x: newX, y: newY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      console.log('🖱️ MouseUp - fin du drag');
      e.preventDefault();
      e.stopPropagation();
      
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    // Attacher les événements au document pour capturer même si la souris sort du champ
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

  return (
    <div
      ref={fieldRef}
      className={`absolute border-2 cursor-move select-none transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-100/70 shadow-lg' 
          : 'border-gray-400 bg-gray-100/50 hover:border-blue-400'
      } ${isDragging ? 'opacity-75 shadow-xl z-50' : 'z-10'}`}
      style={{
        left: field.x * scale,
        top: field.y * scale,
        width: field.width * scale,
        height: field.height * scale,
        minWidth: '40px',
        minHeight: '20px',
        pointerEvents: 'auto', // IMPORTANT: Permettre les interactions
        userSelect: 'none',
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Contenu du champ */}
      <div className="flex items-center justify-center h-full text-xs font-medium text-gray-700 px-1 pointer-events-none">
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
          className="absolute -top-8 -right-2 bg-red-500 text-white hover:bg-red-600 text-xs px-2 py-1 shadow-lg z-10"
          style={{ pointerEvents: 'auto' }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}

      {/* Indicateurs de redimensionnement */}
      {isSelected && (
        <>
          {/* Coin bas-droite pour redimensionner */}
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white cursor-se-resize"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              
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
                document.removeEventListener('mousemove', handleResizeMove);
                document.removeEventListener('mouseup', handleResizeUp);
              };

              document.addEventListener('mousemove', handleResizeMove);
              document.addEventListener('mouseup', handleResizeUp);
            }}
          />
        </>
      )}
    </div>
  );
};