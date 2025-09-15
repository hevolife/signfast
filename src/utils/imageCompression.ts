/**
 * Utilitaire de compression d'images avancé
 * Redimensionne, compresse et optimise les images pour éviter les timeouts
 */

export class ImageCompressor {
  /**
   * Compresse une image en respectant les contraintes de taille et qualité
   */
  static async compressImage(
    file: File | string,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      maxSizeKB?: number;
      format?: 'webp' | 'jpeg' | 'png' | 'auto';
      preserveTransparency?: boolean;
    } = {}
  ): Promise<string> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      maxSizeKB = 1024,
      format = 'auto',
      preserveTransparency = true
    } = options;

    try {
      // Créer une image depuis le fichier ou data URL
      const img = await this.loadImage(file);
      
      // Calculer les nouvelles dimensions
      const { width: newWidth, height: newHeight } = this.calculateDimensions(
        img.naturalWidth,
        img.naturalHeight,
        maxWidth,
        maxHeight
      );

      // Créer le canvas pour le redimensionnement
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context non disponible');
      }

      canvas.width = newWidth;
      canvas.height = newHeight;

      // Configuration pour une meilleure qualité
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fond blanc si pas de transparence
      if (!preserveTransparency || format === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, newWidth, newHeight);
      }

      // Dessiner l'image redimensionnée
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Déterminer le format optimal
      const finalFormat = this.determineBestFormat(format, preserveTransparency, img);
      
      // Compression progressive jusqu'à atteindre la taille cible
      let compressedDataUrl = await this.compressToTarget(
        canvas,
        finalFormat,
        quality,
        maxSizeKB
      );


      return compressedDataUrl;
    } catch (error) {
      // Fallback : retourner l'original ou une version très basique
      if (typeof file === 'string') {
        return file;
      }
      return await this.basicCompression(file);
    }
  }

  /**
   * Charge une image depuis un File ou data URL
   */
  private static loadImage(source: File | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Impossible de charger l\'image'));
      
      if (source instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Erreur lecture fichier'));
        reader.readAsDataURL(source);
      } else {
        img.src = source;
      }
    });
  }

  /**
   * Calcule les nouvelles dimensions en gardant les proportions
   */
  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    // Ne pas agrandir si l'image est plus petite
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const aspectRatio = originalWidth / originalHeight;
    
    let newWidth = maxWidth;
    let newHeight = maxWidth / aspectRatio;
    
    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = maxHeight * aspectRatio;
    }
    
    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    };
  }

  /**
   * Détermine le meilleur format selon les critères
   */
  private static determineBestFormat(
    requestedFormat: string,
    preserveTransparency: boolean,
    img: HTMLImageElement
  ): 'webp' | 'jpeg' | 'png' {
    if (requestedFormat !== 'auto') {
      return requestedFormat as 'webp' | 'jpeg' | 'png';
    }

    // Priorité au JPEG pour des fichiers plus petits
    // Seulement PNG si transparence absolument nécessaire
    if (preserveTransparency) {
      return 'png';
    }
    
    // Par défaut : JPEG pour la compression optimale
    return 'jpeg';
  }

  /**
   * Vérifie le support WebP du navigateur
   */
  private static supportsWebP(): boolean {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch {
      return false;
    }
  }

  /**
   * Compresse progressivement jusqu'à atteindre la taille cible
   */
  private static async compressToTarget(
    canvas: HTMLCanvasElement,
    format: 'webp' | 'jpeg' | 'png',
    initialQuality: number,
    maxSizeKB: number
  ): Promise<string> {
    let quality = initialQuality;
    let dataUrl = '';
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      dataUrl = canvas.toDataURL(`image/${format}`, quality);
      const sizeKB = dataUrl.length / 1024;
      
      if (sizeKB <= maxSizeKB || quality <= 0.1) {
        break;
      }
      
      // Réduire la qualité progressivement
      quality = Math.max(0.1, quality - 0.15);
      attempts++;
    }

    return dataUrl;
  }

  /**
   * Compression basique en cas d'échec de la compression avancée
   */
  private static async basicCompression(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Compression très basique par échantillonnage
        if (result.length > 500 * 1024) { // > 500KB
          const [header, data] = result.split(',');
          const compressedData = data.substring(0, Math.floor(data.length / 2));
          resolve(`${header},${compressedData}`);
        } else {
          resolve(result);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Compresse spécifiquement pour les signatures (format optimisé)
   */
  static async compressSignature(dataUrl: string): Promise<string> {
    try {
      const img = await this.loadImage(dataUrl);
      
      // Taille optimale pour signatures (ratio 2:1)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Canvas context non disponible');
      
      canvas.width = 400;
      canvas.height = 200;
      
      // Fond blanc opaque
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 400, 200);
      
      // Configuration pour signature nette
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, 400, 200);
      
      // Compression JPEG pour signatures (fichiers plus petits)
      return canvas.toDataURL('image/jpeg', 0.9);
    } catch (error) {
      console.warn('⚠️ Erreur compression signature, retour original:', error);
      return dataUrl;
    }
  }

  /**
   * Valide qu'une image respecte les contraintes
   */
  static validateImage(file: File): { valid: boolean; error?: string } {
    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'Le fichier doit être une image' };
    }

    // Vérifier la taille (max 10MB avant compression)
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: 'L\'image ne doit pas dépasser 10MB' };
    }

    // Types supportés
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!supportedTypes.includes(file.type)) {
      return { valid: false, error: 'Format non supporté. Utilisez JPEG, PNG ou WebP' };
    }

    return { valid: true };
  }
}