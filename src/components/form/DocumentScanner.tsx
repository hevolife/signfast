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
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>(value || '');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [videoReady, setVideoReady] = useState(false);

  const startCamera = async () => {
    try {
      console.log('📷 Demande d\'accès caméra optimisée...');
      
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        },
        audio: false
      };

      let mediaStream;
      
      try {
        // Essai direct avec contraintes optimisées
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('📷 ✅ Flux obtenu:', mediaStream.getVideoTracks().length, 'pistes');
      } catch (constraintError) {
        console.warn('📷 ⚠️ Contraintes optimisées échouées, fallback:', constraintError);
        
        // Fallback simple et rapide
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: facingMode }, 
          audio: false 
        });
        console.log('📷 ✅ Flux obtenu avec fallback');
      }

      const video = videoRef.current;
      if (video) {
        console.log('📷 Configuration élément vidéo optimisée...');
        video.srcObject = mediaStream;
        
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
    } catch (fallbackError) {
      console.error('📷 ❌ Échec total accès caméra:', fallbackError);
      throw fallbackError;
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
        {isScanning ? (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover"
            />
            {scanSettings.showGuides && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-4 border-2 border-green-400 border-dashed rounded-lg"></div>
              </div>
            )}
          </div>
        ) : capturedImage ? (
          <img
            src={capturedImage}
            alt="Document scanné"
            className="w-full h-64 object-cover"
          />
        ) : (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Camera className="w-12 h-12 text-gray-400 mx-auto" />
              <div className="space-y-2">
                <p className="text-gray-600 font-medium">Scanner un document</p>
                <div className="text-sm text-gray-500 space-y-1">
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
        )}
      </div>
      
      {required && !capturedImage && (
        <p className="text-sm text-red-600 font-medium">
          ⚠️ Le scan de document est obligatoire
        </p>
      )}
    </div>
  );
};