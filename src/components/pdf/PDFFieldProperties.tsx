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
  console.log('🎨 PDFFieldProperties render');
  console.log('🎨 availableVariables reçues:', availableVariables);
  console.log('🎨 linkedFormId:', linkedFormId);
  console.log('🎨 Nombre de variables disponibles:', availableVariables.length);
  
  // Afficher des informations sur le formulaire lié
  const getLinkedFormInfo = () => {
    if (!linkedFormId) return null;
    
    try {
      // Essayer plusieurs sources
      let forms = [];
      
      // 1. Variable globale
      if (typeof window !== 'undefined' && (window as any).currentUserForms) {
        forms = (window as any).currentUserForms;
        console.log('🎨 Forms depuis window.currentUserForms');
      }
      // 2. localStorage
      else if (localStorage.getItem('currentUserForms')) {
        forms = JSON.parse(localStorage.getItem('currentUserForms') || '[]');
        console.log('🎨 Forms depuis localStorage.currentUserForms');
      }
      // 3. sessionStorage
      else if (sessionStorage.getItem('currentUserForms')) {
        forms = JSON.parse(sessionStorage.getItem('currentUserForms') || '[]');
        console.log('🎨 Forms depuis sessionStorage.currentUserForms');
      }
      
      const linkedForm = forms.find((f: any) => f.id === linkedFormId);
      console.log('🎨 Formulaire lié trouvé:', !!linkedForm);
      if (linkedForm) {
        console.log('🎨 Titre:', linkedForm.title);
        console.log('🎨 Champs:', linkedForm.fields?.map((f: any) => f.label));
      }
      return linkedForm ? `${linkedForm.title} (${linkedForm.fields?.length || 0} champs)` : 'Formulaire non trouvé';
    } catch {
      return 'Erreur de chargement';
    }
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          Propriétés du champ
        </h3>
        {linkedFormId && (
          <p className="text-xs text-blue-600 dark:text-blue-400 break-words">
            📋 Lié au formulaire: {getLinkedFormInfo()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Variable liée
          </label>
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
            💡 Astuce: Les variables sont générées automatiquement depuis les champs du formulaire
          </p>
          <p className="text-xs text-gray-500 mb-2 break-words">
            Variables disponibles: {availableVariables.length}
          </p>
          <select
            value={field.variable}
            onChange={(e) => onUpdate({ variable: e.target.value })}
            className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
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
          {linkedFormId && (
            <p className="text-xs text-gray-500 mt-1 break-words">
              ✅ Variables générées depuis les champs du formulaire lié ({availableVariables.length - 3} champs + 3 système)
            </p>
          )}
          {!linkedFormId && (
            <p className="text-xs text-orange-600 mt-1 break-words">
              ⚠️ Aucun formulaire lié - Variables par défaut utilisées
            </p>
          )}
          
          {/* Aperçu de la variable sélectionnée */}
          {field.variable && (
            <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-800 dark:text-green-200">
                ✅ Variable sélectionnée: <code className="font-mono bg-white dark:bg-gray-800 px-1 rounded">{field.variable}</code>
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4">
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

        <div className="grid grid-cols-2 gap-2 sm:gap-4">
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

        {/* Boutons de positionnement rapide */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            Positionnement rapide
          </label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ x: 30, y: 50 })}
              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
            >
              ↖ Haut gauche
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ x: 200, y: 50 })}
              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
            >
              ↑ Haut centre
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ x: 370, y: 50 })}
              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
            >
              ↗ Haut droite
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ x: 30, y: 600 })}
              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
            >
              ↙ Bas gauche
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ x: 200, y: 600 })}
              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
            >
              ↓ Bas centre
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ x: 370, y: 600 })}
              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
            >
              ↘ Bas droite
            </Button>
          </div>
        </div>
        
        {/* Boutons de taille rapide */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            Tailles prédéfinies
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ width: 100, height: 20 })}
              className="text-xs bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
            >
              📏 Petit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ width: 150, height: 25 })}
              className="text-xs bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
            >
              📏 Moyen
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ width: 200, height: 30 })}
              className="text-xs bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
            >
              📏 Grand
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ width: 180, height: 60 })}
              className="text-xs bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
            >
              ✍️ Signature
            </Button>
          </div>
        </div>
        {(field.type === 'text' || field.type === 'number') && (
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
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Couleur du texte
              </label>
              <input
                type="color"
                value={field.fontColor || '#000000'}
                onChange={(e) => onUpdate({ fontColor: e.target.value })}
                className="w-full h-8 sm:h-10 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Couleur de fond
              </label>
              <input
                type="color"
                value={field.backgroundColor || '#ffffff'}
                onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                className="w-full h-8 sm:h-10 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Utilisez blanc (#ffffff) pour un fond transparent
              </p>
            </div>
          </>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="required"
            checked={field.required || false}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="text-blue-600"
          />
          <label htmlFor="required" className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            Champ obligatoire
          </label>
        </div>

        <Input
          label="Texte d'aide"
          value={field.placeholder || ''}
          onChange={(e) => onUpdate({ placeholder: e.target.value })}
          placeholder="Texte affiché si la variable est vide"
        />
        
        {/* Informations d'aide */}
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            💡 Conseils de positionnement
          </h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Utilisez les coordonnées pour un placement précis</li>
            <li>• Les boutons de positionnement rapide placent aux coins</li>
            <li>• Glissez-déposez directement sur le PDF pour ajuster</li>
            <li>• Le coin bleu permet de redimensionner</li>
            <li>• L'aperçu montre comment le champ apparaîtra</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};