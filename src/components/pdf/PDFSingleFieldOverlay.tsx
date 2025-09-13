import React, { useState, useRef, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { PDFField } from '../../types/pdf';
import { Button } from '../ui/Button';
import { Trash2, Move, Edit3 } from 'lucide-react';

export interface PDFViewerRef {
  xRatio: number;
  yRatio: number;
}

interface PDFSingleFieldOverlayProps {
  field: PDFField;
  scale: number;
  isSelected: boolean;
  onSelect: (field: PDFField) => void;
  onUpdate: (field: PDFField) => void;
  onDelete: (fieldId: string) => void;
  currentPage: number;
  pdfViewerRef: React.RefObject<PDFViewerRef>;
}

export const PDFSingleFieldOverlay: React.FC<PDFSingleFieldOverlayProps> = ({
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
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const fieldRef = useRef<HTMLDivElement>(null);

  // Ne pas afficher le champ si ce n'est pas la bonne page
  if (field.page !== currentPage) {
    return null;
  }

  const [{ isDraggingDnd }, drag] = useDrag({
    type: 'field',
    item: { field },
    collect: (monitor) => ({
      isDraggingDnd: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    if (fieldRef.current) {
      drag(fieldRef);
    }
  }, [drag]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('field-content')) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      onSelect(field);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !pdfViewerRef.current) return;

    const deltaX = (e.clientX - dragStart.x) / (scale * pdfViewerRef.current.xRatio);
    const deltaY = (e.clientY - dragStart.y) / (scale * pdfViewerRef.current.yRatio);

    const updatedField = {
      ...field,
      x: Math.max(0, field.x + deltaX),
      y: Math.max(0, field.y + deltaY),
    };

    onUpdate(updatedField);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart]);

  const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: field.width,
      height: field.height,
    });
  };

  const handleResizeMouseMove = (e: MouseEvent) => {
    if (!isResizing || !pdfViewerRef.current) return;

    const deltaX = (e.clientX - resizeStart.x) / (scale * pdfViewerRef.current.xRatio);
    const deltaY = (e.clientY - resizeStart.y) / (scale * pdfViewerRef.current.yRatio);

    const updatedField = {
      ...field,
      width: Math.max(20, resizeStart.width + deltaX),
      height: Math.max(20, resizeStart.height + deltaY),
    };

    onUpdate(updatedField);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, resizeStart]);

  const getFieldTypeColor = (type: string) => {
    switch (type) {
      case 'text': return 'border-blue-500 bg-blue-50';
      case 'signature': return 'border-green-500 bg-green-50';
      case 'date': return 'border-purple-500 bg-purple-50';
      case 'checkbox': return 'border-orange-500 bg-orange-50';
      case 'radio': return 'border-indigo-500 bg-indigo-50';
      case 'select': return 'border-teal-500 bg-teal-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  if (!pdfViewerRef.current) {
    return null;
  }

  const { xRatio, yRatio } = pdfViewerRef.current;

  return (
    <div
      ref={fieldRef}
      className={`absolute cursor-move border-2 ${getFieldTypeColor(field.type)} ${
        isSelected ? 'ring-2 ring-blue-400' : ''
      } ${isDraggingDnd ? 'opacity-50' : ''}`}
      style={{
        left: field.x * scale * xRatio,
        top: field.y * scale * yRatio,
        width: field.width * scale * xRatio,
        height: field.height * scale * yRatio,
        zIndex: isSelected ? 1000 : 100,
      }}
      onMouseDown={handleMouseDown}
      onClick={() => onSelect(field)}
    >
      <div className="field-content w-full h-full flex items-center justify-center text-xs font-medium text-gray-700">
        {field.label || field.type}
      </div>

      {isSelected && (
        <>
          {/* Boutons d'action */}
          <div className="absolute -top-8 left-0 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 bg-white shadow-md hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(field.id);
              }}
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </Button>
          </div>

          {/* Poignée de redimensionnement */}
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 cursor-se-resize rounded-full border-2 border-white shadow-md"
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
          />

          {/* Indicateur de type de champ */}
          <div className="absolute -top-6 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-md">
            {field.type}
          </div>
        </>
      )}
    </div>
  );
};