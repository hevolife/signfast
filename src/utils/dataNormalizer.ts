/**
 * Utilitaire pour normaliser les données de formulaire avant sauvegarde
 * Évite les doublons de champs avec des libellés légèrement différents
 */

export interface NormalizedData {
  [normalizedKey: string]: any;
}

export interface FieldMapping {
  originalLabel: string;
  normalizedKey: string;
  value: any;
}

/**
 * Normalise un libellé de champ en format standardisé
 * Ex: "Premier Pilote - Téléphone" → "premier_pilote_telephone"
 */
export const normalizeLabel = (label: string): string => {
  if (!label || typeof label !== 'string') {
    return 'champ_inconnu';
  }
  
  return label
    .toLowerCase()
    .normalize('NFD') // Décomposer les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9]/g, '_') // Remplacer les caractères spéciaux par _
    .replace(/_+/g, '_') // Éviter les _ multiples
    .replace(/^_|_$/g, ''); // Enlever les _ en début/fin
};

/**
 * Normalise les données d'un formulaire en utilisant les libellés des champs
 * Évite les doublons en mappant plusieurs variations vers une clé unique
 */
export const normalizeFormData = (
  formData: Record<string, any>,
  formFields: Array<{ id: string; label: string; type: string }>
): {
  normalizedData: NormalizedData;
  fieldMappings: FieldMapping[];
  conflicts: Array<{ normalizedKey: string; conflictingLabels: string[] }>;
} => {
  const normalizedData: NormalizedData = {};
  const fieldMappings: FieldMapping[] = [];
  const conflicts: Array<{ normalizedKey: string; conflictingLabels: string[] }> = [];
  const keyTracker = new Map<string, string[]>(); // normalizedKey → originalLabels[]

  console.log('🔄 === NORMALISATION DES DONNÉES ===');
  console.log('🔄 Données brutes reçues:', Object.keys(formData));
  console.log('🔄 Champs du formulaire:', formFields.map(f => f.label));

  // Étape 1: Traiter les champs définis dans le formulaire (priorité absolue)
  formFields.forEach(field => {
    const normalizedKey = normalizeLabel(field.label);
    
    // Chercher la valeur correspondante dans formData
    let foundValue = undefined;
    let foundLabel = '';
    
    // 1. Recherche exacte par libellé
    if (formData[field.label] !== undefined) {
      foundValue = formData[field.label];
      foundLabel = field.label;
    } else {
      // 2. Recherche par clé normalisée
      const matchingKey = Object.keys(formData).find(key => 
        normalizeLabel(key) === normalizedKey
      );
      
      if (matchingKey && formData[matchingKey] !== undefined) {
        foundValue = formData[matchingKey];
        foundLabel = matchingKey;
      }
    }
    
    if (foundValue !== undefined) {
      // Vérifier les conflits
      if (!keyTracker.has(normalizedKey)) {
        keyTracker.set(normalizedKey, []);
      }
      keyTracker.get(normalizedKey)!.push(foundLabel);
      
      normalizedData[normalizedKey] = foundValue;
      fieldMappings.push({
        originalLabel: foundLabel,
        normalizedKey,
        value: foundValue
      });
      
      console.log(`🔄 Champ mappé: "${foundLabel}" → "${normalizedKey}"`);
    }
  });

  // Étape 2: Traiter les données supplémentaires non mappées
  Object.entries(formData).forEach(([originalKey, value]) => {
    if (value === undefined || value === null || value === '') return;
    
    const normalizedKey = normalizeLabel(originalKey);
    
    // Vérifier si cette clé normalisée a déjà été traitée
    const alreadyProcessed = fieldMappings.some(mapping => 
      mapping.normalizedKey === normalizedKey
    );
    
    if (!alreadyProcessed) {
      // Vérifier les conflits potentiels
      if (!keyTracker.has(normalizedKey)) {
        keyTracker.set(normalizedKey, []);
      }
      keyTracker.get(normalizedKey)!.push(originalKey);
      
      normalizedData[normalizedKey] = value;
      fieldMappings.push({
        originalLabel: originalKey,
        normalizedKey,
        value
      });
      
      console.log(`🔄 Donnée supplémentaire: "${originalKey}" → "${normalizedKey}"`);
    }
  });

  // Étape 3: Détecter les conflits (plusieurs libellés → même clé normalisée)
  keyTracker.forEach((originalLabels, normalizedKey) => {
    if (originalLabels.length > 1) {
      conflicts.push({
        normalizedKey,
        conflictingLabels: originalLabels
      });
      console.warn(`⚠️ Conflit détecté pour "${normalizedKey}":`, originalLabels);
    }
  });

  console.log('🔄 Résultat normalisation:');
  console.log('🔄 - Clés normalisées:', Object.keys(normalizedData));
  console.log('🔄 - Mappings:', fieldMappings.length);
  console.log('🔄 - Conflits:', conflicts.length);
  console.log('🔄 === FIN NORMALISATION ===');

  return {
    normalizedData,
    fieldMappings,
    conflicts
  };
};

/**
 * Dénormalise les données pour l'affichage en utilisant les libellés originaux
 * Utilisé pour afficher les données avec les libellés d'origine dans l'interface
 */
export const denormalizeFormData = (
  normalizedData: NormalizedData,
  formFields: Array<{ id: string; label: string; type: string }>
): Record<string, any> => {
  const denormalizedData: Record<string, any> = {};
  
  // Mapper les clés normalisées vers les libellés originaux
  formFields.forEach(field => {
    const normalizedKey = normalizeLabel(field.label);
    
    if (normalizedData[normalizedKey] !== undefined) {
      denormalizedData[field.label] = normalizedData[normalizedKey];
    }
  });
  
  // Ajouter les données qui n'ont pas de champ correspondant
  Object.entries(normalizedData).forEach(([normalizedKey, value]) => {
    const hasCorrespondingField = formFields.some(field => 
      normalizeLabel(field.label) === normalizedKey
    );
    
    if (!hasCorrespondingField) {
      // Garder la clé normalisée pour les données sans champ correspondant
      denormalizedData[normalizedKey] = value;
    }
  });
  
  return denormalizedData;
};

/**
 * Valide que les données normalisées sont cohérentes
 */
export const validateNormalizedData = (
  normalizedData: NormalizedData,
  requiredFields: string[]
): {
  isValid: boolean;
  missingFields: string[];
  errors: string[];
} => {
  const errors: string[] = [];
  const missingFields: string[] = [];
  
  // Vérifier les champs obligatoires
  requiredFields.forEach(fieldLabel => {
    const normalizedKey = normalizeLabel(fieldLabel);
    
    if (!normalizedData[normalizedKey] || normalizedData[normalizedKey] === '') {
      missingFields.push(fieldLabel);
    }
  });
  
  // Vérifier la taille des données (éviter les données trop volumineuses)
  Object.entries(normalizedData).forEach(([key, value]) => {
    if (typeof value === 'string' && value.length > 10 * 1024 * 1024) { // 10MB
      errors.push(`Champ "${key}" trop volumineux (${Math.round(value.length / 1024 / 1024)}MB)`);
    }
  });
  
  return {
    isValid: missingFields.length === 0 && errors.length === 0,
    missingFields,
    errors
  };
};

/**
 * Optimise les données avant sauvegarde (compression d'images, etc.)
 */
export const optimizeFormData = async (
  normalizedData: NormalizedData
): Promise<NormalizedData> => {
  const optimizedData = { ...normalizedData };
  
  for (const [key, value] of Object.entries(optimizedData)) {
    // Optimiser les images Base64
    if (typeof value === 'string' && value.startsWith('data:image')) {
      try {
        // Importer dynamiquement le compresseur d'images
        const { ImageCompressor } = await import('../utils/imageCompression');
        
        // Compression plus agressive pour le stockage en base
        const compressedImage = await ImageCompressor.compressImage(value, {
          maxWidth: 800,
          maxHeight: 600,
          quality: 0.7,
          maxSizeKB: 200, // Limite plus stricte pour la base de données
          format: 'jpeg'
        });
        
        optimizedData[key] = compressedImage;
        
        const originalSize = Math.round(value.length / 1024);
        const compressedSize = Math.round(compressedImage.length / 1024);
        
        console.log(`🗜️ Image optimisée pour "${key}": ${originalSize}KB → ${compressedSize}KB`);
      } catch (error) {
        console.warn(`⚠️ Erreur compression image pour "${key}":`, error);
        // Garder l'image originale en cas d'erreur
      }
    }
  }
  
  return optimizedData;
};