import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

interface PDFViewerProps {
  file: File | string | null;
  onPageClick?: (x: number, y: number, page: number) => void;
  children?: React.ReactNode | ((containerRef: React.RefObject<HTMLDivElement>, pageOffsets: Array<{top: number, left: number}>) => React.ReactNode);
  scale?: number;
  onScaleChange?: (scale: number) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  file,
  onPageClick,
  children,
  scale = 1,
  onScaleChange,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRootRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [pageOffsets, setPageOffsets] = useState<Array<{top: number, left: number}>>([]);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  useEffect(() => {
    if (file) {
      loadPDF();
    }
  }, [file]);

  useEffect(() => {
    if (pdfDoc && numPages > 0) {
      renderAllPages();
      calculatePageOffsets();
    }
  }, [pdfDoc, numPages, scale]);

  const loadPDF = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      
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
      // Initialiser les refs pour toutes les pages
      canvasRefs.current = new Array(pdf.numPages).fill(null);
      pageRefs.current = new Array(pdf.numPages).fill(null);
      setLoading(false);
    } catch (error) {
      console.error('Error loading PDF:', error);
      setError('Erreur lors du chargement du PDF');
      setLoading(false);
    }
  };

  const calculatePageOffsets = () => {
    if (!viewerRootRef.current || loading) return;
    
    const offsets: Array<{top: number, left: number}> = [];
    pageRefs.current.forEach((pageRef, index) => {
      if (pageRef && viewerRootRef.current) {
        const pageRect = pageRef.getBoundingClientRect();
        const viewerRect = viewerRootRef.current.getBoundingClientRect();
        offsets.push({
          top: pageRect.top - viewerRect.top + (containerRef.current?.scrollTop || 0),
          left: pageRect.left - viewerRect.left + (containerRef.current?.scrollLeft || 0)
        });
      } else {
        offsets.push({ top: 0, left: 0 });
      }
    });
    setPageOffsets(offsets);
  };

  useEffect(() => {
    if (!loading && numPages > 0) {
      // Délai pour s'assurer que le DOM est mis à jour
      const timer = setTimeout(calculatePageOffsets, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, numPages, scale]);

  const renderAllPages = async () => {
    if (!pdfDoc) return;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const canvas = canvasRefs.current[pageNum - 1];
      if (!canvas) continue;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (error) {
        console.error(`Error rendering page ${pageNum}:`, error);
      }
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPageClick) return;

    // Déterminer quelle page a été cliquée
    const canvas = event.currentTarget;
    const pageNumber = canvasRefs.current.findIndex(ref => ref === canvas) + 1;

    const rect = event.currentTarget.getBoundingClientRect();
    
    // Détecter si on est sur mobile
    const isMobile = window.innerWidth < 768;
    const scaleAdjustment = isMobile ? scale * 0.8 : scale;
    
    const x = (event.clientX - rect.left) / scaleAdjustment;
    const y = (event.clientY - rect.top) / scaleAdjustment;
    
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
    <div ref={viewerRootRef} className="flex flex-col h-full overflow-hidden">
      {/* Barre d'outils */}
      <div className="flex items-center justify-between p-2 sm:p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button variant="ghost" size="sm" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="sm" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2">
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {numPages} page{numPages > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Visualiseur PDF */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-2 sm:p-4"
        id="pdf-container"
      >
        <div className="flex flex-col items-center space-y-4 min-w-0">
          {Array.from({ length: numPages }, (_, index) => (
            <div 
              key={index} 
              ref={(el) => (pageRefs.current[index] = el)}
              className="relative" 
              data-page={index + 1}
            >
              <div className="text-center mb-2">
                <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                  Page {index + 1}
                </span>
              </div>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 z-10 rounded-lg p-4">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Chargement du PDF...</p>
                  </div>
                </div>
              )}
              
              <canvas
                ref={(el) => (canvasRefs.current[index] = el)}
                onClick={handleCanvasClick}
                className="border border-gray-300 dark:border-gray-600 shadow-lg cursor-crosshair bg-white max-w-full h-auto"
                data-page={index + 1}
                style={{ display: loading ? 'none' : 'block' }}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Overlay des champs - positionné de manière absolue par rapport à la page */}
      {/* Overlay des champs - positionné à l'intérieur du conteneur de scroll */}
      {!loading && !error && numPages > 0 && children && containerRef.current && (
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ 
            zIndex: 1000,
            top: '60px', // Offset pour la barre d'outils
            left: '0',
            right: '0',
            bottom: '0'
          }}
        >
          {typeof children === 'function' ? children(containerRef, pageOffsets) : children}
        </div>
      )}
    </div>
  );
};