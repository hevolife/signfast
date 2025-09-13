import React, { useRef, useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { RotateCcw, Check } from 'lucide-react';

interface SignatureCanvasProps {
  onSignatureChange: (signature: string) => void;
  value?: string;
  required?: boolean;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onSignatureChange,
  value,
  required = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuration du canvas
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Charger la signature existante si elle existe
    if (value && value !== '') {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setIsEmpty(false);
      };
      img.src = value;
    }
  }, [value]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setIsEmpty(false);

    const { x, y } = getCanvasCoordinates(e, canvas);

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    // Empêcher le comportement par défaut pour les événements tactiles
    if ('touches' in e) {
      e.preventDefault();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e, canvas);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const getCanvasCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    return { x, y };
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    console.log('✍️ === CONVERSION SIGNATURE EN IMAGE ===');
    
    try {
      // Vérifier que le canvas contient quelque chose
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('✍️ Contexte canvas non disponible');
        return;
      }
      
      // Vérifier si le canvas est vide
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const isEmpty = imageData.data.every((value, index) => {
        // Ignorer le canal alpha (chaque 4ème valeur)
        if ((index + 1) % 4 === 0) return true;
        return value === 255; // Blanc
      });
      
      if (isEmpty) {
        console.log('✍️ Canvas vide, pas de signature à sauvegarder');
        setIsEmpty(true);
        onSignatureChange('');
        return;
      }
      
      console.log('✍️ Canvas contient une signature, conversion...');
      
      // Créer un canvas temporaire optimisé pour PDF
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        // Utiliser une résolution plus élevée pour une meilleure qualité
        const scale = 2;
        tempCanvas.width = canvas.width * scale;
        tempCanvas.height = canvas.height * scale;
        
        // Configurer le contexte pour une meilleure qualité
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.scale(scale, scale);
        
        // Fond blanc opaque
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Dessiner la signature par-dessus avec antialiasing
        tempCtx.drawImage(canvas, 0, 0);
        
        // Convertir en PNG haute qualité
        const signature = tempCanvas.toDataURL('image/png', 1.0);
        console.log('✍️ ✅ Signature convertie (haute qualité):', signature.length, 'caractères');
        console.log('✍️ Format final:', signature.substring(0, 30) + '...');
        
        setIsEmpty(false);
        onSignatureChange(signature);
      } else {
        console.warn('✍️ Contexte temporaire non disponible, fallback...');
        // Fallback simple
        const signature = canvas.toDataURL('image/png', 1.0);
        console.log('✍️ ⚠️ Signature convertie (fallback):', signature.length, 'caractères');
        setIsEmpty(false);
        onSignatureChange(signature);
      }
    } catch (error) {
      console.error('✍️ Erreur conversion signature:', error);
      // Fallback d'urgence
      try {
        const signature = canvas.toDataURL('image/png');
        console.log('✍️ 🆘 Signature convertie (urgence):', signature.length, 'caractères');
        setIsEmpty(false);
        onSignatureChange(signature);
      } catch (fallbackError) {
        console.error('✍️ Échec total conversion signature:', fallbackError);
        setIsEmpty(true);
        onSignatureChange('');
      }
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    console.log('✍️ === SAUVEGARDE MANUELLE SIGNATURE ===');
    
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Vérifier si le canvas contient quelque chose
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const isEmpty = imageData.data.every((value, index) => {
        if ((index + 1) % 4 === 0) return true;
        return value === 255;
      });
      
      if (isEmpty) {
        console.log('✍️ Canvas vide lors de la sauvegarde manuelle');
        setIsEmpty(true);
        onSignatureChange('');
        return;
      }
      
      // Même processus que stopDrawing pour la cohérence
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        const scale = 2;
        tempCanvas.width = canvas.width * scale;
        tempCanvas.height = canvas.height * scale;
        
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.scale(scale, scale);
        
        // Fond blanc
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Dessiner la signature
        tempCtx.drawImage(canvas, 0, 0);
        
        const signature = tempCanvas.toDataURL('image/png', 1.0);
        console.log('✍️ ✅ Signature sauvegardée manuellement:', signature.length, 'caractères');
        const signature = canvas.toDataURL('image/png', 1.0);
        onSignatureChange(signature);
      }
    } catch (error) {
      console.error('Erreur conversion signature:', error);
      // Fallback simple
      const signature = canvas.toDataURL('image/png');
      console.error('✍️ Erreur sauvegarde manuelle signature:', error);
      toast.error('Erreur lors de la sauvegarde de la signature');
    }
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 p-4">
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          className="w-full h-32 border border-gray-200 dark:border-gray-700 rounded cursor-crosshair"
          style={{ touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        <div className="flex justify-between items-center mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isEmpty ? 'Dessinez votre signature ci-dessus' : 'Signature enregistrée'}
          </p>
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSignature}
              className="flex items-center space-x-1"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Effacer</span>
            </Button>
            {!isEmpty && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={saveSignature}
                className="flex items-center space-x-1 text-green-600"
              >
                <Check className="h-4 w-4" />
                <span>Valider</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};