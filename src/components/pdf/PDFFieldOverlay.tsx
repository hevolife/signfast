import React, { useState, useEffect } from 'react';
import { PDFField } from '../../types/pdf';
import { Button } from '../ui/Button';
import { Trash2 } from 'lucide-react';

+interface PDFFieldOverlayProps {
+  field: PDFField;
interface PDFFieldOverlayProps {
  field: PDFField;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<PDFField>) => void;
  onDelete: () => void;
}

export const PDFFieldOverlay: React.FC<PDFFieldOverlayProps> = ({
  field,
  scale,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}) => {
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [isMobile, setIsMobile] = useState(false);

  // Détecter mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculer la position du champ
  useEffect(() => {
    const updatePosition = () => {
      console.log(`🎯 Calcul position pour champ ${field.variable} page ${field.page}`);
      
      // Trouver le canvas de la page
      const pageCanvas = document.querySelector(`canvas[data-page="${field.page}"]`) as HTMLCanvasElement;
      if (!pageCanvas) {
        console.warn(`🎯 Canvas page ${field.page} non trouvé`);
        return;
      }

      // Obtenir la position du canvas
      const canvasRect = pageCanvas.getBoundingClientRect();
      const pdfContainer = document.querySelector('#pdf-container') as HTMLElement;
      
      if (!pdfContainer) {
        console.warn('🎯 Conteneur PDF non trouvé');
        return;
      }

      // Position relative au conteneur avec scroll
      const left = canvasRect.left + pdfContainer.scrollLeft + (field.x * scale);
      const top = canvasRect.top + pdfContainer.scrollTop + (field.y * scale);
      const width = field.width * scale;
      const height = field.height * scale;

      const newPosition = { left, top, width, height };
      console.log(`🎯 Position calculée:`, newPosition);
      setPosition(newPosition);
    };

    // Calculer immédiatement
    updatePosition();

    // Recalculer quand la fenêtre change ou qu'on scroll
    const handleUpdate = () => {
      requestAnimationFrame(updatePosition);
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    
    // Observer les changements du DOM pour les canvas
    const observer = new MutationObserver(handleUpdate);
    const pdfContainer = document.querySelector('#pdf-container');
    if (pdfContainer) {
      observer.observe(pdfContainer, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
      observer.disconnect();
    };
  }, [field.x, field.y, field.width, field.height, field.page, scale]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();

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

  return (
    <div
      className={`absolute border-2 cursor-move ${
        isSelected 
          ? 'border-blue-500 bg-blue-100/50' 
          : 'border-gray-400 bg-gray-100/30 hover:border-blue-400'
      } touch-manipulation`}
      style={{
        left: position.left,
        top: position.top,
        width: position.width,
        height: position.height,
        minWidth: isMobile ? '40px' : '60px',
        minHeight: isMobile ? '20px' : '30px',
        zIndex: isSelected ? 1000 : 500,
      }}
      onMouseDown={handleMouseDown}
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

      {/* Actions pour champ sélectionné */}
      {isSelected && (
        <div className={`absolute ${isMobile ? '-top-6' : '-top-8'} left-0 flex space-x-1`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} p-0 bg-red-500 text-white hover:bg-red-600`}
          >
            <Trash2 className={`${isMobile ? 'h-2 w-2' : 'h-3 w-3'}`} />
          </Button>
        </div>
      )}
    </div>
  );
};
