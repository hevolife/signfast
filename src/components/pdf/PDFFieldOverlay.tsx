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
    // Obtenir la hauteur réelle du canvas de la page
    const canvas = document.querySelector(`canvas:nth-child(${field.page * 2 - 1})`) as HTMLCanvasElement;
    const pageHeight = canvas ? canvas.height / scale : 800;
    const pageSpacing = 32; // Espacement entre les pages
    
    // Calculer l'offset total des pages précédentes
    let totalOffset = 0;
    for (let i = 1; i < field.page; i++) {
      const prevCanvas = document.querySelector(`canvas:nth-child(${i * 2 - 1})`) as HTMLCanvasElement;
      if (prevCanvas) {
        totalOffset += prevCanvas.height + pageSpacing;
      } else {
        totalOffset += pageHeight * scale + pageSpacing;
      }
    }
    
    // Position Y absolue = position Y sur la page + offset des pages précédentes
    const absoluteY = field.y * scale + totalOffset;
    
    if (isMobile) {
      return {
        left: field.x * scale * 0.8,
        top: absoluteY * 0.8 + 60, // Ajouter offset pour la barre d'outils
        width: field.width * scale * 0.8,
        height: field.height * scale * 0.8,
      };
    }
    
    return {
      left: field.x * scale,
      top: absoluteY + 60, // Ajouter offset pour la barre d'outils
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
      
      // Calculer la nouvelle position absolue
      const container = document.querySelector('.overflow-auto');
      if (!container) return;
      
      const scrollTop = container.scrollTop;
      const mouseY = e.clientY + scrollTop - 60; // Ajuster pour la barre d'outils
      
      // Trouver sur quelle page on se trouve
      let currentPageOffset = 0;
      let targetPage = 1;
      
      for (let i = 1; i <= 10; i++) { // Max 10 pages pour éviter les boucles infinies
        const canvas = document.querySelector(`canvas:nth-child(${i * 2 - 1})`) as HTMLCanvasElement;
        if (!canvas) break;
        
        const pageHeight = canvas.height;
        const pageSpacing = 32;
        
        if (mouseY >= currentPageOffset && mouseY <= currentPageOffset + pageHeight) {
          targetPage = i;
          break;
        }
        
        currentPageOffset += pageHeight + pageSpacing;
        targetPage = i + 1;
      }
      
      // Calculer la position relative à la page cible
      let pageStartOffset = 0;
      for (let i = 1; i < targetPage; i++) {
        const canvas = document.querySelector(`canvas:nth-child(${i * 2 - 1})`) as HTMLCanvasElement;
        if (canvas) {
          pageStartOffset += canvas.height + 32;
        }
      }
      
      const relativeY = (mouseY - pageStartOffset) / scale;
      const newX = startFieldX + deltaX;
      
      onUpdate({ 
        x: Math.max(0, newX), 
        y: Math.max(0, relativeY),
        page: targetPage
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
      
      // Calculer la nouvelle position absolue pour mobile
      const container = document.querySelector('.overflow-auto');
      if (!container) return;
      
      const scrollTop = container.scrollTop;
      const touchY = touch.clientY + scrollTop - 60;
      
      // Trouver sur quelle page on se trouve
      let currentPageOffset = 0;
      let targetPage = 1;
      
      for (let i = 1; i <= 10; i++) {
        const canvas = document.querySelector(`canvas:nth-child(${i * 2 - 1})`) as HTMLCanvasElement;
        if (!canvas) break;
        
        const pageHeight = canvas.height;
        const pageSpacing = 32;
        
        if (touchY >= currentPageOffset && touchY <= currentPageOffset + pageHeight) {
          targetPage = i;
          break;
        }
        
        currentPageOffset += pageHeight + pageSpacing;
        targetPage = i + 1;
      }
      
      // Calculer la position relative à la page cible
      let pageStartOffset = 0;
      for (let i = 1; i < targetPage; i++) {
        const canvas = document.querySelector(`canvas:nth-child(${i * 2 - 1})`) as HTMLCanvasElement;
        if (canvas) {
          pageStartOffset += canvas.height + 32;
        }
      }
      
      const relativeY = (touchY - pageStartOffset) / scale;
      const newX = startFieldX + deltaX;
      
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