import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { QrCode, Download, Copy, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface QRCodeGeneratorProps {
  formId: string;
  formTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  formId,
  formTitle,
  isOpen,
  onClose,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const formUrl = `${window.location.origin}/form/${formId}`;

  useEffect(() => {
    if (isOpen) {
      generateQRCode();
    }
  }, [isOpen, formId]);

  const generateQRCode = async () => {
    setLoading(true);
    try {
      const qrDataUrl = await QRCode.toDataURL(formUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1f2937', // Couleur sombre
          light: '#ffffff', // Fond blanc
        },
        errorCorrectionLevel: 'M',
      });
      
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      console.error('Erreur génération QR code:', error);
      toast.error('Erreur lors de la génération du QR code');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `qr-code-${formTitle.replace(/[^a-z0-9]/gi, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('QR code téléchargé !');
  };

  const copyFormLink = () => {
    navigator.clipboard.writeText(formUrl);
    toast.success('Lien copié dans le presse-papiers !');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <QrCode className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  QR Code du formulaire
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formTitle}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* QR Code Display */}
          <div className="text-center">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Génération du QR code...
                  </p>
                </div>
              </div>
            ) : qrCodeDataUrl ? (
              <div className="bg-white p-6 rounded-xl shadow-inner border border-gray-200">
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code du formulaire"
                  className="mx-auto max-w-full h-auto"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded-xl">
                <p className="text-gray-500">Erreur lors de la génération</p>
              </div>
            )}
          </div>

          {/* Form URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Lien du formulaire
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={formUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm font-mono"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={copyFormLink}
                className="flex items-center space-x-1 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">💡</span>
              </div>
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                Comment utiliser ce QR code
              </h4>
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <div>📱 Scannez avec un smartphone pour accéder au formulaire</div>
              <div>🖨️ Imprimez et collez sur vos documents physiques</div>
              <div>📧 Intégrez dans vos emails et newsletters</div>
              <div>🌐 Partagez sur vos réseaux sociaux</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold"
            >
              Fermer
            </Button>
            <Button
              onClick={downloadQRCode}
              disabled={!qrCodeDataUrl}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};