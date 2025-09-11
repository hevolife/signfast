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

    // Convertir en base64 et notifier le parent
    const signature = canvas.toDataURL('image/png');
    onSignatureChange(signature);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onSignatureChange('');
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const signature = canvas.toDataURL('image/png');
    onSignatureChange(signature);
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