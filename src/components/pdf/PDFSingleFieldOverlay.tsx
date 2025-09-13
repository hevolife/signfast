@@ .. @@
-interface PDFFieldOverlayProps {
+interface PDFSingleFieldOverlayProps {
   field: PDFField;
   scale: number;
   isSelected: boolean;
   onSelect: (field: PDFField) => void;
   onUpdate: (field: PDFField) => void;
   onDelete: (fieldId: string) => void;
   currentPage: number;
   pdfViewerRef: React.RefObject<PDFViewerRef>;
 }

-export const PDFFieldOverlay: React.FC<PDFFieldOverlayProps> = ({
+export const PDFSingleFieldOverlay: React.FC<PDFSingleFieldOverlayProps> = ({