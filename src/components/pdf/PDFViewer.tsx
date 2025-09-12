import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '../ui/Button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

interface PDFViewerProps {
  file: File | string | null;
  onPageClick?: (canvasX: number, canvasY: number, page: number) => void;
  onPDFLoaded?: (dimensions: { width: number; height: number }[]) => void;
  children?: React.ReactNode;
  scale?: number;
  onScaleChange?: (scale: number) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  draggedFieldType?: string | null;
}

export interface PDFViewerRef {
  getPDFDimensions: (pageNumber: number) => { width: number; height: number } | null;
  getCanvasDimensions: (pageNumber: number) => { width: number; height: number } | null;
  getCanvasElement: (pageNumber: number) => HTMLCanvasElement | null;
}

const PDFViewerComponent: React.ForwardRefRenderFunction<PDFViewerRef, PDFViewerProps> = ({
  file,
  onPageClick,
  onPDFLoaded,
  children,
  scale = 1,
  onScaleChange,
  currentPage = 1,
  onPageChange,
  draggedFieldType,
}, ref) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number }[]>([]);

  useImperativeHandle(ref, () => ({
    getPDFDimensions: (pageNumber: number) => {
      const index = pageNumber - 1;
      return pdfDimensions[index] || null;
    },
    getCanvasDimensions: (pageNumber: number) => {
      const canvas = canvasRefs.current.get(pageNumber);
      if (!canvas) {
        console.warn(`❌ Canvas non trouvé pour page ${pageNumber}`);
        return null;
      }
      console.log(`📐 Canvas page ${pageNumber} dimensions:`, { width: canvas.width, height: canvas.height });
      return { width: canvas.width, height: canvas.height };
    },
    getCanvasElement: (pageNumber: number) => {
      return canvasRefs.current.get(pageNumber) || null;
    }
  }), [pdfDimensions]);

  useEffect(() => {
    if (file) {
      loadPDF();
    }
  }, [file]);

  useEffect(() => {
    if (pdfDoc && numPages > 0) {
      renderAllPages();
    }
  }, [pdfDoc, numPages, scale]);

  const loadPDF = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      console.log('📄 Chargement PDF...');
      
      const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default;

      let pdfData;
      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        pdfData = new Uint8Array(arrayBuffer);
      } else {
        pdfData = file;
      }

      const pdf = await pdfjsLib.getDocument(pdfData).promise;
      console.log(`📄 PDF chargé: ${pdf.numPages} pages`);
      
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      canvasRefs.current.clear();
      
      // Charger les dimensions PDF réelles
      const dimensions = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        dimensions.push({ width: viewport.width, height: viewport.height });
        console.log(`📐 Page ${i} dimensions PDF: ${viewport.width} × ${viewport.height} points`);
      }
      setPdfDimensions(dimensions);
      
      onPDFLoaded?.(dimensions);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement PDF:', error);
      setError('Erreur lors du chargement du PDF');
      setLoading(false);
    }
  };

  const renderAllPages = async () => {
    if (!pdfDoc) return;
    
    console.log(`📄 Rendu de ${numPages} pages à l'échelle ${scale}`);
    
    try {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const canvas = canvasRefs.current.get(pageNum);
        if (!canvas) {
          console.warn(`❌ Canvas non trouvé pour page ${pageNum}`);
          continue;
        }

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        
        const context = canvas.getContext('2d');
        if (!context) continue;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        context.clearRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        console.log(`📄 Page ${pageNum} rendue (${canvas.width}×${canvas.height})`);
      }
    } catch (error) {
      console.error('Erreur rendu:', error);
    }
  };

  const handleCanvasClick = (pageNumber: number) => (event: React.MouseEvent<HTMLCanvasElement>) => {
    console.log('🖱️ === CLIC CANVAS ===');
    console.log('🖱️ Page cliquée (depuis closure):', pageNumber);
    console.log('🖱️ Page courante:', currentPage);
    
    if (!onPageClick) return;

    const canvas = event.currentTarget;
    
    // Changer de page si nécessaire
    if (onPageChange && pageNumber !== currentPage) {
      console.log('🖱️ Changement de page:', currentPage, '→', pageNumber);
      onPageChange(pageNumber);
    }

    // Calculer les coordonnées
    const rect = canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    
    const realCanvasWidth = canvas.width;
    const realCanvasHeight = canvas.height;
    
    const scaleX = realCanvasWidth / rect.width;
    const scaleY = realCanvasHeight / rect.height;
    
    const adjustedX = canvasX * scaleX;
    const adjustedY = canvasY * scaleY;
    
    console.log(`🖱️ Page ${pageNumber} - Clic: (${canvasX.toFixed(1)}, ${canvasY.toFixed(1)}) → (${adjustedX.toFixed(1)}, ${adjustedY.toFixed(1)})`);
    
    // IMPORTANT: Utiliser pageNumber de la closure, pas currentPage
    onPageClick(adjustedX, adjustedY, pageNumber);
  };

  const zoomIn = () => {
    const newScale = Math.min(scale + 0.2, 3);
    onScaleChange?.(newScale);
  };

  const zoomOut = () => {
    const newScale = Math.max(scale - 0.2, 0.5);
    onScaleChange?.(newScale);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      onPageChange?.(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < numPages) {
      onPageChange?.(currentPage + 1);
    }
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">
          Chargez un fichier PDF pour commencer
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <Button onClick={() => loadPDF()} variant="secondary" size="sm">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Barre d'outils */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 min-h-[60px]">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[80px] text-center font-mono">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="sm" onClick={zoomIn} disabled={scale >= 3}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {numPages > 1 && (
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[100px] text-center font-mono">
              Page {currentPage} / {numPages}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToNextPage}
              disabled={currentPage >= numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="text-xs text-gray-500 font-medium">
          {draggedFieldType ? `Mode placement: ${draggedFieldType} - Page ${currentPage}` : 'Cliquez pour placer un champ'}
        </div>
      </div>

      {/* Conteneur PDF */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-6 relative">
        <div className="flex flex-col items-center space-y-6">
          {Array.from({ length: numPages }, (_, index) => {
            const pageNumber = index + 1;
            return (
              <div key={pageNumber} className="relative">
                <div className={`text-center mb-3 ${currentPage === pageNumber ? 'font-bold text-blue-600' : ''}`}>
                  <span className={`text-xs px-3 py-1 rounded ${
                    currentPage === pageNumber 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    Page {pageNumber}
                    {pdfDimensions[index] && (
                      <span className="ml-2 text-gray-500">
                        ({Math.round(pdfDimensions[index].width)} × {Math.round(pdfDimensions[index].height)} pts)
                      </span>
                    )}
                    {draggedFieldType && currentPage === pageNumber && (
                      <span className="ml-2 text-blue-600 font-bold">← Cliquez ici pour placer</span>
                    )}
                  </span>
                </div>
                
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 z-10 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Chargement...
                      </p>
                    </div>
                  </div>
                )}
                
                <canvas
                  ref={(el) => {
                    if (el) {
                      canvasRefs.current.set(pageNumber, el);
                      console.log(`📄 Canvas ref enregistré pour page ${pageNumber}`);
                    }
                  }}
                  onClick={handleCanvasClick(pageNumber)}
                  className={`border shadow-xl cursor-crosshair bg-white max-w-none transition-all ${
                    currentPage === pageNumber 
                      ? 'border-blue-500 border-4 shadow-blue-200 ring-2 ring-blue-300' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                  } ${draggedFieldType && currentPage === pageNumber ? 'ring-4 ring-blue-400 border-blue-600' : ''}`}
                  style={{ 
                    minWidth: '600px',
                    minHeight: '800px'
                  }}
                  data-page={pageNumber}
                />
              </div>
            );
          })}
        </div>
        
        {/* Overlay des champs */}
        {children && (
          <div className="absolute inset-0 pointer-events-none" style={{ top: '70px', left: '24px', zIndex: 20 }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export const PDFViewer = forwardRef<PDFViewerRef, PDFViewerProps>(PDFViewerComponent);