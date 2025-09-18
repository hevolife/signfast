import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '../ui/Button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface OptimizedPDFViewerProps {
  file: File | string | null;
  onPageClick?: (x: number, y: number, page: number) => void;
  onPDFLoaded?: (dimensions: { width: number; height: number }[]) => void;
  children?: React.ReactNode;
  scale?: number;
  onScaleChange?: (scale: number) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

export interface OptimizedPDFViewerRef {
  getPDFDimensions: (pageNumber: number) => { width: number; height: number } | null;
  getCanvasDimensions: (pageNumber: number) => { width: number; height: number } | null;
  getCanvasElement: (pageNumber: number) => HTMLCanvasElement | null;
}

const OptimizedPDFViewerComponent: React.ForwardRefRenderFunction<OptimizedPDFViewerRef, OptimizedPDFViewerProps> = ({
  file,
  onPageClick,
  onPDFLoaded,
  children,
  scale = 1,
  onScaleChange,
  currentPage = 1,
  onPageChange,
  className = '',
}, ref) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number }[]>([]);

  useImperativeHandle(ref, () => ({
    getPDFDimensions: (pageNumber: number) => {
      const index = pageNumber - 1;
      return pdfDimensions[index] || null;
    },
    getCanvasDimensions: (pageNumber: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return { width: canvas.width, height: canvas.height };
    },
    getCanvasElement: (pageNumber: number) => {
      return canvasRef.current;
    }
  }), [pdfDimensions]);

  useEffect(() => {
    if (file) {
      loadPDF();
    }
  }, [file]);

  useEffect(() => {
    if (pdfDoc && numPages > 0) {
      renderCurrentPage();
    }
  }, [pdfDoc, numPages, scale, currentPage]);

  const loadPDF = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      
      const pdfjsLib = await import('pdfjs-dist');
      const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default;

      let pdfData;
      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        pdfData = new Uint8Array(arrayBuffer);
      } else if (typeof file === 'string' && file.startsWith('data:application/pdf;base64,')) {
        const base64Data = file.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        pdfData = bytes;
      } else {
        throw new Error('Format de fichier non supporté');
      }

      const pdf = await pdfjsLib.getDocument(pdfData).promise;
      
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      
      // Charger les dimensions
      const dimensions = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        dimensions.push({ width: viewport.width, height: viewport.height });
      }
      setPdfDimensions(dimensions);
      onPDFLoaded?.(dimensions);
      
      setLoading(false);
    } catch (error: any) {
      console.error('❌ Erreur chargement PDF:', error);
      setError('Erreur lors du chargement du PDF');
      setLoading(false);
    }
  };

  const renderCurrentPage = async () => {
    if (!pdfDoc || !canvasRef.current) return;
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      
    } catch (error) {
      console.error('❌ Erreur rendu page:', error);
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPageClick || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Conversion coordonnées écran vers coordonnées canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;
    
    onPageClick(canvasX, canvasY, currentPage);
  };

  const zoomIn = () => {
    const newScale = Math.min(scale + 0.2, 3);
    onScaleChange?.(newScale);
  };

  const zoomOut = () => {
    const newScale = Math.max(scale - 0.2, 0.5);
    onScaleChange?.(newScale);
  };

  const resetZoom = () => {
    onScaleChange?.(1);
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📄</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Chargez un fichier PDF pour commencer
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => loadPDF()} variant="secondary" size="sm">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Barre d'outils optimisée */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
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
          <Button variant="ghost" size="sm" onClick={resetZoom}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {numPages > 1 && (
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onPageChange?.(currentPage - 1)}
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
              onClick={() => onPageChange?.(currentPage + 1)}
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

      {/* Conteneur PDF optimisé */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-6 relative">
        <div className="flex justify-center">
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 z-10 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Chargement PDF...
                  </p>
                </div>
              </div>
            )}
            
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="border shadow-xl cursor-crosshair bg-white max-w-none transition-all border-blue-300 hover:border-blue-500"
              style={{ 
                minWidth: '400px',
                minHeight: '600px'
              }}
            />
          </div>
        </div>
        
        {children && (
          <div className="absolute inset-0 pointer-events-none" style={{ top: '70px', left: '24px', zIndex: 20 }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export const OptimizedPDFViewer = forwardRef<OptimizedPDFViewerRef, OptimizedPDFViewerProps>(OptimizedPDFViewerComponent);