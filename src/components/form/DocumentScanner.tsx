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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(value || null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [videoReady, setVideoReady] = useState(false);

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
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('📷 Track arrêté:', track.kind);
        });
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setVideoReady(false);
      console.log('📷 === DÉMARRAGE CAMÉRA ===');
      
      // Vérifier la disponibilité de l'API
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('API caméra non disponible sur cet appareil');
      }

      // Arrêter le flux existant
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      console.log('📷 Demande d\'accès caméra...');
      
      // Contraintes très basiques pour maximiser la compatibilité
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      console.log('📷 Contraintes:', constraints);

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('📷 ✅ Flux obtenu:', mediaStream.getVideoTracks().length, 'pistes');
      
      // Vérifier que le flux a des pistes actives
      const videoTracks = mediaStream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error('Aucune piste vidéo disponible');
      }

      console.log('📷 Piste vidéo:', videoTracks[0].getSettings());
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        console.log('📷 Configuration élément vidéo...');
        const video = videoRef.current;
        
        // Réinitialiser l'élément vidéo
        video.srcObject = null;
        video.load();
        
        // Configurer les événements AVANT de définir srcObject
        video.onloadedmetadata = () => {
          console.log('📷 ✅ Métadonnées chargées:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState
          });
          setVideoReady(true);
        };
        
        video.oncanplay = () => {
          console.log('📷 ✅ Vidéo prête à jouer');
          setVideoReady(true);
        };
        
        video.onplay = () => {
          console.log('📷 ✅ Lecture démarrée');
          setVideoReady(true);
        };
        
        video.onerror = (e) => {
          console.error('❌ Erreur élément vidéo:', e);
          setCameraError('Erreur de lecture vidéo');
        };
        
        // Définir le flux
        video.srcObject = mediaStream;
        
        // Forcer la lecture après un délai
        setTimeout(async () => {
          try {
            console.log('📷 Tentative de lecture...');
            await video.play();
            console.log('📷 ✅ Lecture réussie');
            setVideoReady(true);
          } catch (playError) {
            console.error('❌ Erreur lecture:', playError);
            setCameraError('Impossible de démarrer la vidéo');
          }
        }, 500);
      }
      
      setIsScanning(true);
      toast.success('📷 Caméra activée');
    } catch (error: any) {
      console.error('❌ Erreur accès caméra:', error);
      setCameraError(error.message);
      
      if (error.name === 'NotAllowedError') {
        toast.error('❌ Accès caméra refusé. Autorisez l\'accès dans votre navigateur.');
      } else if (error.name === 'NotFoundError') {
        toast.error('❌ Aucune caméra trouvée');
      } else if (error.name === 'NotReadableError') {
        toast.error('❌ Caméra occupée par une autre application');
      } else {
        toast.error(`❌ Erreur caméra: ${error.message}`);
      }
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
    setCameraError(null);
  };

  const switchCamera = async () => {
    console.log('📷 Changement de caméra...');
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    
    // Délai pour laisser le temps à la caméra de se libérer
    setTimeout(() => {
      startCamera();
    }, 1000);
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
    
    setCapturedImage(imageData);
    
    // Définir une zone de recadrage par défaut (80% de l'image)
    const margin = 0.1;
    setCropArea({
      x: canvas.width * margin,
      y: canvas.height * margin,
      width: canvas.width * (1 - 2 * margin),
      height: canvas.height * (1 - 2 * margin)
    });
    
    setIsCropping(true);
    stopCamera();
    toast.success('📷 Photo capturée ! Ajustez le recadrage.');
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
      
      // Créer un canvas pour obtenir les dimensions
      const img = new Image();
      img.onload = () => {
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
          }
        }
        
        // Zone de recadrage par défaut
        const margin = 0.05;
        setCropArea({
          x: img.width * margin,
          y: img.height * margin,
          width: img.width * (1 - 2 * margin),
          height: img.height * (1 - 2 * margin)
        });
        setIsCropping(true);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    
    // Reset input
    event.target.value = '';
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
    
    // Si on clique dans la zone existante, on la déplace
    if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
        y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      setDragStart({ 
        x: x - cropArea.x, 
        y: y - cropArea.y 
      });
    } else {
      // Sinon on crée une nouvelle zone
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
    
    // Si on déplace une zone existante
    if (cropArea.width > 0 && cropArea.height > 0) {
      setCropArea(prev => ({
        ...prev,
        x: Math.max(0, Math.min(canvasRef.current!.width - prev.width, x - dragStart.x)),
        y: Math.max(0, Math.min(canvasRef.current!.height - prev.height, y - dragStart.y))
      }));
    } else {
      // Sinon on redimensionne
      setCropArea({
        x: Math.min(dragStart.x, x),
        y: Math.min(dragStart.y, y),
        width: Math.abs(x - dragStart.x),
        height: Math.abs(y - dragStart.y)
      });
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

    const img = new Image();
    img.onload = () => {
      // Dessiner l'image originale sur le canvas principal
      const mainCanvas = canvasRef.current!;
      const mainCtx = mainCanvas.getContext('2d')!;
      mainCanvas.width = img.width;
      mainCanvas.height = img.height;
      mainCtx.drawImage(img, 0, 0);

      // Extraire la zone recadrée
      cropCanvas.width = cropArea.width;
      cropCanvas.height = cropArea.height;

      ctx.drawImage(
        mainCanvas,
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
      
      toast.success('✅ Document scanné et optimisé !');
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

  const renderCropOverlay = () => {
    if (!isCropping || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    return (
      <div className="absolute inset-0 z-10">
        {/* Overlay sombre */}
        <div className="absolute inset-0 bg-black/50"></div>
        
        {/* Zone de recadrage */}
        <div
          className="absolute border-2 border-blue-500 bg-transparent cursor-move shadow-lg"
          style={{
            left: `${cropArea.x * scaleX}px`,
            top: `${cropArea.y * scaleY}px`,
            width: `${cropArea.width * scaleX}px`,
            height: `${cropArea.height * scaleY}px`,
          }}
        >
          {/* Poignées de redimensionnement */}
          <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nw-resize shadow-lg"></div>
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-ne-resize shadow-lg"></div>
          <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-sw-resize shadow-lg"></div>
          <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-se-resize shadow-lg"></div>
          
          {/* Grille de recadrage */}
          <svg className="w-full h-full pointer-events-none">
            <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="rgba(59,130,246,0.8)" strokeWidth="1" />
            <line x1="66.66%" y1="0" x2="66.66%" y2="100%" stroke="rgba(59,130,246,0.8)" strokeWidth="1" />
            <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="rgba(59,130,246,0.8)" strokeWidth="1" />
            <line x1="0" y1="66.66%" x2="100%" y2="66.66%" stroke="rgba(59,130,246,0.8)" strokeWidth="1" />
          </svg>
        </div>
        
        {/* Instructions de recadrage */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium shadow-xl">
          ✂️ Ajustez la zone de recadrage • Cliquez et glissez
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
                  <Button
                    onClick={() => {
                      setCameraError(null);
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
                    Annuler
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Indicateur de chargement */}
          {!videoReady && !cameraError && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-20">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-6"></div>
                <h3 className="text-xl font-bold mb-2">Initialisation caméra...</h3>
                <p className="text-sm text-white/70">Veuillez autoriser l'accès à la caméra</p>
                <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <p className="text-xs text-white/80">
                    Si l'écran reste noir, vérifiez les permissions de votre navigateur
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Élément vidéo */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ 
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              backgroundColor: '#000000'
            }}
            onLoadedMetadata={() => {
              console.log('📷 ✅ Métadonnées vidéo chargées');
              setVideoReady(true);
            }}
            onCanPlay={() => {
              console.log('📷 ✅ Vidéo prête');
              setVideoReady(true);
            }}
            onPlay={() => {
              console.log('📷 ✅ Lecture démarrée');
              setVideoReady(true);
            }}
            onError={(e) => {
              console.error('❌ Erreur vidéo:', e);
              setCameraError('Erreur de lecture vidéo');
            }}
          />
          
          {/* Guides visuels */}
          {videoReady && renderVideoGuides()}
        </div>

        {/* Contrôles en bas */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-6 sm:p-8">
          <div className="flex items-center justify-center space-x-8">
            {/* Changer de caméra */}
            <Button
              variant="ghost"
              onClick={switchCamera}
              className="text-white hover:bg-white/20 rounded-full w-14 h-14 p-0 shadow-xl"
              title={facingMode === 'user' ? 'Caméra arrière' : 'Caméra avant'}
            >
              <RefreshCw className="h-6 w-6" />
            </Button>
            
            {/* Bouton de capture principal */}
            <Button
              onClick={capturePhoto}
              disabled={!videoReady}
              className={`rounded-full w-20 h-20 p-0 shadow-2xl transition-all duration-300 ${
                videoReady 
                  ? 'bg-white text-black hover:bg-gray-100 hover:scale-110' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              title="Capturer le document"
            >
              <Camera className="h-8 w-8" />
            </Button>
            
            {/* Annuler */}
            <Button
              variant="ghost"
              onClick={stopCamera}
              className="text-white hover:bg-white/20 rounded-full w-14 h-14 p-0 shadow-xl"
              title="Fermer le scanner"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          {/* Informations techniques */}
          <div className="text-center mt-6 text-white/70 text-sm space-y-2">
            <div className="flex items-center justify-center space-x-4">
              <span>📷 {facingMode === 'user' ? 'Caméra avant' : 'Caméra arrière'}</span>
              <span>📐 {settings.outputFormat.toUpperCase()}</span>
              <span>🎚️ {Math.round(settings.quality * 100)}%</span>
            </div>
            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full ${
              videoReady ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${videoReady ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}></div>
              <span className="text-xs font-medium">
                {videoReady ? 'Caméra prête' : 'Initialisation...'}
              </span>
            </div>
          </div>
        </div>

        {/* Canvas cachés */}
        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={cropCanvasRef} className="hidden" />
      </div>
    );
  }

  // Mode recadrage
  if (capturedImage && isCropping) {
    return (
      <div className="space-y-4">
        <div className="border-2 border-blue-500 rounded-lg bg-white dark:bg-gray-800 p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Crop className="h-6 w-6 text-white" />
            </div>
            <h4 className="text-xl font-bold text-blue-900 dark:text-blue-300 mb-2">
              ✂️ Recadrage du document
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Ajustez la zone de sélection pour ne garder que le document
            </p>
          </div>
          
          <div className="relative inline-block max-w-full mx-auto">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[500px] border-2 border-gray-300 rounded-lg cursor-crosshair shadow-lg"
              onMouseDown={handleCropStart}
              onMouseMove={handleCropMove}
              onMouseUp={handleCropEnd}
              onMouseLeave={handleCropEnd}
            />
            <canvas ref={cropCanvasRef} className="hidden" />
            
            {renderCropOverlay()}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              onClick={applyCrop}
              disabled={cropArea.width === 0 || cropArea.height === 0}
              className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Check className="h-5 w-5" />
              <span>Valider le recadrage</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsCropping(false)}
              className="flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 font-bold py-3"
            >
              <X className="h-5 w-5" />
              <span>Annuler</span>
            </Button>
            <Button
              variant="ghost"
              onClick={retakePhoto}
              className="flex items-center justify-center space-x-2 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 font-bold py-3"
            >
              <Camera className="h-5 w-5" />
              <span>Reprendre photo</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Affichage du résultat final
  if (capturedImage && !isCropping) {
    return (
      <div className="space-y-4">
        <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 p-6">
          <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800 shadow-lg">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <Check className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-green-900 dark:text-green-300">
                Document scanné avec succès
              </span>
            </div>
            
            <div className="text-center">
              <img
                src={capturedImage}
                alt="Document scanné"
                className="max-w-full max-h-80 object-contain mx-auto border-2 border-green-200 dark:border-green-700 rounded-lg shadow-xl"
              />
              <div className="flex items-center justify-center mt-4 space-x-4 text-sm text-green-700 dark:text-green-400">
                <span>📄 Taille: {Math.round(capturedImage.length / 1024)} KB</span>
                <span>✅ Format: {settings.outputFormat.toUpperCase()}</span>
                <span>🎚️ Qualité: {Math.round(settings.quality * 100)}%</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            <Button
              onClick={retakePhoto}
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Camera className="h-5 w-5" />
              <span>Reprendre</span>
            </Button>
            <Button
              onClick={() => {
                setIsCropping(true);
                // Redessiner l'image sur le canvas pour le recadrage
                if (canvasRef.current) {
                  const img = new Image();
                  img.onload = () => {
                    const canvas = canvasRef.current!;
                    const ctx = canvas.getContext('2d')!;
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    // Zone de recadrage par défaut
                    const margin = 0.05;
                    setCropArea({
                      x: img.width * margin,
                      y: img.height * margin,
                      width: img.width * (1 - 2 * margin),
                      height: img.height * (1 - 2 * margin)
                    });
                  };
                  img.src = capturedImage;
                }
              }}
              className="flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Crop className="h-5 w-5" />
              <span>Recadrer</span>
            </Button>
            <Button
              onClick={resetScan}
              className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <RotateCcw className="h-5 w-5" />
              <span>Recommencer</span>
            </Button>
          </div>
        </div>
        
        {required && !capturedImage && (
          <p className="text-sm text-red-600 font-medium">
            ⚠️ Le scan de document est obligatoire
          </p>
        )}
      </div>
    );
  }

  // Interface initiale
  return (
    <div className="space-y-4">
      <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Camera className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            Scanner un document
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            Utilisez votre caméra pour scanner et numériser un document en haute qualité
          </p>
          
          {/* Affichage des erreurs */}
          {cameraError && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800 mb-6">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-red-600 text-lg">❌</span>
                <span className="text-sm font-bold text-red-800 dark:text-red-200">Erreur caméra</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">{cameraError}</p>
              <div className="space-y-2">
                <p className="text-xs text-red-600 dark:text-red-400">
                  💡 Vérifiez que votre navigateur a accès à la caméra
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  🔒 Autorisez l'accès dans les paramètres du navigateur
                </p>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {/* Bouton principal caméra */}
            <Button
              onClick={startCamera}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
              <Camera className="h-6 w-6 mr-3" />
              📷 Scanner avec la caméra (Plein écran)
            </Button>
            
            {/* Alternative : upload fichier */}
            <div className="relative">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="secondary"
                className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 font-bold py-3 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Upload className="h-5 w-5 mr-2" />
                Ou choisir une image existante
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            
            {/* Conseils d'utilisation */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 text-left">
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300 mb-3 text-center">
                💡 Conseils pour un scan parfait
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                <div className="flex items-center space-x-2">
                  <span>📱</span>
                  <span>Mode plein écran automatique</span>
                </div>
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
      </div>
      
      {required && !capturedImage && (
        <p className="text-sm text-red-600 font-medium">
          ⚠️ Le scan de document est obligatoire
        </p>
      )}
    </div>
  );
};