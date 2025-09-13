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
            console.log(`✍️ === TRAITEMENT SIGNATURE PDF ===`);
            console.log(`✍️ Variable: ${field.variable}`);
            console.log(`✍️ Valeur trouvée:`, value ? 'OUI' : 'NON');
            console.log(`✍️ Type valeur:`, typeof value);
            console.log(`✍️ Est image:`, typeof value === 'string' && value.startsWith('data:image'));
            
            if (value && typeof value === 'string' && value.startsWith('data:image')) {
              console.log(`✍️ ✅ Signature valide trouvée, dessin en cours...`);
              await this.drawSignature(pdfDoc, page, value, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight);
            } else {
              console.log(`✍️ ❌ Signature non trouvée ou invalide`);
              console.log(`✍️ Recherche alternative dans toutes les données...`);
              
              // Recherche alternative : chercher n'importe quelle signature dans les données
              const allSignatures = Object.entries(data).filter(([key, val]) => 
                typeof val === 'string' && val.startsWith('data:image')
              );
              
              console.log(`✍️ Signatures alternatives trouvées:`, allSignatures.length);
              allSignatures.forEach(([key, val], index) => {
                console.log(`✍️ Signature alt ${index + 1}: clé="${key}", taille=${typeof val === 'string' ? val.length : 0}`);
              });
              
              if (allSignatures.length > 0) {
                console.log(`✍️ ✅ Utilisation signature alternative: ${allSignatures[0][0]}`);
                await this.drawSignature(pdfDoc, page, allSignatures[0][1] as string, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight);
              } else {
                console.log(`✍️ ❌ Aucune signature trouvée, dessin placeholder`);
                // Dessiner un placeholder pour signature manquante
                page.drawRectangle({
                  x: pdfX,
                  y: pdfY,
                  width: pdfFieldWidth,
                  height: pdfFieldHeight,
                  borderColor: rgb(0.8, 0.8, 0.8),
                  borderWidth: 1,
                  color: rgb(0.98, 0.98, 0.98),
                });
                
                page.drawText('Signature manquante', {
                  x: pdfX + 5,
                  y: pdfY + pdfFieldHeight / 2,
                  size: Math.min(10, pdfFieldHeight * 0.6),
                  color: rgb(0.7, 0.7, 0.7),
                  font,
                });
              }
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
    
    console.log(`🔍 === RECHERCHE VARIABLE ===`);
    console.log(`🔍 Variable recherchée: "${variableName}"`);
    console.log(`🔍 Type de champ: ${field.type}`);
    console.log(`🔍 Toutes les clés disponibles:`, Object.keys(data));
    console.log(`🔍 Données complètes:`, data);
    
    let value = data[variableName];
    
    // Recherche étendue si pas trouvé
    if (!value) {
      const originalKeys = Object.keys(data);
      
      // 1. Recherche exacte
      let matchingKey = originalKeys.find(key => key === variableName);
      console.log(`🔍 Recherche exacte "${variableName}":`, matchingKey ? `trouvé (${matchingKey})` : 'non trouvé');
      
      // 2. Recherche insensible à la casse
      if (!matchingKey) {
        matchingKey = originalKeys.find(key => 
          key.toLowerCase() === variableName.toLowerCase()
        );
        console.log(`🔍 Recherche insensible casse "${variableName}":`, matchingKey ? `trouvé (${matchingKey})` : 'non trouvé');
      }
      
      // 3. Recherche normalisée (accents, espaces, etc.)
      if (!matchingKey) {
        matchingKey = originalKeys.find(key => 
          this.normalizeKey(key) === this.normalizeKey(variableName)
        );
        console.log(`🔍 Recherche normalisée "${this.normalizeKey(variableName)}":`, matchingKey ? `trouvé (${matchingKey})` : 'non trouvé');
      }
      
      // 4. Recherche spéciale pour signatures (par type de champ)
      if (!matchingKey && field.type === 'signature') {
        console.log(`🔍 === RECHERCHE SPÉCIALE SIGNATURE ===`);
        
        // Chercher toutes les clés qui contiennent "signature"
        const signatureKeys = originalKeys.filter(key => 
          key.toLowerCase().includes('signature') ||
          key.toLowerCase().includes('sign') ||
          this.normalizeKey(key).includes('signature')
        );
        console.log(`🔍 Clés contenant "signature":`, signatureKeys);
        
        // Prendre la première signature trouvée
        if (signatureKeys.length > 0) {
          matchingKey = signatureKeys[0];
          console.log(`🔍 ✅ Signature trouvée via recherche spéciale: ${matchingKey}`);
        }
        
        // Recherche par valeur (chercher les données qui ressemblent à des signatures)
        if (!matchingKey) {
          const signatureDataKeys = originalKeys.filter(key => {
            const val = data[key];
            return typeof val === 'string' && val.startsWith('data:image');
          });
          console.log(`🔍 Clés avec données image (potentielles signatures):`, signatureDataKeys);
          
          if (signatureDataKeys.length > 0) {
            matchingKey = signatureDataKeys[0];
            console.log(`🔍 ✅ Signature trouvée via données image: ${matchingKey}`);
          }
        }
      }
      
      if (matchingKey) {
        value = data[matchingKey];
        console.log(`🔍 ✅ TROUVÉ via clé: "${matchingKey}"`);
        console.log(`🔍 Type de valeur:`, typeof value);
        console.log(`🔍 Est une image:`, typeof value === 'string' && value.startsWith('data:image'));
        if (typeof value === 'string' && value.startsWith('data:image')) {
          console.log(`🔍 Taille image: ${value.length} caractères`);
        }
      } else {
        console.log(`🔍 ❌ Variable "${variableName}" NON TROUVÉE`);
        console.log(`🔍 Suggestions de clés similaires:`, originalKeys.filter(key => 
          key.toLowerCase().includes(variableName.toLowerCase()) ||
          variableName.toLowerCase().includes(key.toLowerCase())
        ));
      }
    }
    
    const finalValue = value || field.placeholder || '';
    console.log(`🔍 === VALEUR FINALE ===`);
    console.log(`🔍 Variable: ${variableName}`);
    console.log(`🔍 Valeur: ${typeof finalValue === 'string' && finalValue.startsWith('data:image') ? 'IMAGE_DATA' : finalValue}`);
    
    return finalValue;
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
      console.log(`✍️ Dessin signature à (${Math.round(x)}, ${Math.round(y)}) ${Math.round(width)}×${Math.round(height)}`);
      
      if (!signatureData || !signatureData.startsWith('data:image')) {
        throw new Error('Données de signature invalides');
      }

      const [header, base64Data] = signatureData.split(',');
      if (!base64Data || base64Data.length === 0) {
        throw new Error('Données base64 vides');
      }
      
      // Conversion base64 vers bytes
      const binaryString = atob(base64Data);
      const imageBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        imageBytes[i] = binaryString.charCodeAt(i);
      }
      
      // Embedder l'image (PNG en priorité)
      let image;
      if (header.includes('png')) {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        image = await pdfDoc.embedJpg(imageBytes);
      }
      
      // Calculer les dimensions en gardant les proportions
      const imageAspectRatio = image.width / image.height;
      const fieldAspectRatio = width / height;
      
      let drawWidth = width;
      let drawHeight = height;
      
      if (fieldAspectRatio > imageAspectRatio) {
        // Le champ est plus large que l'image
        drawWidth = height * imageAspectRatio;
      } else {
        // Le champ est plus haut que l'image
        drawHeight = width / imageAspectRatio;
      }
      
      // Centrer la signature dans le champ
      const offsetX = (width - drawWidth) / 2;
      const offsetY = (height - drawHeight) / 2;
      
      console.log(`✍️ Signature: ${Math.round(drawWidth)}×${Math.round(drawHeight)} à (${Math.round(x + offsetX)}, ${Math.round(y + offsetY)})`);
      
      // Fond blanc avec bordure
      page.drawRectangle({
        x: x + offsetX - 1,
        y: y + offsetY - 1,
        width: drawWidth + 2,
        height: drawHeight + 2,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 0.3,
      });
      
      // Dessiner la signature
      page.drawImage(image, {
        x: x + offsetX,
        y: y + offsetY,
        width: drawWidth,
        height: drawHeight,
      });
      
      console.log(`✍️ ✅ Signature dessinée avec succès`);
      
    } catch (error) {
      console.error('Erreur dessin signature:', error);
      
      // Placeholder d'erreur
      page.drawRectangle({
        x,
        y,
        width,
        height,
        color: rgb(0.95, 0.95, 0.95),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });
      
      page.drawText('Signature non disponible', {
        x: x + 5,
        y: y + height / 2,
        size: 8,
        color: rgb(0.5, 0.5, 0.5),
      });
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