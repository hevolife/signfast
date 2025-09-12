import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFTemplateEditor } from '../../components/pdf/PDFTemplateEditor';
import { PDFField } from '../../types/pdf';
import { PDFTemplateService } from '../../services/pdfTemplateService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const NewPDFTemplate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [linkedFormId, setLinkedFormId] = useState<string | null>(null);

  // Variables disponibles depuis les formulaires
  const formVariables = [
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

  const handleSave = async (fields: PDFField[], pdfFile: File) => {
    setSaving(true);
    
    try {
      if (!user) {
        toast.error('Vous devez être connecté pour créer un template');
        return;
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
        name: pdfFile.name.replace('.pdf', ''),
        description: `Template PDF avec ${fields.length} champs`,
        fields: fields,
        originalPdfUrl: pdfDataUrl,
        pages: 1, // Placeholder pour le nombre de pages
        linkedFormId: linkedFormId,
      };

      // Sauvegarder dans Supabase
      const templateId = await PDFTemplateService.createTemplate(newTemplate, user.id);
      
      if (!templateId) {
        toast.error('Erreur lors de la création du template');
        return;
      }
      
      toast.success('Template PDF créé avec succès !');
      navigate('/pdf/templates');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la création du template');
    } finally {
      setSaving(false);
    }
  };

  const handleFormLinkChange = (formId: string | null) => {
    setLinkedFormId(formId);
  };
  return (
    <PDFTemplateEditor
      onSave={handleSave}
      formVariables={formVariables}
      linkedFormId={linkedFormId}
      onFormLinkChange={handleFormLinkChange}
    />
  );
};