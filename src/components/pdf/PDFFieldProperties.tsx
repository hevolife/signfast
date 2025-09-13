import React from 'react';
import { PDFField } from '../../types/pdf';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Eye } from 'lucide-react';

interface PDFFieldPropertiesProps {
  field: PDFField;
  onUpdate: (updates: Partial<PDFField>) => void;
  availableVariables: string[];
  linkedFormId?: string;
  onPreviewPDF?: () => void;
  previewLoading?: boolean;
}

export const PDFFieldProperties: React.FC<PDFFieldPropertiesProps> = ({
  field,
  onUpdate,
  availableVariables,
  linkedFormId,
  onPreviewPDF,
  previewLoading,
}) => {
  const getLinkedFormInfo = () => {
    if (!linkedFormId) return null;
    
    try {
      let forms = [];
      
      if ((window as any).currentUserForms) {
        forms = (window as any).currentUserForms;
      } else if (localStorage.getItem('currentUserForms')) {
        forms = JSON.parse(localStorage.getItem('currentUserForms') || '[]');
      } else if (sessionStorage.getItem('currentUserForms')) {
        forms = JSON.parse(sessionStorage.getItem('currentUserForms') || '[]');
      }
      
      const linkedForm = forms.find((f: any) => f.id === linkedFormId);
      return linkedForm ? `${linkedForm.title} (${linkedForm.fields?.length || 0} champs)` : 'Formulaire non trouvé';
    } catch {
      return 'Erreur de chargement';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white text-sm">⚙️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-300">
                Propriétés du champ
              </h3>
              {linkedFormId && (
                <p className="text-xs text-indigo-700 dark:text-indigo-400">
                  📋 Lié au formulaire: {getLinkedFormInfo()}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={onPreviewPDF}
            disabled={previewLoading}
            size="sm"
            className="flex items-center space-x-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md"
          >
            {previewLoading ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            ) : (
              <Eye className="h-3 w-3" />
            )}
            <span className="text-xs">{previewLoading ? 'Génération...' : 'Prévisualiser'}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Variable */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Variable liée
          </label>
          <select
            value={field.variable}
            onChange={(e) => onUpdate({ variable: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="">Sélectionner une variable</option>
            <optgroup label="Variables du formulaire">
              {availableVariables.filter(v => !v.includes('date_creation') && !v.includes('heure_creation') && !v.includes('numero_reponse')).map((variable) => (
                <option key={variable} value={variable}>
                  {variable}
                </option>
              ))}
            </optgroup>
            <optgroup label="Variables système">
              {availableVariables.filter(v => v.includes('date_creation') || v.includes('heure_creation') || v.includes('numero_reponse')).map((variable) => (
                <option key={variable} value={variable}>
                  {variable}
                </option>
              ))}
            </optgroup>
          </select>
          
          {field.variable && (
            <div className="mt-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 shadow-sm">
              <p className="text-xs text-green-800 dark:text-green-200">
                ✅ Variable: <code className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm">{field.variable}</code>
              </p>
            </div>
          )}
        </div>

        {/* Position */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Position X (ratio)"
            type="number"
            step="0.001"
            min="0"
            max="1"
            value={(field.xRatio || 0).toFixed(4)}
            onChange={(e) => onUpdate({ xRatio: parseFloat(e.target.value) || 0 })}
          />
          <Input
            label="Position Y (ratio)"
            type="number"
            step="0.001"
            min="0"
            max="1"
            value={(field.yRatio || 0).toFixed(4)}
            onChange={(e) => onUpdate({ yRatio: parseFloat(e.target.value) || 0 })}
          />
        </div>

        {/* Taille */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Largeur (ratio)"
            type="number"
            step="0.001"
            min="0.01"
            max="1"
            value={(field.widthRatio || 0.1).toFixed(4)}
            onChange={(e) => onUpdate({ widthRatio: parseFloat(e.target.value) || 0.1 })}
          />
          <Input
            label="Hauteur (ratio)"
            type="number"
            step="0.001"
            min="0.01"
            max="1"
            value={(field.heightRatio || 0.05).toFixed(4)}
            onChange={(e) => onUpdate({ heightRatio: parseFloat(e.target.value) || 0.03 })}
          />
        </div>

        {/* Offsets pour ajustement fin */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Ajustement fin (en points PDF)
          </label>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Offset X"
              type="number"
              step="1"
              value={field.offsetX || 0}
              onChange={(e) => onUpdate({ offsetX: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
            <Input
              label="Offset Y"
              type="number"
              step="1"
              value={field.offsetY || 0}
              onChange={(e) => onUpdate({ offsetY: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          <p className="text-xs text-gray-500">
            Ajustez ces valeurs si les champs ne sont pas parfaitement alignés
          </p>
        </div>

        {/* Positionnement rapide */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Positionnement rapide
          </label>
          <div className="grid grid-cols-3 gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ xRatio: 0.1, yRatio: 0.1 })}
              className="text-xs bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200 border border-blue-200 shadow-sm"
            >
              ↖
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ xRatio: 0.5, yRatio: 0.1 })}
              className="text-xs bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200 border border-blue-200 shadow-sm"
            >
              ↑
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ xRatio: 0.8, yRatio: 0.1 })}
              className="text-xs bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200 border border-blue-200 shadow-sm"
            >
              ↗
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ xRatio: 0.1, yRatio: 0.7 })}
              className="text-xs bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200 border border-blue-200 shadow-sm"
            >
              ↙
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ xRatio: 0.5, yRatio: 0.7 })}
              className="text-xs bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200 border border-blue-200 shadow-sm"
            >
              ↓
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ xRatio: 0.8, yRatio: 0.7 })}
              className="text-xs bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200 border border-blue-200 shadow-sm"
            >
              ↘
            </Button>
          </div>
        </div>

        {/* Tailles prédéfinies */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tailles prédéfinies
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ widthRatio: 0.15, heightRatio: 0.03 })}
              className="text-xs bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 border border-gray-200 shadow-sm"
            >
              Petit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ widthRatio: 0.25, heightRatio: 0.04 })}
              className="text-xs bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 border border-gray-200 shadow-sm"
            >
              Moyen
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ widthRatio: 0.35, heightRatio: 0.05 })}
              className="text-xs bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 border border-gray-200 shadow-sm"
            >
              Grand
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ widthRatio: 0.35, heightRatio: 0.1 })}
              className="text-xs bg-gradient-to-br from-purple-50 to-purple-100 text-purple-700 hover:from-purple-100 hover:to-purple-200 border border-purple-200 shadow-sm"
            >
              Signature
            </Button>
          </div>
        </div>

        {/* Propriétés de style pour texte */}
        {(field.type === 'text' || field.type === 'number' || field.type === 'date') && (
          <>
            <Input
              label="Taille de police"
              type="number"
              min="6"
              max="72"
              step="1"
              value={field.fontSize || 12}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 12 })}
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Couleur du texte
              </label>
              <input
                type="color"
                value={field.fontColor || '#000000'}
                onChange={(e) => onUpdate({ fontColor: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Couleur de fond
              </label>
              <input
                type="color"
                value={field.backgroundColor || '#ffffff'}
                onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded-lg"
              />
            </div>
          </>
        )}

        {/* Champ obligatoire */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="required"
            checked={field.required || false}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="text-blue-600"
          />
          <label htmlFor="required" className="text-sm text-gray-700 dark:text-gray-300">
            Champ obligatoire
          </label>
        </div>

        {/* Placeholder */}
        <Input
          label="Texte d'aide"
          value={field.placeholder || ''}
          onChange={(e) => onUpdate({ placeholder: e.target.value })}
          placeholder="Texte affiché si la variable est vide"
        />

        {/* Alignement sur grille */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            const gridSize = 0.01; // Grille de 1% pour les ratios
            const snappedXRatio = Math.round((field.xRatio || 0) / gridSize) * gridSize;
            const snappedYRatio = Math.round((field.yRatio || 0) / gridSize) * gridSize;
            onUpdate({ xRatio: snappedXRatio, yRatio: snappedYRatio });
          }}
          className="w-full text-xs bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 hover:from-green-100 hover:to-emerald-100 border border-green-200 shadow-sm"
        >
          📐 Aligner sur grille (1%)
        </Button>

        {/* Informations du champ */}
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-5 h-5 bg-gradient-to-br from-gray-400 to-slate-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">ℹ️</span>
            </div>
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Informations du champ
            </h4>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Type:</span>
              <span className="font-medium">{field.type}</span>
            </div>
            <div className="flex justify-between">
              <span>Page:</span>
              <span className="font-medium">{field.page}</span>
            </div>
            <div className="flex justify-between">
              <span>Position:</span>
              <span className="font-mono">({(field.xRatio || 0).toFixed(3)}, {(field.yRatio || 0).toFixed(3)})</span>
            </div>
            <div className="flex justify-between">
              <span>Taille:</span>
              <span className="font-mono">{(field.widthRatio || 0.1).toFixed(3)} × {(field.heightRatio || 0.05).toFixed(3)}</span>
            </div>
            {(field.offsetX || field.offsetY) && (
              <div className="flex justify-between">
                <span>Offsets:</span>
                <span className="font-mono">({field.offsetX || 0}, {field.offsetY || 0}) pts</span>
              </div>
            )}
          </div>
            Informations du champ
          </h4>
        </div>
      </CardContent>
    </Card>
  );
};