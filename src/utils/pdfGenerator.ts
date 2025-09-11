import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PDFField, PDFTemplate } from '../types/pdf';

export class PDFGenerator {
  static async generatePDF(
    template: PDFTemplate,
    data: Record<string, any>,
    originalPdfBytes: Uint8Array
  ): Promise<Uint8Array> {
    try {
      console.log('🎨 PDFGenerator.generatePDF');
      console.log('🎨 Template:', template.name);
      console.log('🎨 Data keys:', Object.keys(data));
      console.log('🎨 Template fields:', template.fields?.length || 0);
      
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
      
      for (const field of template.fields) {
        console.log(`🎨 Traitement champ: ${field.variable} (${field.type})`);
        
        // Sur mobile, ajouter des pauses entre les champs pour éviter les blocages
        if (isMobile && processedFields > 0 && processedFields % 3 === 0) {
          console.log(`📱 Pause mobile après ${processedFields} champs...`);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        const page = pages[field.page - 1];
        if (!page) continue;

        const value = this.getFieldValue(field, data);
        console.log(`🎨 Valeur trouvée: "${value}"`);
        
        if (!value && !field.required) {
          console.log(`🎨 Champ vide et non requis, ignoré`);
          processedFields++;
          continue;
        }

        const { height: pageHeight } = page.getSize();
        
        // Convertir les coordonnées (PDF utilise un système de coordonnées différent)
        const x = field.x;
        const y = pageHeight - field.y - field.height;
        
        console.log(`🎨 Position: x=${x}, y=${y}`);

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
                await this.drawSignature(pdfDoc, page, value, x, y, field);
                console.log(`🎨 ✅ Signature dessinée`);
              } catch (error) {
                console.error(`🎨 ❌ Erreur dessin signature pour ${field.variable}:`, error);
                if (isMobile) {
                  console.log('📱 Signature ignorée sur mobile (trop complexe)');
                }
              }
            }
            break;
            
          case 'image':
            if (value && typeof value === 'string' && value.startsWith('data:image')) {
              try {
                await this.drawImage(pdfDoc, page, value, x, y, field);
                console.log(`🎨 ✅ Image dessinée`);
              } catch (error) {
                console.error(`🎨 ❌ Erreur dessin image pour ${field.variable}:`, error);
                if (isMobile) {
                  console.log('📱 Image ignorée sur mobile (trop complexe)');
                }
              }
            }
            break;
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
      
      console.log('🎨 PDF final généré, taille:', finalPdf.length);
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
    
    console.log(`🔍 Looking for variable: ${variableName}`);
    
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
        console.log(`🔍 Available keys:`, originalKeys);
      }
    }
    
    console.log(`🔍 Final value for ${variableName}:`, value || field.placeholder || 'EMPTY');
    
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
    try {
      const imageBytes = this.base64ToBytes(imageData);
      const image = imageData.includes('data:image/png') 
        ? await pdfDoc.embedPng(imageBytes)
        : await pdfDoc.embedJpg(imageBytes);
      
      page.drawImage(image, {
        x,
        y,
        width: field.width,
        height: field.height,
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'image:', error);
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