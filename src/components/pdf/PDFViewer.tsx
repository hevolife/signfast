import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '../ui/Button';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface PDFViewerProps {
  file: File | string | null;
  onPageClick?: (x: number, y: number, page: number) => void;
  children?: React.ReactNode;
  scale?: number;
  onScaleChange?: (scale: number) => void;
}

export interface PDFViewerRef {
  canvasRefs: React.MutableRefObject<(HTMLCanvasElement | null)[]>;
}

export const PDFViewer = forwardRef<PDFViewerRef, PDFViewerProps>(({
  file,
  onPageClick,
  children,
  scale = 1,
  onScaleChange,
}, ref) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const renderTasksRef = useRef<(any | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isRendering, setIsRendering] = useState(false);

  useImperativeHandle(ref, () => ({
    canvasRefs
  }), []);

  useEffect(() => {
    if (file) {
      loadPDF();
    }
    
    // Cleanup function to cancel all render tasks on unmount
    return () => {
      cancelAllRenderTasks();
    };
  }, [file]);

  useEffect(() => {
    if (pdfDoc && numPages > 0) {
      // Débounce le rendu pour améliorer les performances
      const timeoutId = setTimeout(() => {
        renderAllPages();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [pdfDoc, numPages, scale]);

  const cancelAllRenderTasks = () => {
    renderTasksRef.current.forEach((task, index) => {
      if (task) {
        task.cancel();
        renderTasksRef.current[index] = null;
      }
    });
  };

  const loadPDF = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      
      // Cancel any existing render tasks before loading new PDF
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
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      canvasRefs.current = new Array(pdf.numPages).fill(null);
      renderTasksRef.current = new Array(pdf.numPages).fill(null);
      setLoading(false);
    } catch (error) {
      console.error('Error loading PDF:', error);
      setError('Erreur lors du chargement du PDF');
      setLoading(false);
    }
  };

  const renderAllPages = async () => {
    if (!pdfDoc) return;
    if (isRendering) return; // Éviter les rendus multiples simultanés
    
    setIsRendering(true);

    // Cancel all existing render tasks before starting new ones
    cancelAllRenderTasks();
    
    // Rendu optimisé - une page à la fois
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const canvas = canvasRefs.current[pageNum - 1];
      if (!canvas) continue;

      try {
        // Cancel existing render task for this page if any
        const existingTask = renderTasksRef.current[pageNum - 1];
        if (existingTask) {
          existingTask.cancel();
          renderTasksRef.current[pageNum - 1] = null;
        }

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        
        const context = canvas.getContext('2d');
        if (!context) continue;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Optimisation: nettoyer le canvas avant le rendu
        context.clearRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTasksRef.current[pageNum - 1] = renderTask;
        
        await renderTask.promise;
        
        // Clear the render task reference once completed
        renderTasksRef.current[pageNum - 1] = null;
        
        // Petit délai entre les pages pour éviter de bloquer l'UI
        if (pageNum < numPages) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      } catch (error) {
        // Only log error if it's not a cancellation
        if (error.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNum}:`, error);
        }
        renderTasksRef.current[pageNum - 1] = null;
      }
    }
    
    setIsRendering(false);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPageClick) return;

    const canvas = event.currentTarget;
    const pageNumber = canvasRefs.current.findIndex(ref => ref === canvas) + 1;

    const rect = canvas.getBoundingClientRect();
    
    // Position relative au canvas (système top-left de l'éditeur)
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    
    console.log(`🖱️ Clic sur canvas: position brute (${event.clientX - rect.left}, ${event.clientY - rect.top})`);
    console.log(`🖱️ Position avec scale: (${x}, ${y}), scale: ${scale}`);
    
    onPageClick(x, y, pageNumber);
  };

  const zoomIn = () => {
    const newScale = Math.min(scale + 0.2, 3);
    onScaleChange?.(newScale);
  };

  const zoomOut = () => {
    const newScale = Math.max(scale - 0.2, 0.5);
    onScaleChange?.(newScale);
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Barre d'outils */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="sm" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {numPages} page{numPages > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Conteneur PDF avec overlay */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-4 relative"
        style={{ 
          scrollBehavior: 'smooth',
          // Optimisations de performance
          willChange: 'scroll-position',
          transform: 'translateZ(0)', // Force hardware acceleration
        }}
      >
        <div className="flex flex-col items-center space-y-4">
          {Array.from({ length: numPages }, (_, index) => (
            <div key={index} className="relative">
              <div className="text-center mb-2">
                <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                  Page {index + 1}
                </span>
              </div>
              
              {(loading || isRendering) && (
                <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 z-10 rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {loading ? 'Chargement du PDF...' : 'Rendu en cours...'}
                    </p>
                  </div>
                </div>
              )}
              
              <canvas
                ref={(el) => (canvasRefs.current[index] = el)}
                onClick={handleCanvasClick}
                className="border border-gray-300 dark:border-gray-600 shadow-lg cursor-crosshair bg-white"
                style={{
                  // Optimisations de performance
                  willChange: 'transform',
                  transform: 'translateZ(0)',
                }}
                data-page={index + 1}
                style={{ display: (loading || isRendering) ? 'none' : 'block' }}
              />
            </div>
          ))}
        </div>
        
        {/* Overlay des champs - positionné absolument dans le conteneur */}
        {!loading && !isRendering && children && (
          <div className="absolute inset-0 pointer-events-none">
            {children}
          </div>
        )}
      </div>
    </div>
  );
});