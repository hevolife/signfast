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
      // Essayer Supabase d'abord
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (!userError && user) {
          // Vérifier si on est en mode impersonation
          const impersonationData = localStorage.getItem('admin_impersonation');
          let targetUserId = user.id;
          
          if (impersonationData) {
            try {
              const data = JSON.parse(impersonationData);
              targetUserId = data.target_user_id;
              console.log('🎭 Mode impersonation: comptage des PDFs pour', data.target_email, 'userId:', targetUserId);
            } catch (error) {
              console.error('Erreur parsing impersonation data:', error);
            }
          }

          console.log('💾 Count PDFs pour userId:', targetUserId);
          
          const { count, error } = await supabase
            .from('pdf_storage')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', targetUserId);

          console.log('💾 Résultat count:', { count, error: error?.message });

          if (!error && count !== null) {
            console.log('💾 Nombre de PDFs Supabase pour userId', targetUserId, ':', count);
            return count;
          } else {
            console.warn('💾 Erreur count Supabase:', error?.message || 'Count null');
          }
        } else {
          console.log('💾 Utilisateur non connecté pour count');
        }
      } catch (supabaseError) {
        console.warn('💾 Erreur Supabase count (ignorée):', supabaseError);
      }

      // Fallback localStorage
      try {
        const localPDFs = this.getLocalPDFs();
        const localCount = Object.keys(localPDFs).length;
        console.log('💾 Nombre de PDFs localStorage:', localCount);
        return localCount;
      } catch (localError) {
        console.warn('💾 Erreur count local:', localError);
        return 0;
      }
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
      console.log('💾 🔍 === DÉBUT listPDFs AVEC DEBUG IMPERSONATION ===');
      const allPDFs: any[] = [];

      // 1. Vérifier l'impersonation en premier
      const impersonationData = localStorage.getItem('admin_impersonation');
      console.log('💾 🎭 Données impersonation:', impersonationData);
      
      let targetUserId: string | null = null;
      
      if (impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          targetUserId = data.target_user_id;
          console.log('💾 🎭 IMPERSONATION ACTIVE:', {
            adminEmail: data.admin_email,
            targetEmail: data.target_email,
            targetUserId: data.target_user_id,
            timestamp: new Date(data.timestamp).toLocaleString()
          });
        } catch (parseError) {
          console.error('💾 🎭 Erreur parsing impersonation:', parseError);
        }
      }
      
      // 2. Récupérer l'utilisateur auth si pas d'impersonation
      if (!targetUserId) {
        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (!userError && user) {
            targetUserId = user.id;
            console.log('💾 👤 Utilisateur normal:', user.email, 'userId:', user.id);
          } else {
            console.log('💾 ❌ Aucun utilisateur connecté');
            return [];
          }
        } catch (authError) {
          console.error('💾 ❌ Erreur auth:', authError);
          return [];
        }
      }
      
      console.log('💾 🎯 TARGET USER ID FINAL:', targetUserId);
      
      // 3. Debug complet de la base de données
      try {
        // Compter tous les PDFs
        const { count: totalCount } = await supabase
          .from('pdf_storage')
          .select('*', { count: 'exact', head: true });
        console.log('💾 📊 Total PDFs dans la table:', totalCount);
        
        // Lister tous les user_ids
        const { data: allPdfs } = await supabase
          .from('pdf_storage')
          .select('user_id, file_name, form_title, created_at')
          .limit(100);
        
        if (allPdfs) {
          console.log('💾 📊 Tous les PDFs dans la base:');
          allPdfs.forEach((pdf, index) => {
            console.log(`💾   ${index + 1}. userId: ${pdf.user_id}, file: ${pdf.file_name}, form: ${pdf.form_title}`);
          });
          
          const uniqueUserIds = [...new Set(allPdfs.map(p => p.user_id))];
          console.log('💾 📊 User IDs uniques avec PDFs:', uniqueUserIds);
          console.log('💾 📊 Notre target userId dans la liste?', uniqueUserIds.includes(targetUserId));
          
          // Filtrer pour notre utilisateur
          const userPdfs = allPdfs.filter(pdf => pdf.user_id === targetUserId);
          console.log('💾 🎯 PDFs pour notre utilisateur:', userPdfs.length);
          
          if (userPdfs.length > 0) {
            console.log('💾 ✅ PDFs trouvés pour l\'utilisateur:');
            userPdfs.forEach((pdf, index) => {
              console.log(`💾   ${index + 1}. ${pdf.file_name} - ${pdf.form_title} (${pdf.created_at})`);
            });
            
            const formattedPdfs = userPdfs.map(item => ({
              fileName: item.file_name,
              responseId: 'supabase',
              templateName: 'Template PDF',
              formTitle: item.form_title,
              createdAt: item.created_at,
              size: 0,
              formData: {},
            }));
            
            setPdfs(formattedPdfs);
            console.log('💾 ✅ PDFs définis dans l\'état:', formattedPdfs.length);
          } else {
            console.log('💾 ❌ Aucun PDF trouvé pour cet utilisateur');
            setPdfs([]);
          }
        }
      } catch (supabaseError) {
        console.error('💾 ❌ Erreur Supabase:', supabaseError);
        setPdfs([]);
      }
    } catch (error) {
      console.error('💾 ❌ Erreur chargement PDFs:', error);
      toast.error('Erreur lors du chargement des PDFs');
      setPdfs([]);
    } finally {
      setLoading(false);
    }
  };

  // SUPPRIMER UN PDF
  static async deletePDF(fileName: string): Promise<boolean> {
    try {
      console.log('💾 Suppression PDF:', fileName);
      
      let deleted = false;

      // Essayer de supprimer depuis Supabase d'abord
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (!userError && user) {
          // Vérifier si on est en mode impersonation
          const impersonationData = localStorage.getItem('admin_impersonation');
          let targetUserId = user.id;
          
          if (impersonationData) {
            try {
              const data = JSON.parse(impersonationData);
              targetUserId = data.target_user_id;
              console.log('🎭 Mode impersonation: suppression PDF pour', data.target_email);
            } catch (error) {
              console.error('Erreur parsing impersonation data:', error);
            }
          }

          const { error } = await supabase
            .from('pdf_storage')
            .delete()
            .eq('file_name', fileName)
            .eq('user_id', targetUserId);

          if (!error) {
            console.log('💾 PDF supprimé de Supabase');
            deleted = true;
          } else {
            console.warn('💾 Erreur suppression Supabase:', error.message);
          }
        }
      } catch (supabaseError) {
        console.warn('💾 Erreur Supabase lors suppression:', supabaseError);
      }

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
      // Nettoyer depuis Supabase pour l'utilisateur connecté
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (!userError && user) {
          // Vérifier si on est en mode impersonation
          const impersonationData = localStorage.getItem('admin_impersonation');
          let targetUserId = user.id;
          
          if (impersonationData) {
            try {
              const data = JSON.parse(impersonationData);
              targetUserId = data.target_user_id;
              console.log('🎭 Mode impersonation: nettoyage PDFs pour', data.target_email);
            } catch (error) {
              console.error('Erreur parsing impersonation data:', error);
            }
          }

          const { error } = await supabase
            .from('pdf_storage')
            .delete()
            .eq('user_id', targetUserId);

          if (!error) {
            console.log('💾 PDFs Supabase nettoyés pour l\'utilisateur');
          } else {
            console.warn('💾 Erreur nettoyage Supabase:', error.message);
          }
        }
      } catch (supabaseError) {
        console.warn('💾 Erreur Supabase lors nettoyage:', supabaseError);
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