import React from 'react';
import { PDFField } from '../../types/pdf';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';

interface PDFFieldPropertiesProps {
  field: PDFField;
  onUpdate: (updates: Partial<PDFField>) => void;
  availableVariables: string[];
  linkedFormId?: string;
}

export const PDFFieldProperties: React.FC<PDFFieldPropertiesProps> = ({
  field,
  onUpdate,
  availableVariables,
  linkedFormId,
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
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Propriétés du champ
        </h3>
        {linkedFormId && (
          <p className="text-xs text-blue-600 dark:text-blue-400">
            📋 Lié au formulaire: {getLinkedFormInfo()}
          </p>
        )}
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
            <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-800 dark:text-green-200">
                ✅ Variable: <code className="font-mono bg-white dark:bg-gray-800 px-1 rounded">{field.variable}</code>
              </p>
            </div>
          )}
        </div>

        {/* Position */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Position X"
            type="number"
            step="1"
            min="0"
            max="600"
            value={Math.round(field.x)}
            onChange={(e) => onUpdate({ x: parseInt(e.target.value) || 0 })}
          />
          <Input
            label="Position Y"
            type="number"
            step="1"
            min="0"
            max="800"
            value={Math.round(field.y)}
            onChange={(e) => onUpdate({ y: parseInt(e.target.value) || 0 })}
          />
        </div>

        {/* Taille */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Largeur"
            type="number"
            step="1"
            min="20"
            max="400"
            value={Math.round(field.width)}
            onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 120 })}
          />
          <Input
            label="Hauteur"
            type="number"
            step="1"
            min="15"
            max="200"
            value={Math.round(field.height)}
            onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 25 })}
          />
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
              onClick={() => onUpdate({ x: 50, y: 50 })}
              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              ↖
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ x: 250, y: 50 })}
              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              ↑
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ x: 450, y: 50 })}
              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              ↗
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ x: 50, y: 400 })}
              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              ↙
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ x: 250, y: 400 })}
              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              ↓
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ x: 450, y: 400 })}
              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
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
              onClick={() => onUpdate({ width: 80, height: 20 })}
              className="text-xs bg-gray-50 text-gray-700 hover:bg-gray-100"
            >
              Petit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ width: 150, height: 25 })}
              className="text-xs bg-gray-50 text-gray-700 hover:bg-gray-100"
            >
              Moyen
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ width: 200, height: 30 })}
              className="text-xs bg-gray-50 text-gray-700 hover:bg-gray-100"
            >
              Grand
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ width: 200, height: 60 })}
              className="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100"
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
            const gridSize = 10;
            const snappedX = Math.round(field.x / gridSize) * gridSize;
            const snappedY = Math.round(field.y / gridSize) * gridSize;
            onUpdate({ x: snappedX, y: snappedY });
          }}
          className="w-full text-xs bg-green-50 text-green-700 hover:bg-green-100"
        >
          📐 Aligner sur grille (10px)
        </Button>

        {/* Informations du champ */}
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Informations du champ
          </h4>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div>Type: {field.type}</div>
            <div>Page: {field.page}</div>
            <div>Position: ({Math.round(field.x)}, {Math.round(field.y)})</div>
            <div>Taille: {Math.round(field.width)} × {Math.round(field.height)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};