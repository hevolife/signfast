import { supabase } from '../lib/supabase';
import { stripeConfig } from '../stripe-config';
import { PDFGenerator } from '../utils/pdfGenerator';

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

      // Vérifier si on est en mode impersonation
      const impersonationData = localStorage.getItem('admin_impersonation');
      let targetUserId = user.id;
      
      if (impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          targetUserId = data.target_user_id;
          console.log('💾 🎭 Mode impersonation: sauvegarde pour', data.target_email, 'userId:', targetUserId);
        } catch (error) {
          console.error('Erreur parsing impersonation data:', error);
        }
      }

      // Vérifier les limites avant de sauvegarder
      const currentPdfs = await this.listPDFs();
      
      // Vérifier si l'utilisateur est abonné (via les données Supabase)
      let isSubscribed = false;
      try {
        // Vérifier l'abonnement Stripe
        const { data: stripeSubscription } = await supabase
          .from('stripe_user_subscriptions')
          .select('subscription_status')
          .eq('customer_id', targetUserId)
          .limit(1);
        
        const hasStripeAccess = stripeSubscription && stripeSubscription.length > 0 && 
                               (stripeSubscription[0].subscription_status === 'active' || 
                                stripeSubscription[0].subscription_status === 'trialing');
        
        // Vérifier les codes secrets
        const { data: secretCodeData } = await supabase
          .from('user_secret_codes')
          .select(`
            expires_at,
            secret_codes (type)
          `)
          .eq('user_id', targetUserId)
          .or('expires_at.is.null,expires_at.gt.now()')
          .limit(1);

        const hasActiveSecretCode = secretCodeData && secretCodeData.length > 0;
        
        // L'utilisateur est considéré comme abonné s'il a un abonnement Stripe OU un code secret actif
        isSubscribed = hasStripeAccess || hasActiveSecretCode;
        
        console.log('💾 Vérification abonnement:', {
          hasStripeAccess,
          hasActiveSecretCode,
          isSubscribed,
          currentPdfs: currentPdfs.length,
          limit: stripeConfig.freeLimits.maxSavedPdfs
        });
      } catch (error) {
        console.warn('💾 Erreur vérification abonnement:', error);
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
        user_id: targetUserId, // IMPORTANT: Associer le PDF à l'utilisateur cible (impersonation)
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

  // COMPTER LES PDFS (optimisé pour éviter les timeouts)
  static async countPDFs(): Promise<number> {
    try {
      const targetUserId = await PDFService.getTargetUserId();
      if (!targetUserId) {
        return 0;
      }

      const { count, error } = await supabase
        .from('pdf_storage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', targetUserId);

      if (error) {
        console.error('💾 Erreur count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('💾 Erreur count PDFs:', error);
      return 0;
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
      console.log('💾 === DÉBUT listPDFs ===');
      const targetUserId = await PDFService.getTargetUserId();
      console.log('💾 Target user ID récupéré:', targetUserId);
      
      if (!targetUserId) {
        console.log('💾 Aucun target user ID, retour liste vide');
        return [];
      }

      console.log('💾 Requête Supabase pour user_id:', targetUserId);
      const { data, error } = await supabase
        .from('pdf_storage')
        .select('file_name, response_id, template_name, form_title, form_data, file_size, created_at')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('💾 Erreur Supabase listPDFs:', error);
        return [];
      }

      console.log('💾 Données Supabase reçues:', data?.length || 0, 'PDFs');
      data?.forEach((item, index) => {
        console.log(`💾 PDF ${index + 1}:`, {
          fileName: item.file_name,
          formTitle: item.form_title,
          templateName: item.template_name,
          userId: targetUserId,
          createdAt: item.created_at
        });
      });
      return (data || []).map(item => ({
        fileName: item.file_name,
        responseId: item.response_id || 'supabase',
        templateName: item.template_name || 'Template PDF',
        formTitle: item.form_title,
        createdAt: item.created_at,
        size: item.file_size || 0,
        formData: item.form_data || {},
      }));
    } catch (error) {
      console.error('💾 ❌ Erreur chargement PDFs:', error);
      return [];
    }
  }

  // SUPPRIMER UN PDF
  static async deletePDF(fileName: string): Promise<boolean> {
    try {
      const targetUserId = await PDFService.getTargetUserId();
      if (!targetUserId) {
        return false;
      }

      const { error } = await supabase
        .from('pdf_storage')
        .delete()
        .eq('file_name', fileName)
        .eq('user_id', targetUserId);

      if (error) {
        console.error('💾 Erreur suppression:', error);
        return false;
      }

      return true;
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
      const targetUserId = await PDFService.getTargetUserId();
      if (!targetUserId) {
        return;
      }

      const { error } = await supabase
        .from('pdf_storage')
        .delete()
        .eq('user_id', targetUserId);

      if (error) {
        console.error('💾 Erreur nettoyage:', error);
      }
    } catch (error) {
      console.error('💾 Erreur nettoyage complet:', error);
    }
  }

  // RÉCUPÉRER L'ID DE L'UTILISATEUR CIBLE (avec gestion impersonation)
  private static async getTargetUserId(): Promise<string | null> {
    try {
      console.log('💾 === getTargetUserId ===');
      
      // Récupérer l'utilisateur actuel
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('💾 Utilisateur non connecté:', userError?.message);
        return null;
      }

      console.log('💾 Utilisateur auth connecté:', user.id, user.email);

      // Vérifier si on est en mode impersonation
      const impersonationData = localStorage.getItem('admin_impersonation');
      console.log('💾 Données impersonation brutes:', impersonationData);
      
      if (impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          console.log('💾 🎭 Mode impersonation détecté:', {
            target_user_id: data.target_user_id,
            target_email: data.target_email,
            admin_user_id: data.admin_user_id
          });
          return data.target_user_id;
        } catch (error) {
          console.error('Erreur parsing impersonation data:', error);
        }
      }

      // Mode normal
      console.log('💾 Mode normal, user_id:', user.id);
      return user.id;
    } catch (error) {
      console.error('💾 Erreur récupération target user ID:', error);
      return null;
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