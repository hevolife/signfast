import React from 'react';
import { PDFField } from '../../types/pdf';
import { PDFViewerRef } from './PDFViewer';
import { PDFSingleFieldOverlay } from './PDFSingleFieldOverlay';

interface PDFFieldOverlayProps {
  fields: PDFField[];
  selectedField: string | null;
  onFieldSelect: (fieldId: string) => void;
  onFieldUpdate: (id: string, updates: Partial<PDFField>) => void;
  currentPage: number;
  pdfViewerRef: React.RefObject<PDFViewerRef>;
  scale: number;
}

export const PDFFieldOverlay: React.FC<PDFFieldOverlayProps> = ({
  fields,
  selectedField,
  onFieldSelect,
  onFieldUpdate,
  currentPage,
  pdfViewerRef,
  scale,
}) => {
  const deleteField = (fieldId: string) => {
    // Cette fonction sera appelée depuis le parent
    console.log('Delete field called for:', fieldId);
  };

  return (
    <>
      {fields
        .filter(field => field.page === currentPage)
        .map(field => (
          <PDFSingleFieldOverlay
            key={field.id}
            field={field}
            scale={scale}
            isSelected={selectedField === field.id}
            onSelect={() => onFieldSelect(field.id)}
            onUpdate={(updatedField) => onFieldUpdate(field.id, updatedField)}
            onDelete={deleteField}
            currentPage={currentPage}
            pdfViewerRef={pdfViewerRef}
          />
        ))}
    </>
  );
};