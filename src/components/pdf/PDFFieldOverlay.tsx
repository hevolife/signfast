import React, { useState } from 'react';
import { PDFField } from '../../types/pdf';
import { PDFViewerRef } from './PDFViewer';

interface PDFFieldOverlayProps {
  field: PDFField;
  scale: number;
  isSelected: boolean;
  onSelect: (field: PDFField) => void;
  onUpdate: (field: PDFField) => void;
  onDelete: (fieldId: string) => void;
  currentPage: number;
  pdfViewerRef: React.RefObject<PDFViewerRef>;
}

export const PDFFieldOverlay: React.FC<PDFFieldOverlayProps> = ({
  field,
  scale,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  currentPage,
  pdfViewerRef
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [tempPosition, setTempPosition] = useState<{ x: number; y: number } | null>(null);

  // Calculer la position d'affichage depuis les ratios
  const getDisplayPosition = () => {
    if (!pdfViewerRef.current) return { x: 0, y: 0, width: 100, height: 25 };

    const canvasDimensions = pdfViewerRef.current.getCanvasDimensions(currentPage);
    if (!canvasDimensions) return { x: 0, y: 0, width: 100, height: 25 };

    const x = (field.xRatio || 0) * canvasDimensions.width;
    const y = (field.yRatio || 0) * canvasDimensions.height;
    const width = (field.widthRatio || 0.1) * canvasDimensions.width;
    const height = (field.heightRatio || 0.05) * canvasDimensions.height;

    return { x, y, width, height };
  };

  // Afficher seulement si sur la page courante
  if (field.page !== currentPage) {
    return null;
  }

  // Utiliser une variable pour capturer la position finale
  let finalPosition = tempPosition;

  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignorer si on clique sur les boutons de contrôle
    if ((e.target as HTMLElement).closest('.delete-button') || 
        (e.target as HTMLElement).closest('.resize-handle')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    onSelect(field);
    setIsDragging(true);
    
    const canvas = pdfViewerRef.current?.getCanvasElement(currentPage);
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const currentPos = getDisplayPosition();
    
    // Calculer l'offset entre la souris et le coin du champ
    const mouseCanvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseCanvasY = (e.clientY - rect.top) * (canvas.height / rect.height);
    const offsetX = mouseCanvasX - currentPos.x;
    const offsetY = mouseCanvasY - currentPos.y;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      
      // Position de la souris en coordonnées canvas
      const mouseCanvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
      const mouseCanvasY = (e.clientY - rect.top) * (canvas.height / rect.height);
      
      // Position du champ (souris - offset)
      const newX = mouseCanvasX - offsetX;
      const newY = mouseCanvasY - offsetY;
      
      // Contraindre dans les limites
      const fieldWidth = (field.widthRatio || 0.1) * canvas.width;
      const fieldHeight = (field.heightRatio || 0.05) * canvas.height;
      
      const constrainedX = Math.max(0, Math.min(canvas.width - fieldWidth, newX));
      const constrainedY = Math.max(0, Math.min(canvas.height - fieldHeight, newY));
      
      // Mettre à jour la position temporaire pour un affichage fluide
      setTempPosition({ x: constrainedX, y: constrainedY });
    };

    const handleMouseUp = () => {
      // Nettoyer l'état
      setIsDragging(false);
      setTempPosition(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Mettre à jour définitivement le champ avec les nouveaux ratios
      if (finalPosition && pdfViewerRef.current) {
        const canvasDimensions = pdfViewerRef.current.getCanvasDimensions(currentPage);
        if (canvasDimensions) {
          const newXRatio = finalPosition.x / canvasDimensions.width;
          const newYRatio = finalPosition.y / canvasDimensions.height;
          
          console.log('🎯 Sauvegarde position finale:', {
            finalPosition,
            canvasDimensions,
            oldRatios: { xRatio: field.xRatio, yRatio: field.yRatio },
            newRatios: { xRatio: newXRatio, yRatio: newYRatio }
          });
          
          // Forcer la mise à jour avec les nouveaux ratios
          onUpdate({
            ...field,
            xRatio: newXRatio,
            yRatio: newYRatio
          });
        }
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const handleResizeStart = (e: React.MouseEvent, handle: 'se' | 's' | 'e') => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const currentPos = getDisplayPosition();
    const startWidth = currentPos.width;
    const startHeight = currentPos.height;
    
    const handleResizeMove = (e: MouseEvent) => {
      if (!pdfViewerRef.current) return;
      
      const canvas = pdfViewerRef.current.getCanvasElement(currentPage);
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const deltaX = (e.clientX - startX) * scaleX;
      const deltaY = (e.clientY - startY) * scaleY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      if (handle === 'se' || handle === 'e') {
        newWidth = Math.max(20, startWidth + deltaX);
      }
      
      if (handle === 'se' || handle === 's') {
        newHeight = Math.max(15, startHeight + deltaY);
      }
      
      // Contraintes par type
      const constraints = {
        checkbox: { minWidth: 15, maxWidth: 50, minHeight: 15, maxHeight: 50 },
        signature: { minWidth: 100, maxWidth: 400, minHeight: 40, maxHeight: 150 },
        image: { minWidth: 50, maxWidth: 400, minHeight: 50, maxHeight: 300 },
        default: { minWidth: 50, maxWidth: 400, minHeight: 20, maxHeight: 100 }
      };
      
      const constraint = constraints[field.type] || constraints.default;
      newWidth = Math.max(constraint.minWidth, Math.min(constraint.maxWidth, newWidth));
      newHeight = Math.max(constraint.minHeight, Math.min(constraint.maxHeight, newHeight));
      
      // Calculer les nouveaux ratios de taille
      const newWidthRatio = newWidth / canvas.width;
      const newHeightRatio = newHeight / canvas.height;
      
      onUpdate({
        ...field,
        widthRatio: newWidthRatio,
        heightRatio: newHeightRatio
      });
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    
    const cursor = handle === 'se' ? 'se-resize' : handle === 's' ? 's-resize' : 'e-resize';
    document.body.style.cursor = cursor;
    document.body.style.userSelect = 'none';
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete(field.id);
  };

  const getExampleText = (field: PDFField): string => {
    const variable = field.variable.toLowerCase();
    
    if (variable.includes('nom')) return 'Dupont';
    if (variable.includes('prenom')) return 'Jean';
    if (variable.includes('email')) return 'jean@email.com';
    if (variable.includes('telephone')) return '01 23 45 67 89';
    if (variable.includes('date')) return '15/03/2024';
    
    return field.placeholder || 'Exemple';
  };

  const renderFieldContent = () => {
    const fontSize = Math.max(8, (field.fontSize || 12) * scale * 0.8);
    
    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <div 
            className="truncate px-1 py-0.5 flex items-center"
            style={{ 
              fontSize: `${fontSize}px`,
              color: field.fontColor || '#000000',
              backgroundColor: field.backgroundColor || 'transparent'
            }}
          >
            {getExampleText(field)}
          </div>
        );
      
      case 'date':
        return (
          <div 
            className="truncate px-1 py-0.5 flex items-center"
            style={{ 
              fontSize: `${fontSize}px`,
              color: field.fontColor || '#000000'
            }}
          >
            15/03/2024
          </div>
        );
      
      case 'checkbox':
        const checkboxSize = Math.min(position.width - 4, position.height - 4);
        return (
          <div className="flex items-center justify-center h-full">
            <div 
              className="border border-gray-400 flex items-center justify-center bg-white"
              style={{ 
                width: `${checkboxSize}px`,
                height: `${checkboxSize}px`,
                fontSize: `${checkboxSize * 0.6}px`
            >
              ✓
            </div>
          </div>
        );
      
    if (tempPosition && pdfViewerRef.current) {
        return (
          <div className="flex items-center justify-center h-full text-gray-500 italic border-2 border-dashed border-gray-300 bg-gray-50">
        const newXRatio = tempPosition.x / canvasDimensions.width;
        const newYRatio = tempPosition.y / canvasDimensions.height;
        );
        console.log('🎯 Mise à jour ratios:', {
          tempPosition,
        return (
          <div className="flex items-center justify-center h-full text-gray-500 border-2 border-dashed border-gray-300 bg-gray-50">
            <span style={{ fontSize: `${fontSize}px` }}>📷 Image</span>
          </div>
        );
        // Mettre à jour les ratios
        onUpdate({
          <div className="truncate px-1 py-0.5 flex items-center">
            {getExampleText(field)}
          </div>
        );
    }
    
    // Nettoyer la position temporaire après la mise à jour
    setTempPosition(null);
  };

  // Utiliser la position temporaire pendant le drag, sinon la position calculée
  const position = tempPosition ? {
    ...tempPosition,
    width: getDisplayPosition().width,
    height: getDisplayPosition().height
  } : getDisplayPosition();

  return (
    <div
      className={`absolute select-none border-2 transition-colors rounded ${
        isSelected 
          ? 'border-blue-500 bg-blue-50/90 shadow-lg ring-2 ring-blue-300/50' 
          : 'border-gray-300 bg-white/90 hover:border-blue-300 hover:shadow-md'
      } ${
        isDragging
          ? 'opacity-70 cursor-grabbing z-50 shadow-2xl' 
          : isResizing
          ? 'z-50 shadow-xl'
          : 'cursor-grab hover:cursor-grab'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${position.width}px`,
        height: `${position.height}px`,
        zIndex: isSelected ? 30 : isDragging || isResizing ? 50 : 10,
        pointerEvents: 'auto'
      }}
      onMouseDown={handleMouseDown}
    >
      {renderFieldContent()}
      
      {/* Bouton supprimer */}
      {isSelected && (
        <button
          className="delete-button absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600 flex items-center justify-center shadow-lg border-2 border-white z-50"
          onClick={handleDeleteClick}
          title="Supprimer le champ"
        >
          ×
        </button>
      )}
      
      {/* Poignées de redimensionnement */}
      {isSelected && !isDragging && !isResizing && (
        <>
          <div 
            className="resize-handle absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 cursor-se-resize border border-white shadow-lg z-30 hover:bg-blue-600 transition-colors rounded-sm"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            title="Redimensionner"
          />
          <div 
            className="resize-handle absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-2 bg-blue-500 cursor-s-resize border border-white shadow-lg z-30 hover:bg-blue-600 transition-colors rounded-sm"
            onMouseDown={(e) => handleResizeStart(e, 's')}
            title="Redimensionner hauteur"
          />
          <div 
            className="resize-handle absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-3 bg-blue-500 cursor-e-resize border border-white shadow-lg z-30 hover:bg-blue-600 transition-colors rounded-sm"
            onMouseDown={(e) => handleResizeStart(e, 'e')}
            title="Redimensionner largeur"
          />
        </>
      )}
      
      {/* Indicateur de ratios */}
      {isSelected && (
        <div className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg z-30">
          ({(field.xRatio || 0).toFixed(3)}, {(field.yRatio || 0).toFixed(3)})
        </div>
      )}
    </div>
  );
};