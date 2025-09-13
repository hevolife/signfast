export const stripeConfig = {
  products: [
    {
      id: 'prod_T2Mf3y84TiochN',
      priceId: 'price_1S6HwBKiNbWQJGP35byRSSBn',
      name: 'Abonnement Mensuel',
      description: 'App FormBuilder',
      price: 59.99,
      currency: 'EUR',
      mode: 'subscription' as const,
      features: [
        'Formulaires illimités',
        'Templates PDF illimités', 
        'Sauvegarde PDF illimitée',
        'Support prioritaire'
      ]
    }
  ],
  
  // Limites pour les utilisateurs gratuits
  freeLimits: {
    maxForms: 1,
    maxPdfTemplates: 1,
    maxSavedPdfs: 3
  }
};