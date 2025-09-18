import { supabase } from '../lib/supabase';
import { PDFGenerator } from '../utils/pdfGenerator';

export interface PDFGenerationOptions {
  templateId?: string;
  formTitle: string;
  responseId: string;
  formData: Record<string, any>;
  saveToServer?: boolean;
  emailPdf?: boolean;
}

export class OptimizedPDFService {
  /**
   * Service principal de génération PDF optimisé
   */
  static async generatePDF(options: PDFGenerationOptions): Promise<Uint8Array> {
    const { templateId, formTitle, responseId, formData, saveToServer = false } = options;
    
    try {
      console.log('📄 Génération PDF optimisée:', { templateId, formTitle, responseId });

      let pdfBytes: Uint8Array;

      if (templateId) {
        pdfBytes = await this.generateWithTemplate(formData, templateId);
      } else {
        pdfBytes = await this.generateSimplePDF(formData, formTitle);
      }

      // Sauvegarder si demandé
      if (saveToServer) {
        await this.savePDFToServer(pdfBytes, responseId, formTitle, formData);
      }

      return pdfBytes;
    } catch (error) {
      console.error('❌ Erreur génération PDF:', error);
      throw error;
    }
  }

  /**
   * Génération avec template personnalisé
   */
  private static async generateWithTemplate(
    formData: Record<string, any>,
    templateId: string
  ): Promise<Uint8Array> {
    try {
      // Récupérer le template
      const { data: template, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error || !template) {
        throw new Error('Template PDF non trouvé');
      }

      // Convertir le template
      const pdfTemplate = {
        id: template.id,
        name: template.name,
        fields: template.fields || [],
        originalPdfUrl: template.pdf_content,
      };

      // Convertir le PDF en bytes
      const base64Data = template.pdf_content.split(',')[1];
      const binaryString = atob(base64Data);
      const originalPdfBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        originalPdfBytes[i] = binaryString.charCodeAt(i);
      }

      return await PDFGenerator.generatePDF(pdfTemplate, formData, originalPdfBytes);
    } catch (error) {
      console.error('❌ Erreur génération avec template:', error);
      throw error;
    }
  }

  /**
   * Génération PDF simple
   */
  private static async generateSimplePDF(
    formData: Record<string, any>,
    formTitle: string
  ): Promise<Uint8Array> {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Titre
      doc.setFontSize(16);
      doc.text(formTitle, 20, 20);
      
      // Date
      doc.setFontSize(10);
      doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
      
      // Données
      let yPosition = 50;
      doc.setFontSize(12);
      
      Object.entries(formData).forEach(([key, value]) => {
        if (value && typeof value === 'string' && !value.startsWith('data:image')) {
          const text = `${key}: ${value}`;
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

  /**
   * Sauvegarder le PDF sur le serveur
   */
  private static async savePDFToServer(
    pdfBytes: Uint8Array,
    responseId: string,
    formTitle: string,
    formData: Record<string, any>
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));
      const fileName = `${formTitle}_${responseId.slice(-8)}_${Date.now()}.pdf`;

      await supabase.from('pdf_storage').insert({
        file_name: fileName,
        response_id: responseId,
        template_name: 'Template simple',
        form_title: formTitle,
        form_data: formData,
        pdf_content: `data:application/pdf;base64,${pdfBase64}`,
        file_size: pdfBytes.length,
        user_id: user.id,
        user_name: formData.nom || formData.name || 'Utilisateur'
      });

      console.log('✅ PDF sauvegardé sur serveur');
    } catch (error) {
      console.error('❌ Erreur sauvegarde PDF:', error);
    }
  }

  /**
   * Télécharger un PDF
   */
  static downloadPDF(pdfBytes: Uint8Array, fileName: string): void {
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

  /**
   * Compter les PDFs d'un utilisateur
   */
  static async countUserPDFs(userId: string): Promise<number> {
    try {
      const { data: userForms } = await supabase
        .from('forms')
        .select('id')
        .eq('user_id', userId);

      if (!userForms || userForms.length === 0) {
        return 0;
      }

      const formIds = userForms.map(form => form.id);
      
      const { count } = await supabase
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .in('form_id', formIds);

      return count || 0;
    } catch (error) {
      console.error('❌ Erreur comptage PDFs:', error);
      return 0;
    }
  }
}