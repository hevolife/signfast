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
}, ref) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number }[]>([]);

  useImperativeHandle(ref, () => ({
    getPDFDimensions: (pageNumber: number) => {
      const index = pageNumber - 1;
      return pdfDimensions[index] || null;
    },
    getCanvasDimensions: (pageNumber: number) => {
      const index = pageNumber - 1;
      const canvas = canvasRefs.current[index];
      if (!canvas) return null;
      // Retourner les dimensions réelles du canvas, pas celles affichées
      return { width: canvas.width, height: canvas.height };
    },
    getCanvasElement: (pageNumber: number) => {
      const index = pageNumber - 1;
      return canvasRefs.current[index];
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

  // Forcer un re-render quand les dimensions changent
  useEffect(() => {
    if (pdfDoc && numPages > 0) {
      // Délai pour s'assurer que les canvas sont prêts
      setTimeout(() => {
        console.log('📄 Force re-render de toutes les pages');
        renderAllPages();
      }, 100);
    }
  }, [scale]);
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
      canvasRefs.current = new Array(pdf.numPages).fill(null);
      
      // Charger les dimensions PDF réelles en points pour chaque page
      const dimensions = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1 }); // Scale 1 = dimensions réelles en points
        dimensions.push({ width: viewport.width, height: viewport.height });
        console.log(`📐 Page ${i} dimensions PDF: ${viewport.width} × ${viewport.height} points`);
      }
      setPdfDimensions(dimensions);
      
      // Notifier le parent que le PDF est chargé avec ses dimensions
      onPDFLoaded?.(dimensions);
      
      setLoading(false);
      
      // Forcer un re-render après chargement complet
      setTimeout(() => {
        console.log('📄 Force re-render après chargement complet');
        renderAllPages();
      }, 100);
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
        const canvas = canvasRefs.current[pageNum - 1];
        if (!canvas) continue;

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

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPageClick) return;

    const canvas = event.currentTarget;
    // Récupérer le numéro de page depuis l'attribut data-page
    const pageNumber = parseInt(canvas.getAttribute('data-page') || '1');
    
    console.log('🖱️ Canvas cliqué, page détectée:', pageNumber);
    
    if (onPageChange && pageNumber !== currentPage) {
      console.log('🖱️ Changement de page:', currentPage, '→', pageNumber);
      onPageChange(pageNumber);
    }

    // Utiliser les dimensions réelles du canvas pour calculer les coordonnées
    const rect = canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    
    // Utiliser les dimensions réelles du canvas (pas du rect)
    const realCanvasWidth = canvas.width;
    const realCanvasHeight = canvas.height;
    
    // Ajuster les coordonnées selon le ratio d'affichage
    const scaleX = realCanvasWidth / rect.width;
    const scaleY = realCanvasHeight / rect.height;
    
    const adjustedX = canvasX * scaleX;
    const adjustedY = canvasY * scaleY;
    
    console.log(`🖱️ Page ${pageNumber} - Clic: (${canvasX.toFixed(1)}, ${canvasY.toFixed(1)}) → (${adjustedX.toFixed(1)}, ${adjustedY.toFixed(1)})`);
    
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
          Cliquez pour placer un champ
        </div>
      </div>

      {/* Conteneur PDF */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-6 relative">
        <div className="flex flex-col items-center space-y-6">
          {Array.from({ length: numPages }, (_, index) => (
            <div key={index} className="relative">
              <div className={`text-center mb-3 ${currentPage === index + 1 ? 'font-bold text-blue-600' : ''}`}>
                <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                  Page {index + 1}
                  {pdfDimensions[index] && (
                    <span className="ml-2 text-gray-500">
                      ({Math.round(pdfDimensions[index].width)} × {Math.round(pdfDimensions[index].height)} pts)
                    </span>
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
                  canvasRefs.current[index] = el;
                }}
                onClick={handleCanvasClick}
                className={`border shadow-xl cursor-crosshair bg-white max-w-none ${
                  currentPage === index + 1 
                    ? 'border-blue-500 border-2 shadow-blue-200' 
                    : 'border-gray-300 dark:border-gray-600'
                } hover:shadow-2xl transition-shadow`}
                style={{ 
                  minWidth: '600px',
                  minHeight: '800px'
                }}
                data-page={index + 1}
              />
            </div>
          ))}
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