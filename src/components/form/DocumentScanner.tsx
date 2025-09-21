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
  scanSettings
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(value || null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const settings = {
    outputFormat: scanSettings?.outputFormat || 'jpeg',
    quality: scanSettings?.quality || 0.9,
    maxWidth: scanSettings?.maxWidth || 1920,
    maxHeight: scanSettings?.maxHeight || 1080,
    showGuides: scanSettings?.showGuides !== false,
    autoCapture: scanSettings?.autoCapture || false
  };

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
        video.muted = true;
        video.playsInline = true;

        // Démarrage immédiat avec timeout de sécurité
        setTimeout(() => {
          // Essai direct avec contraintes optimisées
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
        <div className="absolute top-4 left-4 right-4 bg-black/70 text-white p-3 rounded-lg">
          <div className="space-y-2 text-sm">
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
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {!capturedImage ? (
        <div className="space-y-4">
          {!isScanning ? (
            <div className="space-y-4">
              <Button
                onClick={startCamera}
                className="w-full flex items-center justify-center space-x-2"
                variant="primary"
              >
                <Camera className="w-5 h-5" />
                <span>Scanner un document</span>
              </Button>
              
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <Upload className="w-5 h-5" />
                  <span>Importer une image</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-[4/3]">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                
                {renderVideoGuides()}
                
                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="text-center text-white p-4">
                      <X className="w-12 h-12 mx-auto mb-2 text-red-400" />
                      <p className="text-sm">{cameraError}</p>
                    </div>
                  </div>
                )}
                
                {!videoReady && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="text-center text-white">
                      <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                      <p className="text-sm">Initialisation de la caméra...</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-center space-x-4 mt-4">
                <Button
                  onClick={stopCamera}
                  variant="outline"
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
                  variant="outline"
                  size="sm"
                  disabled={!videoReady}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={capturePhoto}
                  disabled={!videoReady}
                  className="px-8"
                >
                  <Camera className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-[4/3]">
            <img
              src={capturedImage}
              alt="Document scanné"
              className="w-full h-full object-contain"
            />
          </div>
          
          <div className="flex justify-center space-x-4">
            <Button
              onClick={resetScan}
              variant="outline"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={retakePhoto}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={() => {
                const link = document.createElement('a');
                link.download = `document-${Date.now()}.${settings.outputFormat}`;
                link.href = capturedImage;
                link.click();
              }}
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
      
      {required && !capturedImage && (
        <p className="text-sm text-red-600 font-medium">
          ⚠️ Le scan de document est obligatoire
        </p>
      )}
    </div>
  );
};