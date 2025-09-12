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
  const [isMobile, setIsMobile] = useState(false);
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
  const getAbsolutePosition = () => {
    // Hauteur approximative d'une page (sera ajustée dynamiquement)
    const pageHeight = 800; // Hauteur de base d'une page
    const pageSpacing = 32; // Espacement entre les pages (space-y-4 = 16px * 2)
    
    // Position Y absolue = position Y sur la page + (numéro de page - 1) * (hauteur page + espacement)
    const absoluteY = field.y + (field.page - 1) * (pageHeight * scale + pageSpacing);
    
    if (isMobile) {
      return {
        left: field.x * scale * 0.8,
        top: absoluteY * 0.8,
        width: field.width * scale * 0.8,
        height: field.height * scale * 0.8,
      };
    }
    
    return {
      left: field.x * scale,
      top: absoluteY,
      width: field.width * scale,
      height: field.height * scale,
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
    
    const handleMouseMove = (e: MouseEvent) => {
      // Ajuster le calcul selon l'appareil
      const scaleAdjustment = isMobile ? scale * 0.8 : scale;
      const deltaX = (e.clientX - startX) / scaleAdjustment;
      const deltaY = (e.clientY - startY) / scaleAdjustment;
      
      // Calculer la nouvelle position Y relative à la page
      const pageHeight = 800;
      const pageSpacing = 32;
      const absoluteY = startFieldY + deltaY + (field.page - 1) * (pageHeight + pageSpacing / scale);
      
      // Déterminer sur quelle page le champ devrait être
      const newPage = Math.max(1, Math.floor(absoluteY / pageHeight) + 1);
      const relativeY = absoluteY - (newPage - 1) * pageHeight;
      
      const newX = startFieldX + deltaX;
      
      onUpdate({ 
        x: Math.max(0, newX), 
        y: Math.max(0, relativeY),
        page: newPage
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Gestion tactile pour mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isResizing) return;
    
    onSelect();

    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    const startFieldX = field.x;
    const startFieldY = field.y;
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const scaleAdjustment = scale * 0.8; // Ajustement pour mobile
      const deltaX = (touch.clientX - startX) / scaleAdjustment;
      const deltaY = (touch.clientY - startY) / scaleAdjustment;
      
      // Calculer la nouvelle position Y relative à la page
      const pageHeight = 800;
      const pageSpacing = 32;
      const absoluteY = startFieldY + deltaY + (field.page - 1) * (pageHeight + pageSpacing / scale);
      
      // Déterminer sur quelle page le champ devrait être
      const newPage = Math.max(1, Math.floor(absoluteY / pageHeight) + 1);
      const relativeY = absoluteY - (newPage - 1) * pageHeight;
      
      const newX = startFieldX + deltaX;
      
      onUpdate({ 
        x: Math.max(0, newX), 
        y: Math.max(0, relativeY),
        page: newPage
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