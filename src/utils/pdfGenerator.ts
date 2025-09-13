import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PDFField, PDFTemplate } from '../types/pdf';

export class PDFGenerator {
  static async generatePDF(
    template: PDFTemplate,
    data: Record<string, any>,
    originalPdfBytes: Uint8Array
  ): Promise<Uint8Array> {
    try {
      // Charger le PDF original
      const pdfDoc = await PDFDocument.load(originalPdfBytes);
      const pages = pdfDoc.getPages();
      
      // Charger les polices
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Traiter chaque champ
      for (const field of template.fields) {
        const pageIndex = (field.page || 1) - 1;
        const page = pages[pageIndex];
        
        if (!page) {
          continue;
        }
        
        // Lire la taille réelle de la page en points
        const { width: pdfWidth, height: pdfHeight } = page.getSize();
        
        // Calculer les coordonnées PDF depuis les ratios avec offset ajustable
        const pdfX = (field.xRatio || 0) * pdfWidth + (field.offsetX || 0);
        const pdfY = (1 - (field.yRatio || 0) - (field.heightRatio || 0.05)) * pdfHeight + (field.offsetY || 0);
        const pdfFieldWidth = (field.widthRatio || 0.1) * pdfWidth;
        const pdfFieldHeight = (field.heightRatio || 0.05) * pdfHeight;
        
        const value = this.getFieldValue(field, data);
        
        // Ignorer complètement les champs vides - ne rien dessiner
        if (!value) {
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
            } else {
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
                x: pdfX + 2,
                y: pdfY + pdfFieldHeight / 2,
                size: Math.min(10, pdfFieldHeight * 0.6),
                color: rgb(0.7, 0.7, 0.7),
                font,
              });
            }
            break;
            
          case 'image':
            if (value && typeof value === 'string' && value.startsWith('data:image')) {
              await this.drawImage(pdfDoc, page, value, pdfX, pdfY, pdfFieldWidth, pdfFieldHeight);
            }
            break;
        }
      }

      const finalPdf = await pdfDoc.save();
      
      return finalPdf;
    } catch (error) {
      throw new Error(`Impossible de générer le PDF: ${error.message}`);
    }
  }

  private static getFieldValue(field: PDFField, data: Record<string, any>): string {
    if (!field.variable) {
      return '';
    }
    
    const variableName = field.variable.replace(/^\$\{|\}$/g, '');
    
    // Pour les signatures, recherche spéciale et prioritaire
    if (field.type === 'signature') {
      // 1. Recherche directe par variable exacte
      let signatureValue = data[variableName];
      
      // 2. Recherche insensible à la casse
      if (!signatureValue) {
        const lowerVariableName = variableName.toLowerCase();
        const matchingKey = Object.keys(data).find(key => 
          key.toLowerCase() === lowerVariableName
        );
        
        if (matchingKey) {
          signatureValue = data[matchingKey];
        }
      }
      
      // 3. Recherche par clés contenant "signature"
      if (!signatureValue) {
        const signatureKeys = Object.keys(data).filter(key => 
          key.toLowerCase().includes('signature') || key.toLowerCase().includes('sign')
        );
        
        for (const key of signatureKeys) {
          const val = data[key];
          if (typeof val === 'string' && val.startsWith('data:image')) {
            signatureValue = val;
            break;
          }
        }
      }
      
      // 4. Fallback : première image trouvée
      if (!signatureValue) {
        const allImages = Object.entries(data).filter(([key, val]) => 
          typeof val === 'string' && val.startsWith('data:image')
        );
        
        if (allImages.length > 0) {
          signatureValue = allImages[0][1];
        }
      }
      
      if (signatureValue) {
        return signatureValue;
      } else {
        return '';
      }
    }
    
    // Pour les images, recherche spéciale similaire aux signatures
    if (field.type === 'image') {
      // 1. Recherche directe par variable exacte
      let imageValue = data[variableName];
      
      // 2. Recherche insensible à la casse
      if (!imageValue) {
        const lowerVariableName = variableName.toLowerCase();
        const matchingKey = Object.keys(data).find(key => 
          key.toLowerCase() === lowerVariableName
        );
        
        if (matchingKey) {
          imageValue = data[matchingKey];
        }
      }
      
      // 3. ARRÊT ICI - Pas de fallback pour les images
      // Chaque champ image doit avoir sa propre variable exacte
      
      if (imageValue) {
        return imageValue;
      } else {
        return '';
      }
    }
    
    // Pour les autres types de champs, recherche normale
    let value = data[variableName];
    
    // Si pas trouvé, essayer plusieurs stratégies de recherche
    if (!value) {
      // 1. Recherche insensible à la casse
      const matchingKey = Object.keys(data).find(key => 
        key.toLowerCase() === variableName.toLowerCase()
      );
      
      if (matchingKey) {
        value = data[matchingKey];
      } else {
        // 2. Recherche par clé contenant la variable
        const partialMatchKey = Object.keys(data).find(key => 
          key.toLowerCase().includes(variableName.toLowerCase()) ||
          variableName.toLowerCase().includes(key.toLowerCase())
        );
        
        if (partialMatchKey) {
          value = data[partialMatchKey];
        } else {
          // 3. Recherche par libellé de champ original (avant normalisation)
          const originalLabelKey = Object.keys(data).find(key => {
            const normalizedKey = key
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '_')
              .replace(/_+/g, '_')
              .replace(/^_|_$/g, '');
            return normalizedKey === variableName;
          });
          
          if (originalLabelKey) {
            value = data[originalLabelKey];
          }
        }
      }
    }
    
    const finalValue = value || '';
    
    return finalValue;
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
      if (!signatureData || !signatureData.startsWith('data:image')) {
        throw new Error('Données de signature invalides');
      }

      const [header, base64Data] = signatureData.split(',');
      if (!base64Data || base64Data.length === 0) {
        throw new Error('Données base64 vides');
      }
      
      // Conversion base64 vers bytes
      let imageBytes: Uint8Array;
      try {
        const binaryString = atob(base64Data);
        imageBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          imageBytes[i] = binaryString.charCodeAt(i);
        }
      } catch (conversionError) {
        throw new Error(`Conversion base64 échouée: ${conversionError.message}`);
      }
      
      // Embedder l'image (PNG en priorité)
      let image;
      try {
        if (header.includes('png')) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
        }
      } catch (embedError) {
        throw new Error(`Embedding image échoué: ${embedError.message}`);
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
      
    } catch (error) {
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
      if (!imageData || !imageData.startsWith('data:image')) {
        throw new Error('Données image invalides');
      }
      
      const [header, base64Data] = imageData.split(',');
      if (!base64Data || base64Data.length === 0) {
        throw new Error('Données base64 image vides');
      }
      
      // Conversion base64 vers bytes
      let imageBytes: Uint8Array;
      try {
        const binaryString = atob(base64Data);
        imageBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          imageBytes[i] = binaryString.charCodeAt(i);
        }
      } catch (conversionError) {
        throw new Error(`Conversion base64 image échouée: ${conversionError.message}`);
      }
      
      let image;
      
      try {
        if (header.includes('png')) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
        }
      } catch (embedError) {
        throw new Error(`Embedding image échoué: ${embedError.message}`);
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
      
      // Centrer l'image dans le champ
      const offsetX = (width - drawWidth) / 2;
      const offsetY = (height - drawHeight) / 2;
      
      page.drawImage(image, {
        x: x + offsetX,
        y: y + offsetY,
        width: drawWidth,
        height: drawHeight,
      });
      
    } catch (error) {
      // Placeholder en cas d'erreur
      page.drawRectangle({
        x,
        y,
        width,
        height,
        color: rgb(0.95, 0.95, 0.95),
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
}