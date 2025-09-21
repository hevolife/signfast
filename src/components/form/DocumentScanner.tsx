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
      console.log('📷 === DÉMARRAGE CAMÉRA SCANNER ===');
      
      // Vérifier la disponibilité de l'API
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('API caméra non disponible sur cet appareil');
        return;
      }

      // Arrêter le flux existant
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      console.log('📷 Demande d\'accès caméra avec contraintes basiques...');
      
      // Contraintes progressives pour maximiser la compatibilité
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        },
        audio: false
      };

      console.log('📷 Contraintes:', constraints);

      let mediaStream: MediaStream;
      
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('📷 ✅ Flux obtenu avec contraintes complètes:', mediaStream.getVideoTracks().length, 'pistes');
      } catch (constraintError) {
        console.warn('📷 ⚠️ Contraintes complètes échouées, essai avec contraintes basiques:', constraintError);
        
        // Fallback avec contraintes minimales
        const basicConstraints: MediaStreamConstraints = {
          video: {
            facingMode: facingMode
          },
          audio: false
        };
        
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(basicConstraints);
          console.log('📷 ✅ Flux obtenu avec contraintes basiques:', mediaStream.getVideoTracks().length, 'pistes');
        } catch (basicError) {
          console.error('📷 ❌ Échec contraintes basiques:', basicError);
          
          // Dernier essai avec contraintes ultra-minimales
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            console.log('📷 ✅ Flux obtenu avec contraintes minimales');
          } catch (minimalError) {
            console.error('📷 ❌ Échec total accès caméra:', minimalError);
            throw minimalError;
          }
        }
      }
      
      // Vérifier que le flux a des pistes actives
      const videoTracks = mediaStream.getVideoTracks();
      if (videoTracks.length === 0) {
        setCameraError('Aucune piste vidéo disponible');
        return;
      }

      console.log('📷 Piste vidéo active:', {
        label: videoTracks[0].label,
        settings: videoTracks[0].getSettings(),
        readyState: videoTracks[0].readyState,
        enabled: videoTracks[0].enabled
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        console.log('📷 Configuration élément vidéo avec gestion d\'erreurs...');
        const video = videoRef.current;
        
        // Nettoyer l'élément vidéo existant
        video.srcObject = null;
        video.pause();
        video.currentTime = 0;
        
        // Supprimer les anciens event listeners
        video.onloadedmetadata = null;
        video.oncanplay = null;
        video.onplay = null;
        video.onerror = null;
        video.onloadstart = null;
        video.onloadeddata = null;
        
        // Configurer les nouveaux événements
        video.onloadedmetadata = () => {
          console.log('📷 ✅ Métadonnées chargées:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
            networkState: video.networkState
          });
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setVideoReady(true);
          }
        };
        
        video.oncanplay = () => {
          console.log('📷 ✅ Vidéo prête à jouer');
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setVideoReady(true);
          }
        };
        
        video.onplay = () => {
          console.log('📷 ✅ Lecture démarrée');
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setVideoReady(true);
          }
        };
        
        video.onloadeddata = () => {
          console.log('📷 ✅ Données vidéo chargées');
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setVideoReady(true);
          }
        };
        
        video.onloadstart = () => {
          console.log('📷 🔄 Début chargement vidéo...');
        };
        
        video.onerror = (e) => {
          console.error('❌ Erreur élément vidéo:', e, video.error);
          setCameraError(`Erreur de lecture vidéo: ${video.error?.message || 'Erreur inconnue'}`);
        };
        
        // Définir le flux vidéo
        console.log('📷 Attribution du flux à l\'élément vidéo...');
        video.srcObject = mediaStream;
        
        // Configurer les propriétés vidéo
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        
        // Forcer le chargement et la lecture
        video.load();
        
        // Essayer de démarrer la lecture avec plusieurs tentatives
        const attemptPlay = async (attempt = 1, maxAttempts = 5) => {
          try {
            console.log(`📷 Tentative de lecture ${attempt}/${maxAttempts}...`);
            await video.play();
            console.log('📷 ✅ Lecture vidéo réussie');
            
            // Vérifier que la vidéo a des dimensions valides
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              setVideoReady(true);
            } else {
              console.warn('📷 ⚠️ Vidéo sans dimensions, attente...');
              setTimeout(() => {
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                  setVideoReady(true);
                }
              }, 1000);
            }
          } catch (playError) {
            console.error(`❌ Erreur lecture tentative ${attempt}:`, playError);
            
            if (attempt < maxAttempts) {
              console.log(`📷 Nouvelle tentative dans 500ms...`);
              setTimeout(() => attemptPlay(attempt + 1, maxAttempts), 500);
            } else {
              setCameraError(`Impossible de démarrer la vidéo après ${maxAttempts} tentatives`);
            }
          }
        };
        
        // Démarrer les tentatives de lecture après un court délai
        setTimeout(() => attemptPlay(), 100);
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
                    onClick={() => {
                      setCameraError(null);
                      setFacingMode(facingMode === 'user' ? 'environment' : 'user');
                      setTimeout(() => startCamera(), 500);
                    }}
                    className="w-full bg-blue-600 text-white hover:bg-blue-700 font-bold py-3"
                  >
                    🔄 Essayer l'autre caméra
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
            <>
              <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-20">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-6"></div>
                  <h3 className="text-xl font-bold mb-2">Initialisation caméra...</h3>
                  <p className="text-sm text-white/70 mb-4">Veuillez autoriser l'accès à la caméra</p>
                  <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded border text-xs text-red-800 dark:text-red-200 space-y-1">
                    <p><strong>Solutions :</strong></p>
                    <p>• Cliquez sur l'icône 🔒 dans la barre d'adresse</p>
                    <p>• Sélectionnez "Autoriser" pour la caméra</p>
                    <p>• Fermez les autres onglets utilisant la caméra</p>
                    <p>• Essayez avec Chrome ou Firefox</p>
                    <p>• Rechargez la page si nécessaire</p>
                  </div>
                  <div className="mt-4">
                    <Button
                      onClick={() => {
                        stopCamera();
                        setTimeout(() => startCamera(), 1000);
                      }}
                      className="bg-white/20 text-white border border-white/30 hover:bg-white/30 font-bold py-2 px-4"
                    >
                      🔄 Réessayer
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* Élément vidéo avec gestion d'erreurs améliorée */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            controls={false}
            className="w-full h-full object-cover"
            style={{ 
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              backgroundColor: '#000000'
            }}
            onLoadedMetadata={(e) => {
              console.log('📷 ✅ Event: Métadonnées vidéo chargées');
              const video = e.currentTarget;
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                setVideoReady(true);
              }
            }}
            onCanPlay={(e) => {
              console.log('📷 ✅ Event: Vidéo peut être lue');
              const video = e.currentTarget;
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                setVideoReady(true);
              }
            }}
            onPlay={(e) => {
              console.log('📷 ✅ Event: Lecture démarrée');
              const video = e.currentTarget;
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                setVideoReady(true);
              }
            }}
            onLoadedData={(e) => {
              console.log('📷 ✅ Event: Données vidéo chargées');
              const video = e.currentTarget;
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                setVideoReady(true);
              }
            }}
            onError={(e) => {
              console.error('❌ Event: Erreur vidéo:', e);
              const video = e.currentTarget;
              setCameraError(`Erreur lecture vidéo: ${video.error?.message || 'Erreur inconnue'}`);
            }}
            onSuspend={() => {
              console.warn('📷 ⚠️ Event: Vidéo suspendue');
            }}
            onStalled={() => {
              console.warn('📷 ⚠️ Event: Vidéo bloquée');
            }}
            onWaiting={() => {
              console.log('📷 ⏳ Event: Vidéo en attente de données');
            }}
          />
          
          {/* Debug overlay pour développement */}
          {!videoReady && !cameraError && (
            <div className="absolute bottom-4 left-4 bg-black/70 text-white p-2 rounded text-xs">
              <div>Stream: {stream ? '✅' : '❌'}</div>
              <div>Video Ready: {videoReady ? '✅' : '❌'}</div>
              <div>Facing: {facingMode}</div>
              {videoRef.current && (
                <div>
                  <div>Video W×H: {videoRef.current.videoWidth}×{videoRef.current.videoHeight}</div>
                  <div>Ready State: {videoRef.current.readyState}</div>
                  <div>Network State: {videoRef.current.networkState}</div>
                </div>
              )}
            </div>
          )}
          
          {/* Guides visuels */}
          {videoReady && renderVideoGuides()}
        </div>

        {/* Contrôles en bas avec gestion d'état améliorée */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-6 sm:p-8">
          <div className="flex items-center justify-center space-x-8">
            {/* Changer de caméra */}
            <Button
              variant="ghost"
              onClick={switchCamera}
              disabled={!videoReady}
              className={`text-white rounded-full w-14 h-14 p-0 shadow-xl transition-all ${
                videoReady 
                  ? 'hover:bg-white/20' 
                  : 'opacity-50 cursor-not-allowed'
              }`}
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
          
          {/* Informations techniques améliorées */}
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
            {stream && videoRef.current && (
              <div className="text-xs bg-black/50 rounded px-2 py-1">
                Résolution: {videoRef.current.videoWidth || 0}×{videoRef.current.videoHeight || 0}
              </div>
            )}
          </div>
        </div>

        {/* Canvas cachés */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Affichage du résultat final
  if (capturedImage) {
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
              onClick={resetScan}
              className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 shadow-lg hover:shadow-xl transition-all duration-300 w-full"
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
              type="button"
              onClick={startCamera}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
              <Camera className="h-6 w-6 mr-3" />
              📷 Scanner avec la caméra (Plein écran)
            </Button>
            
            {/* Alternative : upload fichier */}
            <div className="relative">
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                variant="secondary"
                disabled={!!cameraError}
                className={`w-full font-bold py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${
                  cameraError 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white'
                }`}
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