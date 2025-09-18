import { supabase } from '../lib/supabase';
import { stripeConfig } from '../stripe-config';
import { PDFGenerator } from '../utils/pdfGenerator';

export class PDFService {
  // COMPTER LES RÉPONSES POUR UN UTILISATEUR (pour les limites)
  static async countResponsesForUser(userId: string): Promise<number> {
    try {
      console.log('📊 Comptage réponses utilisateur (pas de cache):', userId);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Count timeout')), 8000)
      );
      
      // Récupérer les IDs des formulaires de l'utilisateur (toujours depuis le serveur)
      const { data: userForms, error: formsError } = await Promise.race([
        supabase
        .from('forms')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }), // Force une requête fraîche
        timeoutPromise
      ]);

      if (formsError || !userForms) {
        return 0;
      }

      const formIds = userForms.map(form => form.id);
      
      if (formIds.length === 0) {
        return 0;
      }

      // Compter les réponses pour ces formulaires
      const { count, error } = await Promise.race([
        supabase
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .in('form_id', formIds)
        .order('created_at', { ascending: false }), // Force une requête fraîche
        timeoutPromise
      ]);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (error) {
      // Return 0 on any error to prevent crashes
      return 0;
    }
  }

  // GÉNÉRER PDF DEPUIS UNE RÉPONSE
  static async generatePDFFromResponse(
    responseId: string,
    formData: Record<string, any>,
    formTitle: string,
    templateId?: string
  ): Promise<Uint8Array> {
    try {
      console.log('📄 === GÉNÉRATION PDF DEPUIS RÉPONSE ===');
      console.log('📄 Response ID:', responseId);
      console.log('📄 Template ID:', templateId);
      console.log('📄 Form title:', formTitle);

      if (templateId) {
        // Générer avec template personnalisé
        return await this.generatePDFWithTemplate(formData, templateId);
      } else {
        // Générer PDF simple
        return await this.generateSimplePDF(formData, formTitle);
      }
    } catch (error) {
      console.error('❌ Erreur génération PDF depuis réponse:', error);
      throw error;
    }
  }

  // GÉNÉRER PDF AVEC TEMPLATE
  private static async generatePDFWithTemplate(
    formData: Record<string, any>,
    templateId: string
  ): Promise<Uint8Array> {
    try {
      console.log('📄 Récupération template:', templateId);
      
      // First, fetch published form IDs
      const { data: publishedForms, error: formsError } = await supabase
        .from('forms')
        .select('id')
        .eq('is_published', true);

      if (formsError) {
        console.error('❌ Erreur récupération formulaires publiés:', formsError);
        throw new Error('Erreur récupération formulaires publiés');
      }

      const publishedFormIds = publishedForms?.map(form => form.id) || [];
      
      // Récupérer le template
      let templateQuery = supabase
        .from('pdf_templates')
        .select('*')
        .eq('id', templateId);

      // Build the or condition dynamically
      if (publishedFormIds.length > 0) {
        templateQuery = templateQuery.or(`is_public.eq.true,linked_form_id.in.(${publishedFormIds.join(',')})`);
      } else {
        templateQuery = templateQuery.eq('is_public', true);
      }

      const { data: template, error: templateError } = await templateQuery.single();

      if (templateError || !template) {
        console.warn('⚠️ Template non trouvé, fallback vers PDF simple');
        throw new Error('Template non trouvé');
      }

      console.log('📄 Template récupéré:', template.name);

      // Convertir le template au format attendu
      const pdfTemplate = {
        id: template.id,
        name: template.name,
        fields: template.fields || [],
        originalPdfUrl: template.pdf_content,
      };

      // Convertir le PDF template en bytes
      let originalPdfBytes: Uint8Array;
      if (template.pdf_content.startsWith('data:application/pdf')) {
        const base64Data = template.pdf_content.split(',')[1];
        const binaryString = atob(base64Data);
        originalPdfBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          originalPdfBytes[i] = binaryString.charCodeAt(i);
        }
      } else {
        throw new Error('Format de template PDF non supporté');
      }

      // Générer le PDF avec le template
      const pdfBytes = await PDFGenerator.generatePDF(pdfTemplate, formData, originalPdfBytes);
      console.log('✅ PDF généré avec template, taille:', Math.round(pdfBytes.length / 1024), 'KB');
      
      return pdfBytes;
    } catch (error) {
      console.error('❌ Erreur génération avec template:', error);
      throw error;
    }
  }

  // GÉNÉRER PDF SIMPLE
  static async generateSimplePDF(
    formData: Record<string, any>,
    formTitle: string
  ): Promise<Uint8Array> {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Titre
      doc.setFontSize(16);
      doc.text(formTitle, 20, 20);
      
      // Infos
      doc.setFontSize(10);
      doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
      
      // Données
      let yPosition = 50;
      doc.setFontSize(12);
      
      Object.entries(formData).forEach(([key, value]) => {
        if (value && typeof value === 'string' && !value.startsWith('data:image') && !value.startsWith('[')) {
          const text = `${key}: ${value}`;
          
          // Gérer le retour à la ligne si le texte est trop long
          const splitText = doc.splitTextToSize(text, 170);
          doc.text(splitText, 20, yPosition);
          yPosition += splitText.length * 5;
          
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
        }
      });
      
      return new Uint8Array(doc.output('arraybuffer'));
    } catch (error) {
      console.error('❌ Erreur génération PDF simple:', error);
      throw error;
    }
  }

  // TÉLÉCHARGER PDF
  static downloadPDF(pdfBytes: Uint8Array, fileName: string) {
    try {
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('✅ PDF téléchargé:', fileName);
    } catch (error) {
      console.error('❌ Erreur téléchargement PDF:', error);
      throw error;
    }
  }

  // MÉTHODES LEGACY POUR COMPATIBILITÉ
  static async countPDFs(): Promise<number> {
    // Maintenant on compte les réponses au lieu des PDFs stockés
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return 0;
      }

      return await this.countResponsesForUser(user.id);
    } catch (error) {
      return 0;
    }
  }

  static async listPDFs(page: number = 1, limit: number = 10): Promise<{
    pdfs: Array<{
      fileName: string;
      responseId: string;
      templateName: string;
      formTitle: string;
      userName: string;
      createdAt: string;
      size: number;
    }>;
    totalCount: number;
    totalPages: number;
  }> {
    // Cette méthode est maintenant obsolète car on utilise directement les réponses
    // Retourner des données vides pour éviter les erreurs
    return { pdfs: [], totalCount: 0, totalPages: 0 };
  }

  static async generateAndDownloadPDF(fileName: string): Promise<boolean> {
    // Cette méthode est obsolète dans le nouveau système
    console.warn('⚠️ generateAndDownloadPDF est obsolète, utilisez le nouveau système');
    return false;
  }

  static async deletePDF(fileName: string): Promise<boolean> {
    // Cette méthode est obsolète dans le nouveau système
    console.warn('⚠️ deletePDF est obsolète, utilisez deleteResponse');
    return false;
  }

  static async clearAllPDFs(): Promise<void> {
    // Cette méthode est obsolète dans le nouveau système
    console.warn('⚠️ clearAllPDFs est obsolète');
  }
}