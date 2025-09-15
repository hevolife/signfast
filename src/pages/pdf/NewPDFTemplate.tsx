import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFTemplateEditor } from '../../components/pdf/PDFTemplateEditor';
import { PDFField } from '../../types/pdf';
import { PDFTemplateService } from '../../services/pdfTemplateService';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { useLimits } from '../../hooks/useLimits';
import toast from 'react-hot-toast';

export const NewPDFTemplate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemoMode, createDemoTemplate } = useDemo();
  const { pdfTemplates: templatesLimits } = useLimits();
  const [saving, setSaving] = useState(false);
  const [linkedFormId, setLinkedFormId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState<string>('');

  // Générer les variables disponibles depuis les formulaires
  const getFormVariables = () => {
    if (!linkedFormId) {
      // Variables par défaut si aucun formulaire n'est lié
      return [
        '${nom}',
        '${prenom}',
        '${email}',
        '${telephone}',
        '${adresse}',
        '${date_naissance}',
        '${signature}',
        '${date_creation}',
        '${numero_contrat}',
        '${salaire}',
        '${poste}',
        '${entreprise}',
      ];
    }
    
    try {
      // Essayer plusieurs sources de données
      let formsData = localStorage.getItem('currentUserForms');
      
      if (!formsData) {
        formsData = sessionStorage.getItem('currentUserForms');
      }
      
      if (!formsData) {
        formsData = localStorage.getItem('forms');
      }
      
      if (!formsData) {
        throw new Error('Aucune donnée de formulaires trouvée');
      }
      
      const forms = JSON.parse(formsData);
      const linkedForm = forms.find((f: any) => f.id === linkedFormId);
      
      if (linkedForm && linkedForm.fields) {
        const formVariables: string[] = [];
        
        // Fonction récursive pour extraire tous les champs, y compris conditionnels
        const extractFieldVariables = (fields: any[]) => {
          fields.forEach((field: any) => {
            // Ajouter le champ principal
            const variableName = field.label
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '_')
              .replace(/_+/g, '_')
              .replace(/^_|_$/g, '');
            
            formVariables.push(`\${${variableName}}`);
            
            // Ajouter les champs conditionnels s'ils existent
            if (field.conditionalFields) {
              Object.values(field.conditionalFields).forEach((conditionalFieldsArray: any) => {
                if (Array.isArray(conditionalFieldsArray)) {
                  extractFieldVariables(conditionalFieldsArray);
                }
              });
            }
          });
        };
        
        // Extraire tous les champs (principaux + conditionnels)
        extractFieldVariables(linkedForm.fields);
        
        // Supprimer les doublons
        const uniqueVariables = [...new Set(formVariables)];
        
        // Ajouter des variables système
        uniqueVariables.push('${date_creation}', '${heure_creation}', '${numero_reponse}');
        
          }
    }
    
    // Variables par défaut en cas d'erreur
    return ['${nom}', '${email}', '${date_creation}'];
  };

  const handleSave = async (fields: PDFField[], pdfFile: File) => {
    setSaving(true);
    
    try {
      if (!user && !isDemoMode) {
        toast.error('Vous devez être connecté pour créer un template');
        return;
      }

      // Vérifier les limites
      if (!templatesLimits.canCreate) {
        toast.error('Limite de templates atteinte. Passez Pro pour créer plus de templates.');
        return;
      }

      // Déterminer l'utilisateur cible (gestion impersonation)
      let targetUserId = user!.id;
      const impersonationData = localStorage.getItem('admin_impersonation');
      
      if (impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          targetUserId = data.target_user_id;
          console.log('🎭 Mode impersonation: création template pour', data.target_email);
        } catch (error) {
          console.error('Erreur parsing impersonation data:', error);
        }
      }

      // Convertir le fichier PDF en Data URL pour le stockage
      const pdfDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(pdfFile);
      });

      // Créer le nouveau template
      const newTemplate = {
        name: templateName || pdfFile.name.replace('.pdf', ''),
        description: `Template PDF avec ${fields.length} champs`,
        fields: fields,
        originalPdfUrl: pdfDataUrl,
        offsetX: -73,
        offsetY: 12,
      };

      if (isDemoMode) {
        // Mode démo : utiliser le contexte démo
        const demoTemplate = createDemoTemplate(newTemplate);
        if (demoTemplate) {
          toast.success('Template PDF créé avec succès !');
          navigate('/pdf/templates');
        } else {
          toast.error('Limite de templates atteinte en mode démo');
        }
      } else {
        // Mode normal : sauvegarder dans Supabase
        const templateId = await PDFTemplateService.createTemplate(newTemplate, targetUserId);
        
        if (!templateId) {
          toast.error('Erreur lors de la création du template');
          return;
        }
        
        toast.success('Template PDF créé avec succès !');
        navigate('/pdf/templates');
      }
    } catch (error) {
      toast.error('Erreur lors de la création du template');
    } finally {
      setSaving(false);
    }
  };

  const handleFormLinkChange = (formId: string | null) => {
    setLinkedFormId(formId);
    
    if (formId) {
      toast.success('Formulaire sélectionné ! Il sera lié lors de la sauvegarde.');
      };
  }

  const handleTemplateNameChange = (name: string) => {
    setTemplateName(name);
  };

  return (
    <PDFTemplateEditor
      onSave={handleSave}
      formVariables={getFormVariables()}
      linkedFormId={linkedFormId}
      onFormLinkChange={handleFormLinkChange}
      templateName={templateName}
      onTemplateNameChange={handleTemplateNameChange}
    />
  );
};