import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '../ui/Button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

interface PDFViewerProps {
  file: File | string | null;
  onPageClick?: (x: number, y: number, page: number, ratioX: number, ratioY: number) => void;
  children?: React.ReactNode;
  scale?: number;
  onScaleChange?: (scale: number) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export interface PDFViewerRef {
  canvasRefs: React.MutableRefObject<(HTMLCanvasElement | null)[]>;
  getPDFDimensions: (pageNumber: number) => { width: number; height: number } | null;
  getCanvasDimensions: (pageNumber: number) => { width: number; height: number } | null;
}

const PDFViewerComponent: React.ForwardRefRenderFunction<PDFViewerRef, PDFViewerProps> = ({
  file,
  onPageClick,
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
  const [isRendering, setIsRendering] = useState(false);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number }[]>([]);
  const renderTasksRef = useRef<(any | null)[]>([]);

  useImperativeHandle(ref, () => ({
    canvasRefs,
    getPDFDimensions: (pageNumber: number) => {
      const index = pageNumber - 1;
      return pdfDimensions[index] || null;
    },
    getCanvasDimensions: (pageNumber: number) => {
      const index = pageNumber - 1;
      const canvas = canvasRefs.current[index];
      if (!canvas) return null;
      return { width: canvas.width, height: canvas.height };
    }
  }), []);

  useEffect(() => {
    if (file) {
      loadPDF();
    }
    return () => {
      cancelAllRenderTasks();
    };
  }, [file]);

  useEffect(() => {
    if (pdfDoc && numPages > 0) {
      renderAllPages();
    }
  }, [pdfDoc, numPages, scale]);

  const cancelAllRenderTasks = () => {
    renderTasksRef.current.forEach((task, index) => {
      if (task) {
        try {
          task.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
        renderTasksRef.current[index] = null;
      }
    });
  };

  const loadPDF = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      console.log('📄 Chargement PDF...');
      
      cancelAllRenderTasks();
      
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
      
      // Charger les dimensions PDF en points pour chaque page
      const dimensions = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1 }); // Scale 1 = dimensions en points
        dimensions.push({ width: viewport.width, height: viewport.height });
        console.log(`📐 Page ${i} dimensions PDF: ${viewport.width} × ${viewport.height} points`);
      }
      setPdfDimensions(dimensions);
      
      renderTasksRef.current = new Array(pdf.numPages).fill(null);
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement PDF:', error);
      setError('Erreur lors du chargement du PDF');
      setLoading(false);
    }
  };

  const renderAllPages = async () => {
    if (!pdfDoc || isRendering) return;
    
    setIsRendering(true);
    cancelAllRenderTasks();
    
    console.log(`📄 Rendu de ${numPages} pages à l'échelle ${scale}`);
    
    try {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const canvas = canvasRefs.current[pageNum - 1];
        if (!canvas) {
          console.warn(`📄 Canvas manquant pour page ${pageNum}`);
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

        const renderTask = page.render(renderContext);
        renderTasksRef.current[pageNum - 1] = renderTask;
        
        await renderTask.promise;
        renderTasksRef.current[pageNum - 1] = null;
        
        console.log(`📄 Page ${pageNum} rendue`);
      }
    } catch (error) {
      if (error.name !== 'RenderingCancelledException') {
        console.error('Erreur rendu:', error);
      }
    } finally {
      setIsRendering(false);
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPageClick) return;

    const canvas = event.currentTarget;
    const pageNumber = canvasRefs.current.findIndex(ref => ref === canvas) + 1;
    const pageIndex = pageNumber - 1;
    
    if (onPageChange && pageNumber !== currentPage) {
      onPageChange(pageNumber);
    }

    const rect = canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    
    // Calculer les ratios par rapport au canvas affiché
    const ratioX = canvasX / rect.width;
    const ratioY = canvasY / rect.height;
    
    // Coordonnées dans l'espace PDF (pour l'éditeur)
    const x = canvasX / scale;
    const y = canvasY / scale;
    
    console.log(`🖱️ Clic page ${pageNumber}:`);
    console.log(`🖱️ Canvas: (${Math.round(canvasX)}, ${Math.round(canvasY)})`);
    console.log(`🖱️ Ratios: (${ratioX.toFixed(3)}, ${ratioY.toFixed(3)})`);
    console.log(`🖱️ Éditeur: (${Math.round(x)}, ${Math.round(y)})`);
    
    onPageClick(x, y, pageNumber, ratioX, ratioY);
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
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
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
            <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[80px] text-center">
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

      </div>

      {/* Conteneur PDF */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-4 relative">
        <div className="flex flex-col items-center space-y-4">
          {Array.from({ length: numPages }, (_, index) => (
            <div key={index} className="relative">
              <div className={`text-center mb-2 ${currentPage === index + 1 ? 'font-bold text-blue-600' : ''}`}>
                <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                  Page {index + 1}
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
                className={`border shadow-lg cursor-crosshair bg-white ${
                  currentPage === index + 1 
                    ? 'border-blue-500 border-2 shadow-blue-200' 
                    : 'border-gray-300 dark:border-gray-600'
                } hover:shadow-xl transition-shadow`}
                data-page={index + 1}
              />
            </div>
          ))}
        </div>
        
        {/* Overlay des champs */}
        {children && (
          <div className="absolute inset-0 pointer-events-none" style={{ top: '60px', left: '16px', zIndex: 20 }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export const PDFViewer = forwardRef<PDFViewerRef, PDFViewerProps>(PDFViewerComponent);