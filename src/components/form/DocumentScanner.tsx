import React, { useRef, useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { 
  Camera, 
  RotateCcw, 
  Check, 
  X, 
  Upload,
  RefreshCw,
  Maximize2,
  Download
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

export const DocumentScanner: React.FC<DocumentScannerProps> = ({
  onImageCapture,
  value,
  required = false,
  scanSettings = {}
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(value || null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  const settings = {
    outputFormat: scanSettings.outputFormat || 'jpeg',
    quality: scanSettings.quality || 0.85,
    maxWidth: scanSettings.maxWidth || 1600,
    maxHeight: scanSettings.maxHeight || 1200,
    showGuides: scanSettings.showGuides !== false,
    ...scanSettings
  };

  // Nettoyage automatique
  React.useEffect(() => {
    return () => {
      cleanupCamera();
    };
  }, []);

  const cleanupCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setCameraError(null);
      
      // Vérifier la disponibilité
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('API caméra non disponible');
      }

      // Nettoyer l'ancien flux
      cleanupCamera();

      // Contraintes simples et efficaces
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      // Obtenir le flux
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Vérifier que le flux est valide
      const videoTracks = mediaStream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error('Aucune piste vidéo disponible');
      }

      setStream(mediaStream);
      setIsScanning(true);
      
      // Attendre que le composant soit rendu
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Configurer la vidéo
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        
        // Attendre que la vidéo soit prête
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout: vidéo non prête'));
          }, 5000);
          
          const checkReady = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              clearTimeout(timeout);
              resolve();
            } else {
              setTimeout(checkReady, 100);
            }
          };
          
          video.onloadedmetadata = checkReady;
          video.oncanplay = checkReady;
          
          // Vérification immédiate
          checkReady();
        });
      }
      
      toast.success('📷 Caméra prête !');
      
    } catch (error: any) {
      console.error('❌ Erreur caméra:', error);
      
      let errorMessage = 'Erreur d\'accès à la caméra';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Accès caméra refusé. Cliquez sur "Autoriser" dans votre navigateur.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Aucune caméra trouvée. Vérifiez qu\'une caméra est connectée.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Caméra occupée. Fermez les autres applications utilisant la caméra.';
      } else if (error.message.includes('Timeout')) {
        errorMessage = 'Caméra trop lente. Essayez de recharger la page.';
      } else {
        errorMessage = `Erreur: ${error.message}`;
      }
      
      setCameraError(errorMessage);
      setIsScanning(false);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, cleanupCamera]);

  const stopCamera = useCallback(() => {
    cleanupCamera();
    setIsScanning(false);
    setIsLoading(false);
    setCameraError(null);
  }, [cleanupCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Caméra non disponible');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      toast.error('Erreur de capture');
      return;
    }

    // Vérifier que la vidéo a des dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Vidéo non prête, attendez quelques secondes');
      return;
    }

    try {
      // Configurer le canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Capturer l'image
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Optimiser l'image
      const optimizedImage = optimizeImage(canvas, settings);
      
      setCapturedImage(optimizedImage);
      onImageCapture(optimizedImage);
      stopCamera();
      
      toast.success('📷 Document scanné !');
    } catch (error) {
      console.error('Erreur capture:', error);
      toast.error('Erreur lors de la capture');
    }
  }, [settings, onImageCapture, stopCamera]);

  const optimizeImage = (canvas: HTMLCanvasElement, settings: any): string => {
    const { maxWidth, maxHeight, outputFormat, quality } = settings;
    
    // Calculer les nouvelles dimensions
    const { width: newWidth, height: newHeight } = calculateDimensions(
      canvas.width, 
      canvas.height, 
      maxWidth, 
      maxHeight
    );
    
    // Créer un nouveau canvas optimisé
    const optimizedCanvas = document.createElement('canvas');
    const ctx = optimizedCanvas.getContext('2d')!;
    
    optimizedCanvas.width = newWidth;
    optimizedCanvas.height = newHeight;
    
    // Configuration pour qualité maximale
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Fond blanc pour JPEG
    if (outputFormat === 'jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, newWidth, newHeight);
    }
    
    // Redimensionner l'image
    ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
    
    return optimizedCanvas.toDataURL(`image/${outputFormat}`, quality);
  };

  const calculateDimensions = (width: number, height: number, maxWidth: number, maxHeight: number) => {
    if (width <= maxWidth && height <= maxHeight) {
      return { width, height };
    }

    const aspectRatio = width / height;
    
    let newWidth = maxWidth;
    let newHeight = maxWidth / aspectRatio;
    
    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = maxHeight * aspectRatio;
    }
    
    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    };
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCapturedImage(result);
      onImageCapture(result);
      toast.success('📷 Image chargée !');
    };
    reader.readAsDataURL(file);
    
    event.target.value = '';
  }, [onImageCapture]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    if (isScanning) {
      stopCamera();
      setTimeout(() => startCamera(), 200);
    }
  }, [isScanning, stopCamera, startCamera]);

  const resetScan = useCallback(() => {
    setCapturedImage(null);
    onImageCapture('');
  }, [onImageCapture]);

  const retakePhoto = useCallback(() => {
    resetScan();
    startCamera();
  }, [resetScan, startCamera]);

  // Interface plein écran pour la caméra
  if (isScanning) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold">Scanner de Document</h3>
                <p className="text-sm text-white/80">Centrez votre document</p>
              </div>
            </div>
            <button
              type="button"
              onClick={stopCamera}
              className="text-white hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Zone vidéo */}
        <div className="flex-1 relative overflow-hidden">
          {/* Gestion des erreurs */}
          {cameraError && (
            <div className="absolute inset-0 bg-red-900/95 backdrop-blur-sm flex items-center justify-center z-30">
              <div className="text-center text-white p-6 max-w-sm">
                <div className="text-4xl mb-4">❌</div>
                <h3 className="text-lg font-bold mb-3">Erreur Caméra</h3>
                <p className="text-sm mb-4">{cameraError}</p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCameraError(null);
                      startCamera();
                    }}
                    className="w-full bg-white text-red-600 hover:bg-gray-100 font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    🔄 Réessayer
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="w-full text-white hover:bg-white/20 font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Indicateur de chargement */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
                <p className="font-medium">Activation de la caméra...</p>
                <p className="text-sm text-white/70 mt-1">Autorisez l'accès si demandé</p>
              </div>
            </div>
          )}
          
          {/* Vidéo */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          
          {/* Canvas caché */}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Guides de composition */}
          {settings.showGuides && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <svg className="w-full h-full">
                {/* Grille */}
                <defs>
                  <pattern id="grid" width="33.33%" height="33.33%" patternUnits="userSpaceOnUse">
                    <path d="M 33.33 0 L 0 0 0 33.33" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Cadre principal */}
                <rect 
                  x="10%" 
                  y="15%" 
                  width="80%" 
                  height="70%" 
                  fill="none" 
                  stroke="rgba(0,255,0,0.8)" 
                  strokeWidth="3" 
                  strokeDasharray="15,5"
                  rx="8"
                />
                
                {/* Coins */}
                <g stroke="rgba(0,255,0,1)" strokeWidth="4" fill="none">
                  <path d="M 12% 17% L 15% 17% L 15% 20%" />
                  <path d="M 88% 17% L 85% 17% L 85% 20%" />
                  <path d="M 12% 83% L 15% 83% L 15% 80%" />
                  <path d="M 88% 83% L 85% 83% L 85% 80%" />
                </g>
              </svg>
              
              {/* Instructions */}
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium">
                📄 Centrez votre document dans le cadre vert
              </div>
            </div>
          )}
        </div>

        {/* Contrôles en bas */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 to-transparent p-6">
          <div className="flex items-center justify-center space-x-6">
            {/* Changer caméra */}
            <button
              type="button"
              onClick={switchCamera}
              className="text-white hover:bg-white/20 rounded-full w-12 h-12 flex items-center justify-center transition-colors"
              disabled={isLoading}
            >
              <RotateCcw className="h-5 w-5" />
            </button>

            {/* Capture */}
            <button
              type="button"
              onClick={capturePhoto}
              disabled={isLoading}
              className="bg-white text-black hover:bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center shadow-2xl transition-all disabled:opacity-50"
            >
              <Camera className="h-6 w-6" />
            </button>

            {/* Galerie */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-white hover:bg-white/20 rounded-full w-12 h-12 flex items-center justify-center transition-colors"
            >
              <Upload className="h-5 w-5" />
            </button>
          </div>
          
          <div className="mt-4 text-center text-white/80 text-sm">
            Appuyez sur le bouton blanc pour capturer
          </div>
        </div>

        {/* Input file caché */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    );
  }

  // Interface normale
  return (
    <div className="space-y-4">
      {/* Image capturée */}
      {capturedImage ? (
        <div className="relative group">
          <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-emerald-200 dark:border-emerald-700 overflow-hidden shadow-lg">
            <img
              src={capturedImage}
              alt="Document scanné"
              className="w-full h-auto max-h-64 object-contain"
            />
            
            {/* Actions au survol */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={retakePhoto}
                  className="bg-white/90 text-gray-900 hover:bg-white px-3 py-2 rounded-lg shadow-lg transition-colors flex items-center space-x-1"
                >
                  <Camera className="h-4 w-4" />
                  <span>Reprendre</span>
                </button>
                <button
                  type="button"
                  onClick={resetScan}
                  className="bg-white/90 text-gray-900 hover:bg-white px-3 py-2 rounded-lg shadow-lg transition-colors flex items-center space-x-1"
                >
                  <X className="h-4 w-4" />
                  <span>Supprimer</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Informations */}
          <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300">
                <Check className="h-4 w-4" />
                <span className="font-medium text-sm">Document scanné</span>
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">
                {Math.round(capturedImage.length / 1024)} KB • {settings.outputFormat.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Interface de démarrage */
        <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-600 rounded-xl p-6 text-center bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
          <div className="space-y-4">
            {/* Icône */}
            <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <Camera className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            
            {/* Titre */}
            <div>
              <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-300 mb-2">
                Scanner un document
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                Utilisez votre caméra pour numériser un document en haute qualité
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={startCamera}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Démarrage...</span>
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    <span>Scanner un document</span>
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="border border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-medium px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>Ou choisir une image</span>
              </button>
            </div>
            
            {/* Fonctionnalités */}
            <div className="grid grid-cols-3 gap-3 mt-6 text-xs text-emerald-600 dark:text-emerald-400">
              <div className="text-center">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-1">
                  <span className="text-emerald-600 dark:text-emerald-400">🎯</span>
                </div>
                <span>Guides auto</span>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-1">
                  <span className="text-emerald-600 dark:text-emerald-400">✨</span>
                </div>
                <span>Haute qualité</span>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-1">
                  <span className="text-emerald-600 dark:text-emerald-400">⚡</span>
                </div>
                <span>Rapide</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      {/* Message d'obligation */}
      {required && !capturedImage && (
        <p className="text-sm text-red-600 font-medium">
          ⚠️ Le scan de document est obligatoire
        </p>
      )}
    </div>
  );
};