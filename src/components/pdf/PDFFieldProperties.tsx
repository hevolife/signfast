import React from 'react';
import { PDFField } from '../../types/pdf';
import { Input } from '../ui/Input';
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
          <p className="text-xs text-gray-500 mb-2 break-words">
            Variables disponibles: {availableVariables.length}
          </p>
          <select
            value={field.variable}
            onChange={(e) => onUpdate({ variable: e.target.value })}
            className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="">Sélectionner une variable</option>
            {availableVariables.map((variable) => (
              <option key={variable} value={variable}>
                {variable}
              </option>
            ))}
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
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <Input
            label="Position X"
            type="number"
            value={Math.round(field.x)}
            onChange={(e) => onUpdate({ x: parseInt(e.target.value) || 0 })}
          />
          <Input
            label="Position Y"
            type="number"
            value={Math.round(field.y)}
            onChange={(e) => onUpdate({ y: parseInt(e.target.value) || 0 })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <Input
            label="Largeur"
            type="number"
            value={Math.round(field.width)}
            onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 60 })}
          />
          <Input
            label="Hauteur"
            type="number"
            value={Math.round(field.height)}
            onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 30 })}
          />
        </div>

        {(field.type === 'text' || field.type === 'number') && (
          <>
            <Input
              label="Taille de police"
              type="number"
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
      </CardContent>
    </Card>
  );
};