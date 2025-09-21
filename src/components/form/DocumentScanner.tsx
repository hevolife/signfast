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
      console.log('📷 Demande d\'accès caméra optimisée...');
export const DocumentScanner: React.FC<DocumentScannerProps> = ({
      // Contraintes optimisées pour un démarrage rapide
  value,
  required = false,
        // Démarrage immédiat avec timeout de sécurité
          facingMode: facingMode,
        setTimeout(() => {
        // Essai direct avec contraintes optimisées
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            const maxAttempts = 10; // 5 secondes max
            console.log('📷 ✅ Vidéo prête immédiatement');
            
            setVideoReady(true);
        console.log('📷 ✅ Flux obtenu:', mediaStream.getVideoTracks().length, 'pistes');
            setCameraError(null);
            const checkInterval = setInterval(() => {
          } else {
              
            // Vérification périodique rapide
              attempts++;
            let attempts = 0;
        // Essai direct avec contraintes optimisées
            const maxAttempts = 10; // 5 secondes max
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            
        console.log('📷 ✅ Flux obtenu:', mediaStream.getVideoTracks().length, 'pistes');
            const checkInterval = setInterval(() => {
              
              attempts++;
        console.warn('📷 ⚠️ Contraintes optimisées échouées, fallback:', constraintError);
              
              if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
              if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
            audio: false 
                console.log('📷 ✅ Vidéo prête après', attempts * 500, 'ms');
          // Fallback simple et rapide
                setVideoReady(true);
          mediaStream = await navigator.mediaDevices.getUserMedia({ 
                setCameraError(null);
            video: { facingMode: facingMode }, 
                clearInterval(checkInterval);
            audio: false 
              } else if (attempts >= maxAttempts) {
          });
                console.warn('📷 ⚠️ Timeout détection vidéo');
          console.log('📷 ✅ Flux obtenu avec fallback');
                setCameraError('Caméra lente à démarrer. Réessayez ou changez de caméra.');
        } catch (fallbackError) {
                clearInterval(checkInterval);
          console.error('📷 ❌ Échec total accès caméra:', fallbackError);
              }
          throw fallbackError;
            }, 500);
        }, 100); // Délai initial très court
          }
        }, 100); // Délai initial très court
        }, 100); // Délai initial très court
                  <span>Document posé à plat</span>
        }, 100); // Délai initial très court
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
        console.log('📷 Configuration élément vidéo optimisée...');
      )}
    </div>