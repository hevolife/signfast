import React, { useState } from 'react';
import { PDFField } from '../../types/pdf';
import { Button } from '../ui/Button';
import { Trash2, Move, Settings } from 'lucide-react';

interface PDFFieldOverlayProps {
  field: PDFField;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<PDFField>) => void;
  onDelete: () => void;
  containerWidth?: number;
  containerHeight?: number;
}

export const PDFFieldOverlay: React.FC<PDFFieldOverlayProps> = ({
  field,
  scale,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  containerWidth,
  containerHeight,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculer la position absolue en tenant compte de toutes les pages
    // Trouver le conteneur de la page cible
    const pageContainer = document.querySelector(`[data-page="${field.page}"]`) as HTMLElement;
    if (!pageContainer) {
      return { left: 0, top: 0, width: 0, height: 0 };
    }
    
    // Trouver le canvas de cette page pour obtenir ses dimensions
    const canvas = pageContainer.querySelector('canvas') as HTMLCanvasElement;
    const canvasRect = canvas?.getBoundingClientRect();
    const pageOffsetX = containerRect.left - pdfContainerRect.left + (pdfContainer?.scrollLeft || 0);
    if (!canvasRect) {
      return { left: 0, top: 0, width: 0, height: 0 };
    }
    
    // Position relative au canvas
    const canvasOffsetX = canvasRect.left - pdfContainerRect.left + (pdfContainer?.scrollLeft || 0);
    const canvasOffsetY = canvasRect.top - pdfContainerRect.top + (pdfContainer?.scrollTop || 0);
    
    const scaleAdjustment = isMobile ? scale * 0.8 : scale;
    
    return {
      left: canvasOffsetX + field.x * scaleAdjustment,
      top: canvasOffsetY + field.y * scaleAdjustment,
      width: field.width * scaleAdjustment,
      height: field.height * scaleAdjustment,
    };
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isResizing) return;
    
    onSelect();

    const startX = e.clientX;
    const startY = e.clientY;
    const startFieldX = field.x;
    const startFieldY = field.y;
    const startPage = field.page;
      
      const newY = startFieldY + deltaY;
      
      // Déterminer la page en fonction de la position Y
      let targetPage = startPage;
      let relativeY = newY;
      
      // Si on dépasse vers le bas, passer à la page suivante
      if (newY > 600) {
        targetPage = Math.min(startPage + Math.floor(newY / 600), 10);
        relativeY = newY % 600;
      }
      // Si on remonte, revenir à la page précédente
      else if (newY < 0 && startPage > 1) {
        targetPage = Math.max(1, startPage - 1);
        relativeY = 600 + newY;
      }
      onUpdate({ 
        x: Math.max(0, newX), 
        y: Math.max(0, relativeY),
        page: targetPage
      });
    };

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const getFieldIcon = () => {
    switch (field.type) {
      case 'text': return 'T';
      case 'date': return '📅';
      case 'number': return '#';
      case 'signature': return '✍️';
      case 'checkbox': return '☐';
      case 'image': return '🖼️';
      default: return '?';
    }
  };

  const adjustedPosition = getAbsolutePosition();
    const startPage = field.page;

  return (
    <div
      className={`absolute border-2 cursor-move ${
        isSelected 
          ? 'border-blue-500 bg-blue-100/20' 
          : 'border-gray-400 bg-gray-100/20 hover:border-blue-400'
      } touch-manipulation`}
      style={{
        left: adjustedPosition.left,
        top: adjustedPosition.top,
        width: adjustedPosition.width,
        height: adjustedPosition.height,
        minWidth: isMobile ? '40px' : '60px',
        minHeight: isMobile ? '20px' : '30px',
        zIndex: isSelected ? 1000 : 500,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Contenu du champ */}
      <div className={`flex items-center justify-center h-full font-medium text-gray-700 ${
        isMobile ? 'text-xs' : 'text-xs'
      }`}>
        <span className="mr-1">{getFieldIcon()}</span>
        <span className="truncate">{field.variable || field.type}</span>
      </div>

      {/* Poignées de redimensionnement */}
      {isSelected && (
        <>
          {/* Boutons d'action */}
          <div className={`absolute ${isMobile ? '-top-6' : '-top-8'} left-0 flex space-x-1`}>
            <Button
              variant="ghost"
              size={isMobile ? "sm" : "sm"}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} p-0 bg-red-500 text-white hover:bg-red-600`}
            >
              <Trash2 className={`${isMobile ? 'h-2 w-2' : 'h-3 w-3'}`} />
            </Button>
          </div>

          {/* Poignées de redimensionnement */}
          <div
            className={`absolute -bottom-1 -right-1 bg-blue-500 cursor-se-resize ${
              isMobile ? 'w-2 h-2' : 'w-3 h-3'
            }`}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsResizing(true);
              const startX = e.clientX;
              const startY = e.clientY;
              const startWidth = field.width;
              const startHeight = field.height;

              const handleResize = (e: MouseEvent) => {
                const scaleAdjustment = isMobile ? scale * 0.8 : scale;
                const deltaX = (e.clientX - startX) / scaleAdjustment;
                const deltaY = (e.clientY - startY) / scaleAdjustment;
                
                onUpdate({
                  width: Math.max(isMobile ? 40 : 60, startWidth + deltaX),
                  height: Math.max(isMobile ? 20 : 30, startHeight + deltaY),
                });
              };

              const handleMouseUp = () => {
                setIsResizing(false);
                document.removeEventListener('mousemove', handleResize);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleResize);
              document.addEventListener('mouseup', handleMouseUp);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsResizing(true);
              const touch = e.touches[0];
              const startX = touch.clientX;
              const startY = touch.clientY;
              const startWidth = field.width;
              const startHeight = field.height;

              const handleTouchResize = (e: TouchEvent) => {
                e.preventDefault();
                const touch = e.touches[0];
                const scaleAdjustment = scale * 0.8;
                const deltaX = (touch.clientX - startX) / scaleAdjustment;
                const deltaY = (touch.clientY - startY) / scaleAdjustment;
                
                onUpdate({
                  width: Math.max(40, startWidth + deltaX),
                  height: Math.max(20, startHeight + deltaY),
                });
              };

              const handleTouchEnd = () => {
                setIsResizing(false);
                document.removeEventListener('touchmove', handleTouchResize);
                document.removeEventListener('touchend', handleTouchEnd);
              };

              document.addEventListener('touchmove', handleTouchResize, { passive: false });
              document.addEventListener('touchend', handleTouchEnd);
            }}
          />
        </>
      )}
    </div>
  );
};