import React, { useRef, useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { 
  Camera, 
  RotateCcw, 
  Check, 
  X, 
  Crop,
  ZoomIn,
  ZoomOut,
  Move,
  Square,
  Download,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DocumentScannerProps {
  onImageCapture: (imageData: string) => void;
  value?: string;
  required?: boolean;
  scanSettings?: {
    outputFormat?: 'jpeg' | 'png';
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    showGuides?: boolean;
    autoCapture?: boolean;
  };
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DocumentScanner: React.FC<DocumentScannerProps> = ({
  onImageCapture,
  value,
  required = false,
  scanSettings = {}
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(value || null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const settings = {
    outputFormat: 'jpeg',
    quality: 0.9,
    maxWidth: 1600,
    maxHeight: 1200,
    showGuides: true,
    autoCapture: false,
    ...scanSettings
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      
      // Vérifier si la caméra est disponible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Caméra non disponible sur cet appareil');
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setIsScanning(true);
      toast.success('Caméra activée');
    } catch (error: any) {
      console.error('Erreur accès caméra:', error);
      setCameraError(error.message);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.');
      } else if (error.name === 'NotFoundError') {
        toast.error('Aucune caméra trouvée sur cet appareil');
      } else {
        toast.error('Erreur d\'accès à la caméra');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
    setCameraError(null);
  };

  const switchCamera = async () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setTimeout(() => {
      startCamera();
    }, 500);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Définir les dimensions du canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dessiner l'image de la vidéo
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convertir en data URL
    const imageData = canvas.toDataURL(`image/${settings.outputFormat}`, settings.quality);
    setCapturedImage(imageData);
    
    // Initialiser la zone de recadrage (80% de l'image centrée)
    const margin = 0.1;
    setCropArea({
      x: canvas.width * margin,
      y: canvas.height * margin,
      width: canvas.width * (1 - 2 * margin),
      height: canvas.height * (1 - 2 * margin)
    });
    
    setIsCropping(true);
    stopCamera();
    toast.success('Photo capturée ! Ajustez le recadrage si nécessaire.');
  };

  const handleCropStart = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setIsDragging(true);
    setDragStart({ x, y });
    
    // Vérifier si on clique dans la zone de recadrage pour la déplacer
    if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
        y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      setDragStart({ 
        x: x - cropArea.x, 
        y: y - cropArea.y 
      });
    } else {
      // Nouveau recadrage
      setCropArea({ x, y, width: 0, height: 0 });
    }
  };

  const handleCropMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Si on déplace la zone existante
    if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
        y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      setCropArea(prev => ({
        ...prev,
        x: Math.max(0, Math.min(canvasRef.current!.width - prev.width, x - dragStart.x)),
        y: Math.max(0, Math.min(canvasRef.current!.height - prev.height, y - dragStart.y))
      }));
    } else {
      // Redimensionner la zone
      setCropArea(prev => ({
        x: Math.min(dragStart.x, x),
        y: Math.min(dragStart.y, y),
        width: Math.abs(x - dragStart.x),
        height: Math.abs(y - dragStart.y)
      }));
    }
  };

  const handleCropEnd = () => {
    setIsDragging(false);
  };

  const applyCrop = () => {
    if (!canvasRef.current || !cropCanvasRef.current || !capturedImage) return;

    const cropCanvas = cropCanvasRef.current;
    const ctx = cropCanvas.getContext('2d');
    if (!ctx) return;

    // Créer une image temporaire pour le recadrage
    const img = new Image();
    img.onload = () => {
      // Définir les dimensions du canvas de recadrage
      cropCanvas.width = cropArea.width;
      cropCanvas.height = cropArea.height;

      // Dessiner la partie recadrée
      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      );

      // Redimensionner si nécessaire
      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d')!;
      
      const { width: finalWidth, height: finalHeight } = calculateOptimalDimensions(
        cropArea.width,
        cropArea.height,
        settings.maxWidth,
        settings.maxHeight
      );
      
      finalCanvas.width = finalWidth;
      finalCanvas.height = finalHeight;
      
      // Configuration pour qualité maximale
      finalCtx.imageSmoothingEnabled = true;
      finalCtx.imageSmoothingQuality = 'high';
      
      // Fond blanc pour JPEG
      if (settings.outputFormat === 'jpeg') {
        finalCtx.fillStyle = '#FFFFFF';
        finalCtx.fillRect(0, 0, finalWidth, finalHeight);
      }
      
      finalCtx.drawImage(cropCanvas, 0, 0, finalWidth, finalHeight);
      
      const finalImageData = finalCanvas.toDataURL(`image/${settings.outputFormat}`, settings.quality);
      
      onImageCapture(finalImageData);
      setCapturedImage(finalImageData);
      setIsCropping(false);
      
      toast.success('Document scanné et recadré avec succès !');
    };
    
    img.src = capturedImage;
  };

  const calculateOptimalDimensions = (
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ) => {
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const aspectRatio = originalWidth / originalHeight;
    
    let width = maxWidth;
    let height = maxWidth / aspectRatio;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = maxHeight * aspectRatio;
    }
    
    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  };

  const resetScan = () => {
    setCapturedImage(null);
    setIsCropping(false);
    setCropArea({ x: 0, y: 0, width: 0, height: 0 });
    onImageCapture('');
  };

  const retakePhoto = () => {
    resetScan();
    startCamera();
  };

  const renderVideoGuides = () => {
    if (!settings.showGuides) return null;

    return (
      <div className="absolute inset-0 pointer-events-none">
        {/* Grille de guidage */}
        <svg className="w-full h-full">
          {/* Lignes de tiers */}
          <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="5,5" />
          <line x1="66.66%" y1="0" x2="66.66%" y2="100%" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="5,5" />
          <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="5,5" />
          <line x1="0" y1="66.66%" x2="100%" y2="66.66%" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="5,5" />
          
          {/* Cadre central pour document */}
          <rect 
            x="10%" 
            y="15%" 
            width="80%" 
            height="70%" 
            fill="none" 
            stroke="rgba(0,255,0,0.8)" 
            strokeWidth="3" 
            strokeDasharray="10,5"
            rx="8"
          />
          
          {/* Coins de guidage */}
          <g stroke="rgba(0,255,0,1)" strokeWidth="4" fill="none">
            <path d="M 12% 17% L 15% 17% L 15% 20%" />
            <path d="M 88% 17% L 85% 17% L 85% 20%" />
            <path d="M 12% 83% L 15% 83% L 15% 80%" />
            <path d="M 88% 83% L 85% 83% L 85% 80%" />
          </g>
        </svg>
        
        {/* Instructions flottantes */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium">
          📄 Centrez votre document dans le cadre vert
        </div>
        
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium">
          💡 Assurez-vous que le document est bien éclairé et net
        </div>
      </div>
    );
  };

  const renderCropOverlay = () => {
    if (!isCropping || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    return (
      <div className="absolute inset-0">
        {/* Overlay sombre */}
        <div className="absolute inset-0 bg-black/50"></div>
        
        {/* Zone de recadrage */}
        <div
          className="absolute border-2 border-blue-500 bg-transparent cursor-move"
          style={{
            left: `${cropArea.x * scaleX}px`,
            top: `${cropArea.y * scaleY}px`,
            width: `${cropArea.width * scaleX}px`,
            height: `${cropArea.height * scaleY}px`,
          }}
        >
          {/* Poignées de redimensionnement */}
          <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nw-resize"></div>
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-ne-resize"></div>
          <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-sw-resize"></div>
          <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-se-resize"></div>
          
          {/* Grille de recadrage */}
          <svg className="w-full h-full pointer-events-none">
            <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="rgba(59,130,246,0.8)" strokeWidth="1" />
            <line x1="66.66%" y1="0" x2="66.66%" y2="100%" stroke="rgba(59,130,246,0.8)" strokeWidth="1" />
            <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="rgba(59,130,246,0.8)" strokeWidth="1" />
            <line x1="0" y1="66.66%" x2="100%" y2="66.66%" stroke="rgba(59,130,246,0.8)" strokeWidth="1" />
          </svg>
        </div>
        
        {/* Instructions de recadrage */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
          ✂️ Ajustez la zone de recadrage • Cliquez et glissez
        </div>
      </div>
    );
  };

  if (capturedImage && !isCropping) {
    return (
      <div className="space-y-4">
        <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 p-4">
          <div className="text-center">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 mb-4">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                  <Check className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-bold text-green-900 dark:text-green-300">
                  Document scanné avec succès
                </span>
              </div>
              <img
                src={capturedImage}
                alt="Document scanné"
                className="max-w-full max-h-64 object-contain mx-auto border border-green-200 dark:border-green-700 rounded-lg shadow-lg"
              />
              <div className="flex items-center justify-center mt-3 text-xs text-green-700 dark:text-green-400">
                <span>📄 Taille: {Math.round(capturedImage.length / 1024)} KB</span>
                <span className="mx-2">•</span>
                <span>✅ Optimisé pour PDF</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={retakePhoto}
                className="flex items-center justify-center space-x-2 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
              >
                <Camera className="h-4 w-4" />
                <span>Reprendre</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsCropping(true);
                  // Réinitialiser la zone de recadrage
                  const canvas = canvasRef.current;
                  if (canvas) {
                    const margin = 0.1;
                    setCropArea({
                      x: canvas.width * margin,
                      y: canvas.height * margin,
                      width: canvas.width * (1 - 2 * margin),
                      height: canvas.height * (1 - 2 * margin)
                    });
                  }
                }}
                className="flex items-center justify-center space-x-2 bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300"
              >
                <Crop className="h-4 w-4" />
                <span>Recadrer</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={resetScan}
                className="flex items-center justify-center space-x-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Recommencer</span>
              </Button>
            </div>
          </div>
        </div>
        
        {required && !capturedImage && (
          <p className="text-sm text-red-600">
            Le scan de document est obligatoire
          </p>
        )}
      </div>
    );
  }

  if (isCropping && capturedImage) {
    return (
      <div className="space-y-4">
        <div className="border-2 border-blue-500 rounded-lg bg-white dark:bg-gray-800 p-4">
          <div className="text-center mb-4">
            <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
              ✂️ Recadrage du document
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Ajustez la zone de sélection pour ne garder que le document
            </p>
          </div>
          
          <div className="relative inline-block">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-96 border border-gray-300 rounded cursor-crosshair"
              onMouseDown={handleCropStart}
              onMouseMove={handleCropMove}
              onMouseUp={handleCropEnd}
              style={{ display: capturedImage ? 'block' : 'none' }}
            />
            <canvas ref={cropCanvasRef} className="hidden" />
            
            {renderCropOverlay()}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              type="button"
              onClick={applyCrop}
              className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
              disabled={cropArea.width === 0 || cropArea.height === 0}
            >
              <Check className="h-4 w-4" />
              <span>Valider le recadrage</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCropping(false)}
              className="flex items-center justify-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>Annuler</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={retakePhoto}
              className="flex items-center justify-center space-x-2 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
            >
              <Camera className="h-4 w-4" />
              <span>Reprendre photo</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 p-4">
        {!isScanning ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Camera className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Scanner un document
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Utilisez votre caméra pour scanner et numériser un document
            </p>
            
            {cameraError && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800 mb-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  ❌ {cameraError}
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <Button
                type="button"
                onClick={startCamera}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Camera className="h-5 w-5 mr-2" />
                Activer la caméra
              </Button>
              
              {/* Conseils d'utilisation */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 text-left">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  💡 Conseils pour un bon scan
                </h4>
                <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                  <div>📱 Tenez votre appareil stable et droit</div>
                  <div>💡 Assurez-vous d'avoir un bon éclairage</div>
                  <div>📄 Placez le document sur une surface plane</div>
                  <div>🎯 Utilisez les guides verts pour centrer</div>
                  <div>✂️ Vous pourrez recadrer après la capture</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="relative inline-block mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-w-full max-h-96 border border-gray-300 rounded-lg shadow-lg"
              />
              
              {renderVideoGuides()}
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                type="button"
                onClick={capturePhoto}
                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Camera className="h-5 w-5" />
                <span>Capturer</span>
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                onClick={switchCamera}
                className="flex items-center justify-center space-x-2 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
              >
                <RefreshCw className="h-4 w-4" />
                <span>{facingMode === 'user' ? 'Caméra arrière' : 'Caméra avant'}</span>
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                onClick={stopCamera}
                className="flex items-center justify-center space-x-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
              >
                <X className="h-4 w-4" />
                <span>Annuler</span>
              </Button>
            </div>
            
            {/* Informations techniques */}
            <div className="mt-4 text-xs text-gray-500 space-y-1">
              <div>📷 Caméra: {facingMode === 'user' ? 'Avant' : 'Arrière'}</div>
              <div>📐 Format de sortie: {settings.outputFormat.toUpperCase()}</div>
              <div>🎚️ Qualité: {Math.round(settings.quality * 100)}%</div>
            </div>
          </div>
        )}
      </div>
      
      {required && !capturedImage && (
        <p className="text-sm text-red-600">
          Le scan de document est obligatoire
        </p>
      )}
    </div>
  );
};