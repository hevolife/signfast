import React, { useRef, useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { 
  Camera, 
  RotateCcw, 
  Check, 
  X, 
  Crop,
  RefreshCw,
  Download,
  Upload
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
  const [videoReady, setVideoReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  const settings = {
    outputFormat: scanSettings.outputFormat || 'jpeg',
    quality: scanSettings.quality || 0.9,
    maxWidth: scanSettings.maxWidth || 1920,
    maxHeight: scanSettings.maxHeight || 1080,
    showGuides: scanSettings.showGuides !== false,
    autoCapture: scanSettings.autoCapture || false,
    ...scanSettings
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      console.log('📷 Demande d\'accès caméra optimisée...');
      
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      let mediaStream: MediaStream;
      
      try {
        // Configuration rapide et directe
        console.log('📷 Demande d\'accès caméra optimisée...');
        
        // Essai direct avec contraintes optimisées
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('📷 ✅ Flux obtenu:', mediaStream.getVideoTracks().length, 'pistes');
      } catch (constraintError) {
        console.warn('📷 ⚠️ Contraintes optimisées échouées, fallback:', constraintError);
        
        try {
          // Fallback simple et rapide
          mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: facingMode }, 
            audio: false 
          });
          console.log('📷 ✅ Flux obtenu avec fallback');
        } catch (fallbackError) {
          console.error('📷 ❌ Échec total accès caméra:', fallbackError);
          throw fallbackError;
        }
      }

      setStream(mediaStream);
      
      if (videoRef.current) {
        console.log('📷 Configuration élément vidéo optimisée...');
        const video = videoRef.current;
        video.srcObject = mediaStream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        
        // Démarrage immédiat avec timeout de sécurité
        setTimeout(() => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            console.log('📷 ✅ Vidéo prête immédiatement');
            setVideoReady(true);
            setCameraError(null);
          } else {
            // Vérification périodique rapide
            let attempts = 0;
            const maxAttempts = 10; // 5 secondes max
            
            const checkInterval = setInterval(() => {
              attempts++;
              
              if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
                console.log('📷 ✅ Vidéo prête après', attempts * 500, 'ms');
                setVideoReady(true);
                setCameraError(null);
                clearInterval(checkInterval);
              } else if (attempts >= maxAttempts) {
                console.warn('📷 ⚠️ Timeout détection vidéo');
                setCameraError('Caméra lente à démarrer. Réessayez ou changez de caméra.');
                clearInterval(checkInterval);
              }
            }, 500);
          }
        }, 100); // Délai initial très court
      }
      
      setIsScanning(true);
      toast.success('📷 Caméra activée');
    } catch (error: any) {
      console.error('❌ Erreur accès caméra:', error);
      
      let errorMessage = 'Erreur d\'accès à la caméra';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Accès caméra refusé. Autorisez l\'accès dans votre navigateur.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Aucune caméra trouvée sur cet appareil';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Caméra occupée par une autre application';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Contraintes caméra non supportées par cet appareil';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Accès caméra bloqué pour des raisons de sécurité';
      } else {
        errorMessage = `Erreur caméra: ${error.message}`;
      }
      
      setCameraError(errorMessage);
      toast.error(`❌ ${errorMessage}`);
    }
  };

  const stopCamera = () => {
    console.log('📷 Arrêt caméra...');
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('📷 Track arrêté:', track.kind, track.label);
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setVideoReady(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !videoReady) {
      toast.error('❌ Caméra non prête');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      toast.error('❌ Impossible de créer le contexte canvas');
      return;
    }

    console.log('📷 Capture photo...', {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight
    });

    // Utiliser les dimensions réelles de la vidéo
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    // Dessiner l'image de la vidéo
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convertir en image
    const imageData = canvas.toDataURL(`image/${settings.outputFormat}`, settings.quality);
    console.log('📷 ✅ Image capturée:', Math.round(imageData.length / 1024), 'KB');
    
    // Redimensionner si nécessaire
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d')!;
    
    const { width: finalWidth, height: finalHeight } = calculateOptimalDimensions(
      canvas.width,
      canvas.height,
      settings.maxWidth,
      settings.maxHeight
    );
    
    finalCanvas.width = finalWidth;
    finalCanvas.height = finalHeight;
    
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    
    // Fond blanc pour JPEG
    if (settings.outputFormat === 'jpeg') {
      finalCtx.fillStyle = '#FFFFFF';
      finalCtx.fillRect(0, 0, finalWidth, finalHeight);
    }
    
    finalCtx.drawImage(canvas, 0, 0, finalWidth, finalHeight);
    
    const finalImageData = finalCanvas.toDataURL(`image/${settings.outputFormat}`, settings.quality);
    
    onImageCapture(finalImageData);
    setCapturedImage(finalImageData);
    stopCamera();
    toast.success('📷 Document scanné avec succès !');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('❌ Veuillez sélectionner une image');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCapturedImage(result);
      
      onImageCapture(result);
      toast.success('📷 Image chargée avec succès !');
    };
    reader.readAsDataURL(file);
    
    // Reset input
    event.target.value = '';
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
    onImageCapture('');
  };

  const retakePhoto = () => {
    resetScan();
    startCamera();
  };

  const renderVideoGuides = () => {
    if (!settings.showGuides) return null;

    return (
      <div className="absolute inset-0 pointer-events-none z-10">
        {/* Grille de composition */}
        <svg className="w-full h-full">
          <defs>
            <pattern id="grid" width="33.33%" height="33.33%" patternUnits="userSpaceOnUse">
              <path d="M 33.33 0 L 0 0 0 33.33" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Cadre de guidage principal */}
          <rect 
            x="10%" 
            y="15%" 
            width="80%" 
            height="70%" 
            fill="none" 
            stroke="rgba(0,255,0,0.8)" 
            strokeWidth="3" 
            strokeDasharray="15,5"
            rx="12"
          />
          
          {/* Coins du cadre */}
          <g stroke="rgba(0,255,0,1)" strokeWidth="4" fill="none">
            <path d="M 12% 17% L 15% 17% L 15% 20%" />
            <path d="M 88% 17% L 85% 17% L 85% 20%" />
            <path d="M 12% 83% L 15% 83% L 15% 80%" />
            <path d="M 88% 83% L 85% 83% L 85% 80%" />
          </g>
        </svg>
        
        {/* Instructions flottantes */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white px-6 py-3 rounded-xl text-sm font-medium shadow-xl">
          📄 Centrez votre document dans le cadre vert
        </div>
        
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white px-6 py-3 rounded-xl text-sm font-medium shadow-xl">
          💡 Éclairage uniforme • Document à plat • Caméra stable
        </div>
      </div>
    );
  };

  // Interface plein écran pour la caméra
  if (isScanning) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Header plein écran */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4 sm:p-6">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                <Camera className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Scanner de Document</h3>
                <p className="text-sm text-white/80">Mode plein écran • Haute qualité</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={stopCamera}
              className="text-white hover:bg-white/20 rounded-full w-12 h-12 p-0 shadow-lg"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Zone vidéo principale */}
        <div className="flex-1 relative overflow-hidden">
          {/* Gestion des erreurs */}
          {cameraError && (
            <div className="absolute inset-0 bg-red-900/90 backdrop-blur-sm flex items-center justify-center z-30">
              <div className="text-center text-white p-8 max-w-md">
                <div className="text-6xl mb-6">❌</div>
                <h3 className="text-xl font-bold mb-4">Erreur d'accès caméra</h3>
                <p className="text-sm mb-6 leading-relaxed">{cameraError}</p>
                <div className="space-y-3">
                  <div className="bg-red-800/50 p-3 rounded-lg text-xs text-left space-y-2">
                    <p><strong>Solutions possibles :</strong></p>
                    <p>• Autorisez l'accès caméra dans votre navigateur</p>
                    <p>• Fermez les autres applications utilisant la caméra</p>
                    <p>• Rechargez la page et réessayez</p>
                    <p>• Utilisez un autre navigateur (Chrome recommandé)</p>
                  </div>
                  <Button
                    onClick={() => {
                      setCameraError(null);
                      setVideoReady(false);
                      startCamera();
                    }}
                    className="w-full bg-white text-red-600 hover:bg-gray-100 font-bold py-3"
                  >
                    🔄 Réessayer l'accès caméra
                  </Button>
                  <Button
                    onClick={stopCamera}
                    variant="ghost"
                    className="w-full text-white hover:bg-white/20 font-bold py-3"
                  >
                    ❌ Annuler
                  </Button>
                </div>
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
          
          {/* Canvas caché pour capture */}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Guides de composition */}
          {renderVideoGuides()}
          
          {/* Indicateur de statut */}
          {!videoReady && !cameraError && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
                <p className="text-lg font-medium">Initialisation de la caméra...</p>
                <p className="text-sm text-white/70 mt-2">Veuillez patienter quelques secondes</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls en bas */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 to-transparent p-6">
          <div className="flex items-center justify-center space-x-6">
            {/* Bouton changement de caméra */}
            <Button
              variant="ghost"
              onClick={() => {
                setFacingMode(facingMode === 'user' ? 'environment' : 'user');
                stopCamera();
                setTimeout(startCamera, 100);
              }}
              className="text-white hover:bg-white/20 rounded-full w-14 h-14 p-0 shadow-lg"
              disabled={!videoReady}
            >
              <RotateCcw className="h-6 w-6" />
            </Button>

            {/* Bouton capture principal */}
            <Button
              onClick={capturePhoto}
              disabled={!videoReady}
              className="bg-white text-black hover:bg-gray-100 rounded-full w-20 h-20 p-0 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="h-8 w-8" />
            </Button>

            {/* Bouton galerie */}
            <Button
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className="text-white hover:bg-white/20 rounded-full w-14 h-14 p-0 shadow-lg"
            >
              <Upload className="h-6 w-6" />
            </Button>
          </div>
          
          {/* Conseils rapides */}
          <div className="mt-4 text-center text-white/80 text-sm">
            <p>Appuyez sur le bouton blanc pour capturer • Utilisez les guides verts</p>
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

  // Interface normale (non-scanning)
  return (
    <div className="space-y-4">
      {/* Image capturée */}
      {capturedImage ? (
        <div className="relative">
          <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
            <img
              src={capturedImage}
              alt="Document scanné"
              className="w-full h-auto max-h-96 object-contain"
            />
            
            {/* Overlay avec actions */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
              <div className="flex space-x-3">
                <Button
                  onClick={retakePhoto}
                  variant="secondary"
                  className="bg-white/90 text-gray-900 hover:bg-white shadow-lg"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Reprendre
                </Button>
                <Button
                  onClick={resetScan}
                  variant="secondary"
                  className="bg-white/90 text-gray-900 hover:bg-white shadow-lg"
                >
                  <X className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
          
          {/* Informations sur l'image */}
          <div className="mt-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300">
                <Check className="h-5 w-5" />
                <span className="font-medium">Document scanné avec succès</span>
              </div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400">
                Format: {settings.outputFormat.toUpperCase()} • Qualité: {Math.round(settings.quality * 100)}%
              </div>
            </div>
            
            {/* Conseils d'optimisation */}
            <div className="mt-3 space-y-2 text-sm text-emerald-600 dark:text-emerald-400">
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300 mb-3 text-center">
                ✅ Conseils pour un scan optimal
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <span>💡</span>
                  <span>Éclairage uniforme</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📄</span>
                  <span>Document posé à plat</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🎯</span>
                  <span>Guides verts pour centrer</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>✂️</span>
                  <span>Recadrage après capture</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🔄</span>
                  <span>Changement de caméra</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Interface de démarrage */
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <div className="space-y-6">
            {/* Icône principale */}
            <div className="mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Camera className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            
            {/* Titre et description */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Scanner un document
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                Utilisez votre caméra pour scanner un document en haute qualité avec guides automatiques et optimisation intelligente.
              </p>
            </div>
            
            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={startCamera}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Camera className="h-5 w-5 mr-2" />
                Ouvrir la caméra
              </Button>
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium px-6 py-3 rounded-lg transition-all duration-200"
              >
                <Upload className="h-5 w-5 mr-2" />
                Choisir un fichier
              </Button>
            </div>
            
            {/* Fonctionnalités */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-lg">🎯</span>
                </div>
                <span className="font-medium">Guides automatiques</span>
              </div>
              
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 text-lg">✨</span>
                </div>
                <span className="font-medium">Haute qualité</span>
              </div>
              
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 dark:text-orange-400 text-lg">⚡</span>
                </div>
                <span className="font-medium">Traitement rapide</span>
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