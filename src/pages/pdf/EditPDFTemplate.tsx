import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PDFTemplateEditor } from '../../components/pdf/PDFTemplateEditor';
import { PDFField, PDFTemplate } from '../../types/pdf';
import { PDFTemplateService } from '../../services/pdfTemplateService';
import { useAuth } from '../../contexts/AuthContext';
import { useForms } from '../../hooks/useForms';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export const EditPDFTemplate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { forms, refetch: refetchForms } = useForms();
  const [template, setTemplate] = useState<PDFTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Générer les variables à partir du formulaire lié
  const getFormVariables = () => {
    console.log('📋 getFormVariables appelée, template.linkedFormId:', template?.linkedFormId);
    
    if (!template?.linkedFormId) {
      console.log('📋 Pas de formulaire lié, variables par défaut');
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
      ];
    }
    
    try {
      // Essayer plusieurs sources de données
      let formsData = localStorage.getItem('currentUserForms');
      
      if (!formsData) {
        console.log('📋 currentUserForms vide, essai sessionStorage...');
        formsData = sessionStorage.getItem('currentUserForms');
      }
      
      if (!formsData) {
        console.log('📋 sessionStorage vide, essai forms standard...');
        formsData = localStorage.getItem('forms');
      }
      
      if (!formsData) {
        console.log('📋 Aucune source de données trouvée');
        throw new Error('Aucune donnée de formulaires trouvée');
      }
      
      const forms = JSON.parse(formsData);
      console.log('📋 Forms chargés:', forms.length, 'formulaires');
      console.log('📋 Recherche formulaire ID:', template.linkedFormId);
      
      const linkedForm = forms.find((f: any) => f.id === template.linkedFormId);
      
      if (linkedForm && linkedForm.fields) {
        console.log('📋 Formulaire lié trouvé:', linkedForm.title);
        console.log('📋 Champs du formulaire:', linkedForm.fields.map((f: any) => f.label));
        
        const formVariables = linkedForm.fields.map((field: any) => {
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
        formVariables.push('${date_creation}', '${heure_creation}', '${numero_reponse}');
        
        console.log('📋 Variables générées:', formVariables);
        return formVariables;
      } else {
        console.warn('📋 Formulaire lié non trouvé ou sans champs');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du formulaire lié:', error);
    }
    
    // Variables par défaut en cas d'erreur
    console.log('📋 Retour aux variables par défaut');
    return ['${nom}', '${email}', '${date_creation}'];
  };

  useEffect(() => {
    if (id) {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    if (!id) return;
    
    try {
      console.log('📄 Chargement template pour édition:', id);
      
      // Essayer de charger depuis Supabase d'abord
      let foundTemplate = null;
      
      if (user) {
        console.log('📄 Chargement depuis Supabase...');
        const supabaseTemplates = await PDFTemplateService.getUserTemplates(user.id);
        foundTemplate = supabaseTemplates.find(t => t.id === id);
        
        if (foundTemplate) {
          console.log('✅ Template trouvé dans Supabase:', foundTemplate.name);
        }
      }
      
      // Fallback vers localStorage si pas trouvé dans Supabase
      if (!foundTemplate) {
        console.log('📄 Fallback vers localStorage...');
        try {
          const localTemplates = JSON.parse(localStorage.getItem('pdfTemplates') || '[]');
          foundTemplate = localTemplates.find((t: PDFTemplate) => t.id === id);
          
          if (foundTemplate) {
            console.log('✅ Template trouvé dans localStorage:', foundTemplate.name);
          }
        } catch (localError) {
          console.warn('⚠️ Erreur lecture localStorage:', localError);
        }
      }
      
      if (foundTemplate) {
        setTemplate(foundTemplate);
        console.log('✅ Template chargé avec succès');
      } else {
        console.error('❌ Template non trouvé:', id);
        toast.error('Template PDF non trouvé');
        navigate('/pdf/templates');
      }
    } catch (error) {
      console.error('Erreur lors du chargement du template:', error);
      toast.error('Erreur lors du chargement du template');
      navigate('/pdf/templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (fields: PDFField[], pdfFile: File) => {
    if (!template || !id) return;

    setSaving(true);
    
    try {
      if (!user) {
        toast.error('Vous devez être connecté pour modifier un template');
        return;
      }

      // Convertir le fichier PDF en Data URL pour le stockage
      const pdfDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(pdfFile);
      });

      // Préparer les mises à jour
      const updates: Partial<PDFTemplate> = {
        name: pdfFile.name.replace('.pdf', ''),
        description: `Template PDF avec ${fields.length} champs`,
        fields: fields,
        originalPdfUrl: pdfDataUrl,
        pages: 1, // Placeholder
        linkedFormId: template.linkedFormId, // Préserver la liaison existante
      };

      // Mettre à jour dans Supabase
      const success = await PDFTemplateService.updateTemplate(id, updates);
      
      if (success) {
        toast.success('Template PDF mis à jour avec succès !');
        navigate('/pdf/templates');
      } else {
        toast.error('Erreur lors de la mise à jour du template');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour du template');
    } finally {
      setSaving(false);
    }
  };

  const handleFormLinkChange = async (formId: string | null) => {
    if (!template || !id) return;

    try {
      console.log('🔗 Début liaison template-formulaire:', id, '→', formId);
      
      // Mettre à jour la liaison dans Supabase
      const success = await PDFTemplateService.linkTemplateToForm(id, formId);
      
      if (success) {
        console.log('✅ Liaison Supabase réussie');
        
        // Mettre à jour le template local
        setTemplate({ ...template, linkedFormId: formId });
        
        // IMPORTANT: Mettre à jour aussi le formulaire pour qu'il pointe vers ce template
        if (formId && user) {
          console.log('🔗 Mise à jour du formulaire cible:', formId);
          const selectedForm = forms.find(f => f.id === formId);
          
          if (!selectedForm) {
            console.warn('⚠️ Formulaire non trouvé dans la liste locale, actualisation...');
            await refetchForms();
            const refreshedForms = forms.find(f => f.id === formId);
            if (!refreshedForms) {
              console.error('❌ Formulaire toujours non trouvé après actualisation');
              toast.error('Formulaire non trouvé');
              return;
            }
          }
          
          try {
            const { error: formUpdateError } = await supabase
              .from('forms')
              .update({
                settings: {
                  ...selectedForm?.settings,
                  pdfTemplateId: id,
                  generatePdf: true, // Activer automatiquement la génération PDF
                }
              })
              .eq('id', formId)
              .eq('user_id', user.id);

            if (formUpdateError) {
              console.warn('⚠️ Erreur mise à jour formulaire:', formUpdateError);
              toast.warn('Template lié mais erreur mise à jour formulaire');
            } else {
              console.log('✅ Formulaire mis à jour avec le template ID');
              // Rafraîchir la liste des formulaires pour refléter les changements
              await refetchForms();
              console.log('✅ Liste des formulaires actualisée');
            }
          } catch (formError) {
            console.warn('⚠️ Erreur lors de la mise à jour du formulaire:', formError);
            toast.warn('Template lié mais erreur mise à jour formulaire');
          }
        }
        
        toast.success(formId ? 'Formulaire lié avec succès !' : 'Formulaire délié avec succès !');
      } else {
        console.error('❌ Échec liaison Supabase');
        toast.error('Erreur lors de la mise à jour de la liaison');
      }
    } catch (error) {
      console.error('Erreur liaison formulaire:', error);
      toast.error('Erreur lors de la liaison du formulaire');
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Template non trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <PDFTemplateEditor
      onSave={handleSave}
      initialFields={template.fields}
      formVariables={getFormVariables()}
      existingPdfUrl={template.originalPdfUrl}
      templateName={template.name}
      linkedFormId={template.linkedFormId}
      onFormLinkChange={handleFormLinkChange}
    />
  );
};