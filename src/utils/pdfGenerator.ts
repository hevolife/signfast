import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PDFField, PDFTemplate } from '../types/pdf';

export class PDFGenerator {
  static async generatePDF(
    template: PDFTemplate,
    data: Record<string, any>,
    originalPdfBytes: Uint8Array
  ): Promise<Uint8Array> {
    try {
      console.log('🎨 === GÉNÉRATION PDF ===');
      console.log('🎨 Template:', template.name);
      console.log('🎨 Champs:', template.fields.length);
      console.log('🎨 Données:', Object.keys(data));
      
      // Charger le PDF original
      const pdfDoc = await PDFDocument.load(originalPdfBytes);
      const pages = pdfDoc.getPages();
      console.log('🎨 PDF chargé:', pages.length, 'pages');
      
      // Charger les polices
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Traiter chaque champ
      for (const field of template.fields) {
        const pageIndex = (field.page || 1) - 1;
        const page = pages[pageIndex];
        
        if (!page) {
          console.warn(`Page ${field.page} non trouvée`);
          continue;
        }
        
        // Lire la taille réelle de la page en points
        const { width: pdfWidth, height: pdfHeight } = page.getSize();
        console.log(`📐 Page ${field.page} dimensions: ${pdfWidth} × ${pdfHeight} points`);
        
        // Calculer les coordonnées PDF depuis les ratios avec offset ajustable
        const pdfX = (field.xRatio || 0) * pdfWidth + (field.offsetX || 0);
        const pdfY = (1 - (field.yRatio || 0) - (field.heightRatio || 0.05)) * pdfHeight + (field.offsetY || 0);
        const pdfFieldWidth = (field.widthRatio || 0.1) * pdfWidth;
        const pdfFieldHeight = (field.heightRatio || 0.05) * pdfHeight;
        
        console.log(`🎨 Champ ${field.variable}:`);
        console.log(`🎨   Ratios: (${(field.xRatio || 0).toFixed(4)}, ${(field.yRatio || 0).toFixed(4)}, ${(field.widthRatio || 0.1).toFixed(4)}, ${(field.heightRatio || 0.05).toFixed(4)})`);
        console.log(`🎨   Offsets: (${field.offsetX || 0}, ${field.offsetY || 0}) points`);
        console.log(`🎨   PDF: (${Math.round(pdfX)}, ${Math.round(pdfY)}) ${Math.round(pdfFieldWidth)}×${Math.round(pdfFieldHeight)}`);
        
        const value = this.getFieldValue(field, data);
        
        console.log(`🎨 Valeur: "${value}"`);
        
        if (!value && !field.required) {
          continue;
        }

        switch (field.type) {
          case 'text':
          case 'number':
            await this.drawText(page, value, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight, field, font);
            break;
            
          case 'date':
            const dateValue = this.formatDate(value);
            await this.drawText(page, dateValue, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight, field, font);
            break;
            
          case 'checkbox':
            await this.drawCheckbox(page, value, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight, field);
            break;
            
          case 'signature':
            if (value && typeof value === 'string' && value.startsWith('data:image')) {
              await this.drawSignature(pdfDoc, page, value, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight);
            }
            break;
            
          case 'image':
            if (value && typeof value === 'string' && value.startsWith('data:image')) {
              await this.drawImage(pdfDoc, page, value, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight);
            }
            break;
        }
      }

      console.log('🎨 Génération terminée, sauvegarde...');
      const finalPdf = await pdfDoc.save();
      console.log('🎨 PDF final:', finalPdf.length, 'bytes');
      
      return finalPdf;
    } catch (error) {
      console.error('🎨 Erreur génération PDF:', error);
      throw new Error(`Impossible de générer le PDF: ${error.message}`);
    }
  }

  private static getFieldValue(field: PDFField, data: Record<string, any>): string {
    const variableName = field.variable.replace(/^\$\{|\}$/g, '');
    
    console.log(`🔍 Recherche variable: "${variableName}"`);
    console.log(`🔍 Clés disponibles:`, Object.keys(data));
    
    let value = data[variableName];
    
    // Recherche étendue si pas trouvé
    if (!value) {
      const originalKeys = Object.keys(data);
      
      // Recherche exacte
      let matchingKey = originalKeys.find(key => key === variableName);
      
      // Recherche insensible à la casse
      if (!matchingKey) {
        matchingKey = originalKeys.find(key => 
          key.toLowerCase() === variableName.toLowerCase()
        );
      }
      
      // Recherche normalisée
      if (!matchingKey) {
        matchingKey = originalKeys.find(key => 
          this.normalizeKey(key) === this.normalizeKey(variableName)
        );
      }
      
      if (matchingKey) {
        value = data[matchingKey];
        console.log(`🔍 Trouvé via clé: "${matchingKey}" = "${value}"`);
      } else {
        console.log(`🔍 Variable "${variableName}" non trouvée`);
      }
    }
    
    return value || field.placeholder || '';
  }
  
  private static normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private static async drawText(
    page: any,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    field: PDFField,
    font: any
  ) {
    const fontSize = field.fontSize || 12;
    const color = this.hexToRgb(field.fontColor || '#000000');
    
    console.log(`✏️ Dessin texte "${text}" à (${Math.round(x)}, ${Math.round(y)}) taille ${Math.round(width)}×${Math.round(height)}`);
    
    // Fond si spécifié
    if (field.backgroundColor && field.backgroundColor !== '#ffffff') {
      const bgColor = this.hexToRgb(field.backgroundColor);
      page.drawRectangle({
        x,
        y,
        width,
        height,
        color: rgb(bgColor.r, bgColor.g, bgColor.b),
      });
    }

    // Dessiner le texte avec positionnement précis
    page.drawText(text, {
      x: x + 2,
      y: y + 2,
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
    width: number,
    height: number,
    field: PDFField
  ) {
    const isChecked = value === true || value === 'true' || value === '1';
    const size = Math.min(width, height, 16);
    
    console.log(`☑️ Dessin checkbox à (${Math.round(x)}, ${Math.round(y)}) taille ${Math.round(size)} - ${isChecked ? 'cochée' : 'vide'}`);
    
    // Case
    page.drawRectangle({
      x,
      y,
      width: size,
      height: size,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });

    // Coche
    if (isChecked) {
      page.drawText('✓', {
        x: x + size * 0.1,
        y: y + size * 0.1,
        size: size * 0.7,
        color: rgb(0, 0.6, 0),
      });
    }
  }

  private static async drawSignature(
    pdfDoc: any,
    page: any,
    signatureData: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    try {
      console.log(`✍️ Dessin signature à (${Math.round(x)}, ${Math.round(y)}) taille ${Math.round(width)}×${Math.round(height)}`);
      console.log(`✍️ Données signature:`, signatureData.substring(0, 50) + '...');
      
      // Validation des données de signature
      if (!signatureData || !signatureData.startsWith('data:image')) {
        throw new Error('Données de signature invalides ou manquantes');
      }

      console.log(`✍️ Validation signature OK, format: ${signatureData.substring(0, 30)}`);
      
      // Extraire et valider les données base64
      const [header, base64Data] = signatureData.split(',');
      
      if (!base64Data || base64Data.length === 0) {
        throw new Error('Données base64 vides après extraction');
      }
      
      console.log(`✍️ Header: ${header}`);
      console.log(`✍️ Base64 data length: ${base64Data.length}`);
      
      // Validation du format base64
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
        throw new Error('Caractères base64 invalides détectés');
      }
      
      // Conversion manuelle plus robuste
      let imageBytes: Uint8Array;
      try {
        const binaryString = atob(base64Data);
        imageBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          imageBytes[i] = binaryString.charCodeAt(i);
        }
        console.log(`✍️ Conversion base64 réussie: ${imageBytes.length} bytes`);
      } catch (conversionError) {
        throw new Error(`Échec conversion base64: ${conversionError.message}`);
      }
      
      // Forcer le format PNG pour les signatures (plus fiable)
      let image;
      try {
        console.log(`✍️ Tentative embedding PNG...`);
        image = await pdfDoc.embedPng(imageBytes);
        console.log(`✍️ PNG embedding réussi`);
      } catch (pngError) {
        console.log(`✍️ PNG échec, tentative JPEG...`);
        try {
          image = await pdfDoc.embedJpg(imageBytes);
          console.log(`✍️ JPEG embedding réussi`);
        } catch (jpegError) {
          throw new Error(`Impossible d'embedder l'image: PNG(${pngError.message}) JPEG(${jpegError.message})`);
        }
      }
      
      console.log(`✍️ Image embedée avec succès, dimensions originales: ${image.width}x${image.height}`);
      
      // Dessiner un fond blanc pour la signature
      page.drawRectangle({
        x,
        y,
        width,
        height,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.5,
      });
      
      console.log(`✍️ Fond dessiné, dessin de l'image...`);
      
      // Calculer les dimensions en gardant les proportions
      const aspectRatio = image.width / image.height;
      let displayWidth = width - 4; // Marge de 2px de chaque côté
      let displayHeight = height - 4;
      
      // Ajuster pour garder les proportions
      if (displayWidth / displayHeight > aspectRatio) {
        displayWidth = displayHeight * aspectRatio;
      } else {
        displayHeight = displayWidth / aspectRatio;
      }
      
      // Centrer dans l'espace disponible
      const offsetX = (width - displayWidth) / 2;
      const offsetY = (height - displayHeight) / 2;
      
      const finalX = x + offsetX;
      const finalY = y + offsetY;
      
      console.log(`✍️ Calculs finaux:`);
      console.log(`✍️   Aspect ratio: ${aspectRatio.toFixed(3)}`);
      console.log(`✍️   Display size: ${Math.round(displayWidth)}×${Math.round(displayHeight)}`);
      console.log(`✍️   Offset: (${Math.round(offsetX)}, ${Math.round(offsetY)})`);
      console.log(`✍️   Position finale: (${Math.round(finalX)}, ${Math.round(finalY)})`);
      
      // Dessiner l'image de signature avec les nouvelles coordonnées
      page.drawImage(image, {
        x: finalX,
        y: finalY,
        width: displayWidth,
        height: displayHeight,
      });
      
      console.log(`✍️ === SIGNATURE DESSINÉE AVEC SUCCÈS ===`);
      
    } catch (error) {
      console.error('✍️ === ERREUR SIGNATURE ===');
      console.error('✍️ Message:', error.message);
      console.error('✍️ Stack:', error.stack);
      console.error('✍️ Données problématiques:', signatureData ? signatureData.substring(0, 200) : 'undefined');
      
      // Dessiner un placeholder d'erreur très visible
      page.drawRectangle({
        x,
        y,
        width,
        height,
        borderColor: rgb(1, 0, 0),
        borderWidth: 3,
        color: rgb(1, 0.8, 0.8),
      });
      
      // Texte d'erreur principal
      page.drawText('❌ ERREUR SIGNATURE', {
        x: x + 5,
        y: y + height - 15,
        size: Math.min(12, height / 2),
        color: rgb(1, 0, 0),
      });
      
      // Message d'erreur détaillé
      const errorMsg = error.message.substring(0, 30);
      page.drawText(errorMsg, {
        x: x + 5,
        y: y + height - 30,
        size: Math.min(8, height / 3),
        color: rgb(0.8, 0, 0),
      });
      
      // Log pour debug
      console.error('✍️ Placeholder d\'erreur dessiné');
    }
  }

  private static async drawImage(
    pdfDoc: any,
    page: any,
    imageData: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    try {
      console.log(`🖼️ Dessin image à (${Math.round(x)}, ${Math.round(y)}) taille ${Math.round(width)}×${Math.round(height)}`);
      
      const imageBytes = this.base64ToBytes(imageData);
      let image;
      
      if (imageData.includes('data:image/png')) {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        image = await pdfDoc.embedJpg(imageBytes);
      }
      
      page.drawImage(image, {
        x,
        y,
        width,
        height,
      });
    } catch (error) {
      console.error('Erreur image:', error);
      
      // Placeholder en cas d'erreur
      page.drawRectangle({
        x,
        y,
        width,
        height,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });
      
      page.drawText('Image non disponible', {
        x: x + 5,
        y: y + height / 2,
        size: 8,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  private static formatDate(value: string): string {
    if (!value) return '';
    
    try {
      if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = value.split('-');
        return `${day}/${month}/${year}`;
      }
      
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return value;
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
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
    try {
      console.log(`🔄 Conversion base64, longueur totale: ${base64.length}`);
      
      if (!base64 || typeof base64 !== 'string') {
        throw new Error('Données base64 invalides - pas une string');
      }
      
      if (!base64.includes(',')) {
        throw new Error('Données base64 invalides - format incorrect');
      }
      
      const base64Data = base64.split(',')[1];
      
      if (!base64Data) {
        throw new Error('Données base64 invalides - pas de virgule trouvée');
      }
      
      if (base64Data.length === 0) {
        throw new Error('Données base64 vides après extraction');
      }
      
      console.log(`🔄 Données base64 extraites, longueur: ${base64Data.length}`);
      
      // Validation base64
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
        throw new Error('Données base64 contiennent des caractères invalides');
      }
      
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log(`🔄 Conversion terminée, ${bytes.length} bytes générés`);
      return bytes;
    } catch (error) {
      console.error('🔄 Erreur conversion base64:', error);
      console.error('🔄 Base64 problématique:', base64 ? base64.substring(0, 200) : 'undefined');
      throw new Error(`Conversion base64 échouée: ${error.message}`);
    }
  }
}