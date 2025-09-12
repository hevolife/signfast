import React, { useState, useEffect } from 'react';
import { useForms } from '../../hooks/useForms';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { FormInput, RefreshCw, Eye, Unlink } from 'lucide-react';

interface FormSelectorProps {
  selectedFormId: string | null;
  onFormChange: (formId: string | null) => void;
  showVariablesPreview?: boolean;
}

export const FormSelector: React.FC<FormSelectorProps> = ({
  selectedFormId,
  onFormChange,
  showVariablesPreview = false,
}) => {
  const { forms, loading, refetch } = useForms();
  const [previewVariables, setPreviewVariables] = useState<string[]>([]);

  // Générer l'aperçu des variables quand le formulaire sélectionné change
  useEffect(() => {
    if (selectedFormId && showVariablesPreview) {
      generateVariablesPreview(selectedFormId);
    } else {
      setPreviewVariables([]);
    }
  }, [selectedFormId, forms, showVariablesPreview]);

  const generateVariablesPreview = (formId: string) => {
    const selectedForm = forms.find(f => f.id === formId);
    
    if (selectedForm && selectedForm.fields) {
      const variables = selectedForm.fields.map((field: any) => {
        const variableName = field.label
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        
        return `\${${variableName}}`;
      });
      
      // Ajouter des variables système
      variables.push('${date_creation}', '${heure_creation}', '${numero_reponse}');
      
      setPreviewVariables(variables);
    }
  };

  const selectedForm = forms.find(f => f.id === selectedFormId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement des formulaires...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sélecteur de formulaire */}
      <div className="flex items-center space-x-2">
        <div className="flex-1">
          <select
            value={selectedFormId || ''}
            onChange={(e) => onFormChange(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="">Aucun formulaire lié</option>
            {forms.map((form) => (
              <option key={form.id} value={form.id}>
                {form.title} ({form.fields?.length || 0} champs)
              </option>
            ))}
          </select>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="flex items-center space-x-1"
          title="Actualiser la liste des formulaires"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        
        {selectedFormId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFormChange(null)}
            className="flex items-center space-x-1 text-red-600 hover:text-red-700"
            title="Délier le formulaire"
          >
            <Unlink className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Informations sur le formulaire sélectionné */}
      {selectedForm && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <FormInput className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900 dark:text-blue-300">
                {selectedForm.title}
              </h4>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full dark:bg-blue-900 dark:text-blue-300">
                {selectedForm.fields?.length || 0} champs
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                selectedForm.is_published 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
              }`}>
                {selectedForm.is_published ? 'Publié' : 'Brouillon'}
              </span>
            </div>
          </div>
          
          {selectedForm.description && (
            <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
              {selectedForm.description}
            </p>
          )}
          
          {/* Afficher les settings PDF actuels du formulaire */}
          {selectedForm.settings && (
            <div className="bg-white dark:bg-gray-800 p-3 rounded border mb-3">
              <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Configuration PDF actuelle :
              </h5>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Génération PDF :</span>
                  <span className={selectedForm.settings.generatePdf ? 'text-green-600' : 'text-gray-500'}>
                    {selectedForm.settings.generatePdf ? '✅ Activée' : '❌ Désactivée'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Template lié :</span>
                  <span className={selectedForm.settings.pdfTemplateId ? 'text-green-600' : 'text-gray-500'}>
                    {selectedForm.settings.pdfTemplateId ? '✅ Configuré' : '❌ Aucun'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-600 dark:text-blue-400">
              Créé le {new Date(selectedForm.created_at).toLocaleDateString('fr-FR')}
            </span>
            <a
              href={`/forms/${selectedForm.id}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <Eye className="h-3 w-3" />
              <span>Voir le formulaire</span>
            </a>
          </div>
        </div>
      )}

      {/* Aperçu des variables générées */}
      {showVariablesPreview && previewVariables.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-3">
            Variables générées ({previewVariables.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {previewVariables.map((variable, index) => (
              <div key={index} className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border">
                <code className="text-green-600 dark:text-green-400">{variable}</code>
              </div>
            ))}
          </div>
          <p className="text-xs text-green-700 dark:text-green-400 mt-2">
            ✅ Ces variables seront automatiquement disponibles dans les propriétés des champs
          </p>
        </div>
      )}

      {/* Message si aucun formulaire */}
      {forms.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Aucun formulaire disponible. Créez d'abord un formulaire pour pouvoir le lier à ce template.
          </p>
          <a
            href="/forms/new"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm mt-1 inline-block"
          >
            → Créer un nouveau formulaire
          </a>
        </div>
      )}
    </div>
  );
};