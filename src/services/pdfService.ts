import { supabase } from '../lib/supabase';
import { stripeConfig } from '../stripe-config';

export class PDFService {
  // SAUVEGARDER LES MÉTADONNÉES PDF (sans générer le PDF)
  static async savePDFMetadata(
    fileName: string,
    metadata: {
      responseId: string;
      templateName: string;
      formTitle: string;
      formData: Record<string, any>;
      templateId?: string;
      templateFields?: any[];
      templatePdfContent?: string;
      userId?: string;
    }
  ): Promise<boolean> {
    try {
      // Récupérer l'utilisateur actuel
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.warn('💾 Utilisateur non connecté, sauvegarde locale uniquement');
        // Fallback localStorage pour utilisateurs non connectés
        const localData = {
          file_name: fileName,
          response_id: metadata.responseId,
          template_name: metadata.templateName,
          form_title: metadata.formTitle,
          form_data: metadata.formData,
          pdf_content: '',
          file_size: 0,
          created_at: new Date().toISOString(),
        };
        
        const existingPDFs = this.getLocalPDFs();
        existingPDFs[fileName] = localData;
        localStorage.setItem('allSavedPDFs', JSON.stringify(existingPDFs));
        
        console.log('💾 Métadonnées sauvegardées en local uniquement');
        return true;
      }

      // Vérifier les limites avant de sauvegarder
      const currentPdfs = await this.listPDFs();
      
      // Vérifier si l'utilisateur est abonné (via les données Supabase)
      let isSubscribed = false;
      try {
        const { data: subscription } = await supabase
          .from('stripe_user_subscriptions')
          .select('subscription_status')
          .limit(1);
        
        isSubscribed = subscription && subscription.length > 0 && 
                      (subscription[0].subscription_status === 'active' || 
                       subscription[0].subscription_status === 'trialing');
      } catch (error) {
        // Utilisateur non connecté ou pas d'abonnement
        isSubscribed = false;
      }
      
      // Vérifier les limites pour les utilisateurs gratuits
      if (!isSubscribed && currentPdfs.length >= stripeConfig.freeLimits.maxSavedPdfs) {
        console.warn('💾 Limite de PDFs sauvegardés atteinte pour utilisateur gratuit');
        throw new Error(`Limite de ${stripeConfig.freeLimits.maxSavedPdfs} PDFs sauvegardés atteinte. Passez Pro pour un stockage illimité.`);
      }
      
      console.log('💾 Sauvegarde métadonnées PDF:', fileName);
      
      // Préparer les données avec les métadonnées du template incluses dans form_data
      const enrichedFormData = {
        ...metadata.formData,
        // Ajouter les métadonnées du template dans form_data
        _pdfTemplate: {
          templateId: metadata.templateId,
          templateFields: metadata.templateFields,
          templatePdfContent: metadata.templatePdfContent,
        }
      };

      const pdfData = {
        file_name: fileName,
        response_id: metadata.responseId,
        template_name: metadata.templateName,
        form_title: metadata.formTitle,
        form_data: enrichedFormData,
        pdf_content: '', // Vide pour l'instant
        file_size: 0, // Sera calculé au téléchargement
        user_id: user.id, // IMPORTANT: Associer le PDF à l'utilisateur connecté
      };

      // Sauvegarder dans Supabase
      const { error } = await supabase
        .from('pdf_storage')
        .insert([pdfData]);

      if (error) {
        console.warn('💾 Erreur Supabase, sauvegarde locale:', error);
        
        // Fallback localStorage
        const localData = {
          ...pdfData,
          created_at: new Date().toISOString(),
        };
        
        const existingPDFs = this.getLocalPDFs();
        existingPDFs[fileName] = localData;
        localStorage.setItem('allSavedPDFs', JSON.stringify(existingPDFs));
        
        console.log('💾 Métadonnées sauvegardées en local');
        return true;
      }

      console.log('💾 Métadonnées sauvegardées dans Supabase');
      return true;
    } catch (error) {
      console.error('💾 Erreur sauvegarde métadonnées:', error);
      return false;
    }
  }

  // GÉNÉRER ET TÉLÉCHARGER LE PDF (uniquement au moment du téléchargement)
  static async generateAndDownloadPDF(fileName: string): Promise<boolean> {
    try {
      console.log('📄 🚀 DÉBUT Génération PDF à la demande:', fileName);
      
      // 1. Récupérer les métadonnées
      console.log('📄 🔍 Étape 1: Récupération métadonnées...');
      const metadata = await this.getPDFMetadata(fileName);
      if (!metadata) {
        console.error('📄 ❌ ÉCHEC: Métadonnées non trouvées pour:', fileName);
        
        // Debug: lister tous les PDFs disponibles
        console.log('📄 🔍 DEBUG: Listage de tous les PDFs disponibles...');
        const allPDFs = await this.listPDFs();
        console.log('📄 📋 PDFs disponibles:', allPDFs.map(p => p.fileName));
        
        return false;
      }

      console.log('📄 ✅ Étape 1 OK: Métadonnées récupérées:', {
        templateName: metadata.template_name,
        formTitle: metadata.form_title,
        hasTemplateData: !!metadata.form_data?._pdfTemplate,
        hasTemplateId: !!metadata.form_data?._pdfTemplate?.templateId,
        hasTemplateFields: !!metadata.form_data?._pdfTemplate?.templateFields?.length,
        hasTemplatePdfContent: !!metadata.form_data?._pdfTemplate?.templatePdfContent,
      });

      console.log('📄 🔧 Étape 2: Génération du PDF...');
      let pdfBytes: Uint8Array;

      // 2. Générer le PDF selon le type
      const templateData = metadata.form_data?._pdfTemplate;
      if (templateData?.templateId && templateData?.templateFields && templateData?.templatePdfContent) {
        console.log('📄 🎨 Génération avec template PDF avancé');
        
        // Reconstituer le template
        const template = {
          id: templateData.templateId,
          name: metadata.template_name,
          fields: templateData.templateFields,
          originalPdfUrl: templateData.templatePdfContent,
        };

        // Convertir le PDF template en bytes
        const pdfResponse = await fetch(template.originalPdfUrl);
        const pdfArrayBuffer = await pdfResponse.arrayBuffer();
        const originalPdfBytes = new Uint8Array(pdfArrayBuffer);

        // Générer avec le template
        const { PDFGenerator } = await import('../utils/pdfGenerator');
        
        // Nettoyer les données du formulaire (enlever les métadonnées du template)
        const cleanFormData = { ...metadata.form_data };
        delete cleanFormData._pdfTemplate;
        
        pdfBytes = await PDFGenerator.generatePDF(template, cleanFormData, originalPdfBytes);
      } else {
        console.log('📄 📝 Génération PDF simple');
        
        // Nettoyer les données du formulaire
        const cleanFormData = { ...metadata.form_data };
        delete cleanFormData._pdfTemplate;
        
        // Générer un PDF simple
        pdfBytes = await this.generateSimplePDF(cleanFormData, metadata.form_title);
      }

      console.log('📄 ⬇️ Étape 3: Téléchargement...');
      // 3. Télécharger directement
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 4. Optionnel : mettre à jour la taille du fichier en base
      console.log('📄 💾 Étape 4: Mise à jour taille fichier...');
      await this.updatePDFSize(fileName, pdfBytes.length);

      console.log('📄 ✅ SUCCÈS: PDF généré et téléchargé avec succès!');
      return true;
    } catch (error) {
      console.error('📄 ❌ ERREUR génération PDF:', error);
      return false;
    }
  }

  // RÉCUPÉRER LES MÉTADONNÉES PDF
  private static async getPDFMetadata(fileName: string): Promise<any | null> {
    try {
      console.log('💾 🔍 Récupération métadonnées pour:', fileName);
      
      // Essayer Supabase d'abord
      try {
        console.log('💾 🔍 Tentative Supabase...');
        const { data, error } = await supabase
          .from('pdf_storage')
          .select('file_name, response_id, template_name, form_title, form_data, pdf_content, file_size, created_at, updated_at')
          .eq('file_name', fileName)
          .maybeSingle(); // Utiliser maybeSingle() au lieu de single()

        if (error) {
          console.warn('💾 ❌ Erreur Supabase lors de la récupération:', error);
        } else if (data) {
          console.log('💾 ✅ Métadonnées trouvées dans Supabase:', {
            fileName: data.file_name,
            templateName: data.template_name,
            formTitle: data.form_title,
            hasFormData: !!data.form_data,
            createdAt: data.created_at
          });
          return data;
        } else {
          console.log('💾 ⚠️ Aucune donnée trouvée dans Supabase pour:', fileName);
        }
      } catch (supabaseError) {
        console.warn('💾 ❌ Erreur requête Supabase:', supabaseError);
      }

      // Fallback localStorage
      console.log('💾 🔍 Tentative récupération depuis localStorage...');
      const localPDFs = this.getLocalPDFs();
      console.log('💾 📋 Fichiers locaux disponibles:', Object.keys(localPDFs));
      const localData = localPDFs[fileName];
      
      if (localData) {
        console.log('💾 ✅ Métadonnées trouvées dans localStorage:', {
          fileName: localData.file_name,
          templateName: localData.template_name,
          formTitle: localData.form_title,
          hasFormData: !!localData.form_data
        });
        return localData;
      }
      
      console.log('💾 ❌ Aucune métadonnée trouvée nulle part pour:', fileName);
      console.log('💾 📋 Fichiers disponibles dans Supabase: (vérifiez manuellement)');
      console.log('💾 📋 Fichiers disponibles en local:', Object.keys(localPDFs));
      return null;
    } catch (error) {
      console.error('💾 ❌ Erreur récupération métadonnées:', error);
      return null;
    }
  }

  // METTRE À JOUR LA TAILLE DU FICHIER
  private static async updatePDFSize(fileName: string, size: number): Promise<void> {
    try {
      await supabase
        .from('pdf_storage')
        .update({ file_size: size })
        .eq('file_name', fileName);
    } catch (error) {
      console.warn('💾 Impossible de mettre à jour la taille:', error);
    }
  }

  // LISTER LES PDFS (métadonnées uniquement)
  static async listPDFs(): Promise<Array<{
    fileName: string;
    responseId: string;
    templateName: string;
    formTitle: string;
    createdAt: string;
    size: number;
    formData: Record<string, any>;
  }>> {
    try {
      const allPDFs: any[] = [];

      // Temporairement désactivé jusqu'à ce que la colonne user_id soit ajoutée
      console.log('💾 Récupération Supabase temporairement désactivée (colonne user_id manquante)');

      // Récupérer depuis localStorage
      try {
        console.log('💾 Récupération depuis localStorage...');
        const localPDFs = this.getLocalPDFs();
        const localArray = Object.entries(localPDFs).map(([fileName, data]: [string, any]) => ({
          fileName,
          responseId: data.response_id || 'local',
          templateName: data.template_name,
          formTitle: data.form_title,
          createdAt: data.created_at,
          size: data.file_size || 0,
          formData: data.form_data || {},
          source: 'local'
        }));
        
        console.log('💾 PDFs localStorage trouvés:', localArray.length);
        allPDFs.push(...localArray);
      } catch (localError) {
        console.warn('💾 Erreur récupération locale:', localError);
      }

      // Dédupliquer
      const uniquePDFs = new Map();
      allPDFs.forEach(pdf => {
        if (!uniquePDFs.has(pdf.fileName) || pdf.source === 'supabase') {
          uniquePDFs.set(pdf.fileName, pdf);
        }
      });

      const result = Array.from(uniquePDFs.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      console.log('💾 Total PDFs (métadonnées):', result.length);
      return result;
    } catch (error) {
      console.error('💾 Erreur listage PDFs:', error);
      return [];
    }
  }

  // SUPPRIMER UN PDF
  static async deletePDF(fileName: string): Promise<boolean> {
    try {
      console.log('💾 Suppression PDF:', fileName);
      
      let deleted = false;

      // Temporairement désactivé jusqu'à ce que la colonne user_id soit ajoutée
      console.log('💾 Suppression Supabase temporairement désactivée (colonne user_id manquante)');

      // Supprimer du localStorage
      try {
        const localPDFs = this.getLocalPDFs();
        if (localPDFs[fileName]) {
          delete localPDFs[fileName];
          localStorage.setItem('allSavedPDFs', JSON.stringify(localPDFs));
          console.log('💾 PDF supprimé du localStorage');
          deleted = true;
        }
      } catch (localError) {
        console.warn('💾 Erreur suppression locale:', localError);
      }

      return deleted;
    } catch (error) {
      console.error('💾 Erreur suppression PDF:', error);
      return false;
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
        if (value && typeof value === 'string' && !value.startsWith('data:image')) {
          const text = `${key}: ${value}`;
          doc.text(text, 20, yPosition);
          yPosition += 10;
          
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
        }
      });
      
      return new Uint8Array(doc.output('arraybuffer'));
    } catch (error) {
      console.error('🎯 Erreur génération PDF simple:', error);
      throw error;
    }
  }

  // NETTOYER TOUS LES PDFS
  static async clearAllPDFs(): Promise<void> {
    try {
      // Récupérer l'utilisateur actuel
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      // Nettoyer Supabase
      if (user) {
        try {
        await supabase
          .from('pdf_storage')
          .delete()
          .eq('user_id', user.id); // IMPORTANT: Supprimer seulement ses propres PDFs
        } catch (supabaseError) {
        console.warn('💾 Erreur nettoyage Supabase:', supabaseError);
        }
      }

      // Nettoyer localStorage
      localStorage.removeItem('allSavedPDFs');
    } catch (error) {
      console.error('💾 Erreur nettoyage complet:', error);
    }
  }

  // UTILITAIRES PRIVÉS
  private static getLocalPDFs(): Record<string, any> {
    try {
      const data = localStorage.getItem('allSavedPDFs');
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('💾 Erreur lecture localStorage:', error);
      return {};
    }
  }
}