import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PDFField, PDFTemplate } from '../types/pdf';

export class PDFGenerator {
  static async generatePDF(
    template
  )
}: PDFTemplate,
    data: Record<string, any>,
    originalPdfBytes: Uint8Array
  ): Promise<Uint8Array> {
    try {
      console.log('🎨 ===== DÉBUT GÉNÉRATION PDF =====');
      console.log('🎨 Template:', template.name);
      console.log('🎨 Data reçue:', data);
      console.log('🎨 Data keys:', Object.keys(data));
      console.log('🎨 Template fields:', template.fields?.length || 0);
      
      // Debug spécial pour les images
      const imageData = Object.entries(data).filter(([key, value]) => 
        typeof value === 'string' && value.startsWith('data:image')
      );
      console.log('🖼️ IMAGES TROUVÉES DANS DATA:', imageData.length);
      imageData.forEach(([key, value], index) => {
        console.log(`🖼️ Image ${index + 1}: clé="${key}", taille=${typeof value === 'string' ? value.length : 0} caractères`);
      });
      
      // Debug des champs image du template
      const imageFields = template.fields.filter(field => field.type === 'image');
      console.log('🎯 CHAMPS IMAGE DANS TEMPLATE:', imageFields.length);
      imageFields.forEach((field, index) => {
        console.log(`🎯 Champ image ${index + 1}: variable="${field.variable}", position=(${field.x}, ${field.y}), taille=${field.width}x${field.height}`);
      });
      
      // Collecter tous les fichiers/images du formulaire
      const formFiles = Object.entries(data).filter(([key, value]) => 
        typeof value === 'string' && value.startsWith('data:image')
      );
      console.log('📁 ===== FICHIERS FORMULAIRE =====');
      console.log('📁 Nombre total de fichiers image:', formFiles.length);
      formFiles.forEach(([key, value], index) => {
        console.log(`📁 Fichier ${index + 1}:`);
        console.log(`📁   - Clé: "${key}"`);
        console.log(`📁   - Type: ${typeof value}`);
        console.log(`📁   - Est base64: ${typeof value === 'string' && value.startsWith('data:image')}`);
        console.log(`📁   - Taille: ${typeof value === 'string' ? value.length : 0} caractères`);
        console.log(`📁   - Format: ${typeof value === 'string' ? value.substring(0, 30) + '...' : 'N/A'}`);
      });
      
      // Collecter tous les fichiers/images du formulaire
      const formFiles = Object.entries(data).filter(([key, value]) => 
        typeof value === 'string' && value.startsWith('data:image')
      );
      console.log('📁 ===== FICHIERS FORMULAIRE =====');
      console.log('📁 Nombre total de fichiers image:', formFiles.length);
      formFiles.forEach(([key, value], index) => {
        console.log(`📁 Fichier ${index + 1}:`);
        console.log(`📁   - Clé: "${key}"`);
        console.log(`📁   - Type: ${typeof value}`);
        console.log(`📁   - Est base64: ${typeof value === 'string' && value.startsWith('data:image')}`);
        console.log(`📁   - Taille: ${typeof value === 'string' ? value.length : 0} caractères`);
        console.log(`📁   - Format: ${typeof value === 'string' ? value.substring(0, 30) + '...' : 'N/A'}`);
      });
      
      // Détection mobile pour ajustements spécifiques
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        console.log('📱 MOBILE: Génération PDF avec template - optimisations activées');
        
        // Optimisations spécifiques mobiles
        await new Promise(resolve => setTimeout(resolve, 200)); // Délai pour stabiliser
      }
      
      // Charger le PDF original
      let pdfDoc;
      try {
        console.log('🎨 Chargement PDF original...');
        
        // Sur mobile, utiliser des options de chargement optimisées
        const loadOptions = isMobile ? {
          ignoreEncryption: true,
          parseSpeed: 1, // Plus lent mais plus stable
          maxMemoryUsage: 50 * 1024 * 1024, // 50MB max
        } : {};
        
        pdfDoc = await PDFDocument.load(originalPdfBytes);
      } catch (error) {
        console.error('🎨 ❌ Erreur chargement PDF:', error);
        
        // Retry avec options simplifiées sur mobile
        if (isMobile) {
          console.log('📱 Retry chargement PDF avec options simplifiées...');
          try {
            await new Promise(resolve => setTimeout(resolve, 500));
            pdfDoc = await PDFDocument.load(originalPdfBytes);
          } catch (retryError) {
            console.error('📱 ❌ Retry échoué:', retryError);
            throw new Error('Impossible de charger le PDF sur mobile: ' + retryError.message);
          }
        } else {
          throw new Error('Impossible de charger le PDF original: ' + error.message);
        }
      }
      
      const pages = pdfDoc.getPages();
      console.log('🎨 PDF chargé, pages:', pages.length);
      
      // Police par défaut
      let font, boldFont;
      try {
        console.log('🎨 Chargement des polices...');
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      } catch (error) {
        console.error('🎨 ❌ Erreur chargement polices:', error);
        
        // Sur mobile, essayer avec une seule police
        if (isMobile) {
          console.log('📱 Fallback: utilisation police unique...');
          try {
            font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            boldFont = font; // Utiliser la même police
          } catch (fontError) {
            throw new Error('Impossible de charger les polices sur mobile: ' + fontError.message);
          }
        } else {
          throw new Error('Impossible de charger les polices: ' + error.message);
        }
      }
      console.log('🎨 Polices chargées');

      // Traiter chaque champ
      let processedFields = 0;
      const totalFields = template.fields.length;
      
      let fileIndex = 0; // Index pour lier automatiquement les fichiers
      
      console.log('🎨 ===== TRAITEMENT DES CHAMPS =====');
      
      for (const field of template.fields) {
        console.log(`🎨 ===== CHAMP ${processedFields + 1}/${totalFields} =====`);
        console.log(`🎨 Variable: "${field.variable}"`);
        console.log(`🎨 Type: ${field.type}`);
        console.log(`🎨 Position: (${field.x}, ${field.y})`);
        console.log(`🎨 Taille: ${field.width}x${field.height}`);
        
        // Sur mobile, ajouter des pauses entre les champs pour éviter les blocages
        if (isMobile && processedFields > 0 && processedFields % 3 === 0) {
          console.log(`📱 Pause mobile après ${processedFields} champs...`);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        const page = pages[field.page - 1];
        if (!page) continue;

        let value;
        
        // Pour les champs image, utiliser automatiquement les fichiers du formulaire
        if (field.type === 'image') {
          console.log(`🖼️ ===== TRAITEMENT CHAMP IMAGE =====`);
          console.log(`🖼️ Variable recherchée: "${field.variable}"`);
          console.log(`🖼️ Données disponibles:`, Object.keys(data));
          
          // D'abord essayer de récupérer la valeur via la variable normale
          value = this.getFieldValue(field, data);
          
          // Si pas trouvé et qu'on a des fichiers disponibles, utiliser l'assignation automatique
          if (!value && fileIndex < formFiles.length) {
            value = formFiles[fileIndex][1];
            console.log(`🖼️ ✅ ASSIGNATION AUTOMATIQUE:`);
            console.log(`🖼️   - Champ: ${field.variable}`);
            console.log(`🖼️   - Fichier auto: ${fileIndex + 1}/${formFiles.length}`);
            console.log(`🖼️   - Clé source: "${formFiles[fileIndex][0]}"`);
            fileIndex++;
          } else if (value) {
            console.log(`🖼️ ✅ VALEUR TROUVÉE VIA VARIABLE:`);
            console.log(`🖼️   - Champ: ${field.variable}`);
            console.log(`🖼️   - Taille: ${typeof value === 'string' ? value.length : 0} caractères`);
          } else {
            console.log(`🖼️ ❌ AUCUN FICHIER DISPONIBLE:`);
            console.log(`🖼️   - Champ: ${field.variable}`);
            console.log(`🖼️   - Fichiers disponibles: ${formFiles.length}`);
            value = null;
          }
        } else {
          value = this.getFieldValue(field, data);
        }
        
        console.log(`🎨 Valeur finale pour "${field.variable}": ${
          typeof value === 'string' && value.startsWith('data:image') 
            ? `IMAGE_BASE64 (${value.length} caractères)` 
            : `"${value}"`
        }`);
        
        if (!value && !field.required) {
          console.log(`🎨 ⏭️ Champ vide et non requis, ignoré`);
          processedFields++;
          continue;
        }

        const { height: pageHeight } = page.getSize();
        
        // Convertir les coordonnées (PDF utilise un système de coordonnées différent)
        const x = field.x;
        const y = pageHeight - field.y - field.height;
        
        console.log(`🎨 Position finale: x=${x}, y=${y}, page=${field.page}`);

        switch (field.type) {
          case 'text':
          case 'number':
            try {
              await this.drawText(page, value, x, y, field, font);
              console.log(`🎨 ✅ Texte dessiné: "${value}"`);
            } catch (error) {
              console.error(`🎨 ❌ Erreur dessin texte pour ${field.variable}:`, error);
              if (isMobile) {
                console.log('📱 Tentative de dessin texte simplifié...');
                try {
                  await this.drawSimpleText(page, value, x, y, field, font);
                } catch (simpleError) {
                  console.error('📱 ❌ Même le texte simplifié a échoué:', simpleError);
                }
              }
            }
            break;
            
          case 'date':
            const dateValue = this.formatDate(value);
            try {
              await this.drawText(page, dateValue, x, y, field, font);
              console.log(`🎨 ✅ Date dessinée: "${dateValue}"`);
            } catch (error) {
              console.error(`🎨 ❌ Erreur dessin date pour ${field.variable}:`, error);
            }
            break;
            
          case 'checkbox':
            try {
              await this.drawCheckbox(page, value, x, y, field);
              console.log(`🎨 ✅ Checkbox dessinée: ${value}`);
            } catch (error) {
              console.error(`🎨 ❌ Erreur dessin checkbox pour ${field.variable}:`, error);
            }
            break;
            
          case 'signature':
            if (value && typeof value === 'string' && value.startsWith('data:image')) {
              try {
                console.log(`✍️ ===== TRAITEMENT SIGNATURE =====`);
                console.log(`✍️ Variable: ${field.variable}`);
                console.log(`✍️ Taille données: ${value.length} caractères`);
                await this.drawSignature(pdfDoc, page, value, x, y, field);
                console.log(`✍️ ✅ Signature dessinée avec succès`);
              } catch (error) {
                console.error(`✍️ ❌ Erreur dessin signature pour ${field.variable}:`, error);
                if (isMobile) {
                  console.log('📱 Signature ignorée sur mobile (trop complexe)');
                }
              }
            } else {
              console.log(`✍️ ❌ Champ signature ignoré - pas de données valides`);
              console.log(`✍️ Variable: ${field.variable}, Value type: ${typeof value}`);
            }
            break;
            
          case 'image':
            if (value && typeof value === 'string' && (value.startsWith('data:image') || value.startsWith('http'))) {
              try {
                console.log(`🖼️ ===== DÉBUT DESSIN IMAGE =====`);
                console.log(`🖼️ Variable: ${field.variable}`);
                console.log(`🖼️ Position: (${x}, ${y})`);
                console.log(`🖼️ Taille: ${field.width}x${field.height}`);
                console.log(`🖼️ Type de données: ${value.startsWith('data:image') ? 'base64' : 'URL'}`);
                console.log(`🖼️ Début données: ${value.substring(0, 50)}...`);
                await this.drawImage(pdfDoc, page, value, x, y, field);
                console.log(`🖼️ ✅ IMAGE DESSINÉE AVEC SUCCÈS`);
              } catch (error) {
                console.error(`🖼️ ❌ ERREUR DESSIN IMAGE:`, error);
                console.error(`🖼️ Stack trace:`, error.stack);
                console.error(`🖼️ Variable problématique: ${field.variable}`);
                console.error(`🖼️ Données: ${value.substring(0, 100)}...`);
                  console.log('📱 ❌ Image ignorée sur mobile (erreur)');
                }
            } else {
              console.log(`🖼️ ❌ CHAMP IMAGE IGNORÉ:`);
              console.log(`🖼️   - Champ: ${field.variable}`);
              console.log(`🖼️   - Type valeur: ${typeof value}`);
              console.log(`🖼️   - Valeur: ${typeof value === 'string' ? value.substring(0, 50) + '...' : value}`);
              console.log(`🖼️   - Est string: ${typeof value === 'string'}`);
              console.log(`🖼️   - Commence par data:image: ${typeof value === 'string' && value.startsWith('data:image')}`);
              console.log(`🖼️   - Commence par http: ${typeof value === 'string' && value.startsWith('http')}`);
            }
            break;
        }
        }
        
        processedFields++;
        
        // Progression sur mobile
        if (isMobile) {
          console.log(`📱 Progression: ${processedFields}/${totalFields} champs traités`);
        }
      }

      console.log('🎨 Tous les champs traités, sauvegarde du PDF...');
      // Retourner le PDF généré
      let finalPdf;
      try {
        // Options de sauvegarde optimisées pour mobile
        const saveOptions = {};
        
        if (isMobile) {
          console.log('📱 Sauvegarde avec options mobiles optimisées...');
          // Pas d'options spéciales, utiliser les défauts
        }
        
        finalPdf = await pdfDoc.save(saveOptions);
      } catch (error) {
        console.error('🎨 ❌ Erreur sauvegarde PDF:', error);
        
        // Retry sur mobile avec options minimales
        if (isMobile) {
          console.log('📱 Retry sauvegarde PDF...');
          try {
            await new Promise(resolve => setTimeout(resolve, 300));
            finalPdf = await pdfDoc.save();
          } catch (retryError) {
            throw new Error('Impossible de sauvegarder le PDF sur mobile: ' + retryError.message);
          }
        } else {
          throw new Error('Impossible de sauvegarder le PDF: ' + error.message);
        }
      }
      
      console.log('🎨 PDF final généré, taille:', finalPdf.le
      )
    }
  }
}ngth);
      return finalPdf;
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      console.error('Stack trace:', error.stack);
      
      // Message d'erreur adapté selon l'appareil
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const errorMessage = isMobile 
        ? `Erreur génération PDF mobile avec template: ${error.message}`
        : `Impossible de générer le PDF: ${error.message}`;
      
      throw new Error(errorMessage);
    }
  }

  // Méthode de dessin de texte simplifiée pour mobile
  private static async drawSimpleText(
    page: any,
    text: string,
    x: number,
    y: number,
    field: PDFField,
    font: any
  ) {
    console.log('📱 Dessin texte simplifié mobile');
    
    // Version ultra-simplifiée pour mobile
    page.drawText(text.substring(0, 50), { // Limiter la longueur
      x: x + 2,
      y: y + 5,
      size: Math.min(field.fontSize || 12, 14), // Taille limitée
      font,
      color: rgb(0, 0, 0), // Couleur fixe
    });
  }
  private static getFieldValue(field: PDFField, data: Record<string, any>): string {
    // Extraire le nom de la variable (enlever ${})
    const variableName = field.variable.replace(/^\$\{|\}$/g, '');
    
    console.log(`🔍 Looking for variable: ${variableName} in data:`, Object.keys(data));
    
    let value = data[variableName];
    
    // Si pas trouvé, essayer avec différentes variations
    if (!value) {
      // Essayer la clé originale
      const originalKeys = Object.keys(data);
      const matchingKey = originalKeys.find(key => 
        this.normalizeKey(key) === variableName || key === variableName
      );
      
      if (matchingKey) {
        value = data[matchingKey];
        console.log(`🔍 Found via matching key: ${matchingKey} = ${value}`);
      } else {
        console.log(`🔍 Variable ${variableName} not found. Available keys:`, originalKeys);
        console.log(`🔍 Data values:`, Object.entries(data).map(([k, v]) => `${k}: ${typeof v === 'string' && v.startsWith('data:') ? 'base64_image' : v}`));
      }
    }
    
    // Pour les champs image, s'assurer qu'on a bien une image
    if (field.type === 'image') {
      if (value && typeof value === 'string' && value.startsWith('data:image')) {
        console.log(`🔍 ✅ Image field found: ${variableName}, length: ${value.length}`);
        return value;
      } else {
        console.log(`🔍 ❌ Image field "${variableName}" but no valid image data found`);
        console.log(`🔍 Value type: ${typeof value}, starts with data:image: ${typeof value === 'string' && value.startsWith('data:image')}`);
        return '';
      }
    }
    
    console.log(`🔍 Final value for ${variableName}:`, typeof value === 'string' && value.startsWith('data:') ? 'base64_data' : (value || field.placeholder || 'EMPTY'));
    
    return value || field.placeholder || '';
  }
  
  private static normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
      .replace(/[^a-z0-9]/g, '_') // Remplacer les caractères spéciaux par _
      .replace(/_+/g, '_') // Éviter les _ multiples
      .replace(/^_|_$/g, ''); // Enlever les _ en début/fin
  }

  private static async drawText(
    page: any,
    text: string,
    x: number,
    y: number,
    field: PDFField,
    font: any
  ) {
    const fontSize = field.fontSize || 12;
    const color = this.hexToRgb(field.fontColor || '#000000');
    
    // Dessiner le fond si spécifié
    if (field.backgroundColor && field.backgroundColor !== '#ffffff') {
      const bgColor = this.hexToRgb(field.backgroundColor);
      page.drawRectangle({
        x,
        y,
        width: field.width,
        height: field.height,
        color: rgb(bgColor.r, bgColor.g, bgColor.b),
      });
    }

    // Dessiner le texte
    page.drawText(text, {
      x: x + 5, // Petit padding
      y: y + (field.height - fontSize) / 2,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
    });
  }

  private static async drawCheckbox(
    page: any,
    value: boolean | string,
    x: number,
    y: number,
    field: PDFField
  ) {
    const isChecked = value === true || value === 'true' || value === '1';
    
    // Dessiner la case
    page.drawRectangle({
      x,
      y,
      width: Math.min(field.width, field.height),
      height: Math.min(field.width, field.height),
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Dessiner la coche si nécessaire
    if (isChecked) {
      const size = Math.min(field.width, field.height);
      page.drawText('✓', {
        x: x + size / 4,
        y: y + size / 4,
        size: size * 0.6,
        color: rgb(0, 0, 0),
      });
    }
  }

  private static async drawSignature(
    pdfDoc: any,
    page: any,
    signatureData: string,
    x: number,
    y: number,
    field: PDFField
  ) {
    try {
      // Convertir la signature base64 en image
      const imageBytes = this.base64ToBytes(signatureData);
      const image = await pdfDoc.embedPng(imageBytes);
      
      page.drawImage(image, {
        x,
        y,
        width: field.width,
        height: field.height,
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la signature:', error);
    }
  }

  private static async drawImage(
    pdfDoc: any,
    page: any,
    imageData: string,
    x: number,
    y: number,
    field: PDFField
  ) {
    console.log(`🖼️ ===== drawImage APPELÉE =====`);
    console.log(`🖼️ Position: (${x}, ${y})`);
    console.log(`🖼️ Taille: ${field.width}x${field.height}`);
    console.log(`🖼️ Type données: ${imageData.startsWith('data:image') ? 'base64' : 'URL'}`);
    
    try {
      let image;
      
      if (imageData.startsWith('data:image')) {
        console.log(`🖼️ Traitement image base64...`);
        // Image base64
        const imageBytes = this.base64ToBytes(imageData);
        console.log(`🖼️ Bytes extraits: ${imageBytes.length} bytes`);
        
        if (imageData.includes('data:image/png')) {
          console.log(`🖼️ Format détecté: PNG`);
          image = await pdfDoc.embedPng(imageBytes);
        } else if (imageData.includes('data:image/jpeg') || imageData.includes('data:image/jpg')) {
          console.log(`🖼️ Format détecté: JPEG`);
          image = await pdfDoc.embedJpg(imageBytes);
        } else {
          console.log(`🖼️ Format inconnu, tentative PNG...`);
          // Essayer PNG par défaut pour les autres formats
          try {
            image = await pdfDoc.embedPng(imageBytes);
            console.log(`🖼️ ✅ PNG réussi`);
          } catch {
            console.log(`🖼️ PNG échoué, tentative JPEG...`);
            // Si PNG échoue, essayer JPG
            image = await pdfDoc.embedJpg(imageBytes);
            console.log(`🖼️ ✅ JPEG réussi`);
          }
        }
      } else if (imageData.startsWith('http')) {
        console.log(`🖼️ Traitement image URL...`);
        // Image URL - télécharger d'abord
        const response = await fetch(imageData);
        const arrayBuffer = await response.arrayBuffer();
        const imageBytes = new Uint8Array(arrayBuffer);
        
        // Détecter le type d'image depuis l'URL ou les headers
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('png') || imageData.toLowerCase().includes('.png')) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
        }
      } else {
        throw new Error('Format d\'image non supporté');
      }
      
      console.log(`🖼️ Image embedée avec succès, dessin sur la page...`);
      
      page.drawImage(image, {
        x,
        y,
        width: field.width,
        height: field.height,
      });
      
      console.log(`🖼️ ✅ IMAGE DESSINÉE AVEC SUCCÈS !`);
    } catch (error) {
      console.error('🖼️ ❌ ERREUR CRITIQUE lors de l\'ajout de l\'image:', error);
      console.error('🖼️ Stack trace complète:', error.stack);
      console.error('🖼️ Données image problématiques:', imageData.substring(0, 100) + '...');
      
      // En cas d'erreur, dessiner un placeholder
      console.log(`🖼️ Dessin d'un placeholder à la place...`);
      page.drawRectangle({
        x,
        y,
        width: field.width,
        height: field.height,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });
      
      // Ajouter un texte d'erreur
      page.drawText('Image non disponible', {
        x: x + 5,
        y: y + field.height / 2,
        size: 8,
        color: rgb(0.5, 0.5, 0.5),
      });
      
      console.log(`🖼️ Placeholder dessiné`);
    }
  }

  private static formatDate(value: string): string {
    if (!value) return '';
    
    try {
      const date = new Date(value);
      return date.toLocaleDateString('fr-FR');
    } catch {
      return value;
    }
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    } : { r: 0, g: 0, b: 0 };
  }

  private static base64ToBytes(base64: string): Uint8Array {
    const base64Data = base64.split(',')[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
  }
}