import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'fr' | 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

// Traductions complètes
const translations = {
  fr: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.forms': 'Formulaires',
    'nav.templates': 'Templates',
    'nav.storage': 'Stockage',
    'nav.support': 'Support',
    'nav.settings': 'Paramètres',
    'nav.login': 'Connexion',
    'nav.signup': 'S\'inscrire',
    'nav.logout': 'Déconnexion',
    'nav.admin': 'Admin',

    // Page d'accueil
    'home.hero.title': 'Créez des contrats électroniques en quelques clics',
    'home.hero.subtitle': 'Contrats de location, prestations de services, accords commerciaux... Créez, signez et gérez tous vos documents légaux avec signature électronique valide.',
    'home.hero.cta.primary': 'Créer mon premier contrat',
    'home.hero.cta.demo': 'Voir la démo',
    'home.hero.stats.reliability': 'Fiabilité',
    'home.hero.stats.creation': 'Création moyenne',
    'home.hero.stats.legal': 'Légal en France',

    // Fonctionnalités
    'features.title': 'Signature électronique simplifiée',
    'features.subtitle': 'Une solution complète pour digitaliser vos processus contractuels avec une interface moderne',
    'features.legal.title': 'Signature électronique légale',
    'features.legal.desc': 'Signatures conformes au règlement eIDAS européen. Valeur juridique équivalente à la signature manuscrite.',
    'features.fast.title': 'Création en 2 minutes',
    'features.fast.desc': 'Interface intuitive avec templates pré-conçus. Glissez-déposez vos champs et c\'est prêt.',
    'features.mobile.title': 'Signature sur mobile',
    'features.mobile.desc': 'Vos clients signent directement sur leur téléphone, tablette ou ordinateur. Aucune app à télécharger.',
    'features.security.title': 'Sécurité maximale',
    'features.security.desc': 'Chiffrement bout-en-bout, horodatage certifié et archivage sécurisé pendant 10 ans.',

    // Processus
    'process.title': '3 étapes pour un contrat signé',
    'process.subtitle': 'Processus simplifié pour une efficacité maximale',
    'process.step1.title': 'Créez votre contrat',
    'process.step1.desc': 'Choisissez un template ou créez votre contrat personnalisé avec notre éditeur intuitif',
    'process.step2.title': 'Partagez et collectez',
    'process.step2.desc': 'Envoyez le lien à vos clients. Ils remplissent et signent directement en ligne',
    'process.step3.title': 'Récupérez le PDF signé',
    'process.step3.desc': 'Téléchargez automatiquement le contrat signé au format PDF avec valeur légale',

    // Authentification
    'auth.login.title': 'Connexion',
    'auth.login.subtitle': 'Connectez-vous à votre espace SignFast',
    'auth.login.email': 'Adresse email',
    'auth.login.password': 'Mot de passe',
    'auth.login.submit': 'Se connecter',
    'auth.login.forgot': 'Mot de passe oublié ?',
    'auth.login.signup': 'Créer un compte gratuit',

    'auth.signup.title': 'Créer un compte',
    'auth.signup.subtitle': 'Commencez à créer vos contrats en 2 minutes',
    'auth.signup.email': 'Adresse email',
    'auth.signup.password': 'Mot de passe',
    'auth.signup.confirm': 'Confirmer le mot de passe',
    'auth.signup.submit': 'Créer mon compte',
    'auth.signup.login': 'Se connecter',

    // Dashboard
    'dashboard.title': 'Dashboard SignFast',
    'dashboard.subtitle': 'Vue d\'ensemble de votre activité et gestion complète de vos documents',
    'dashboard.stats.forms': 'Formulaires',
    'dashboard.stats.templates': 'Templates PDF',
    'dashboard.stats.pdfs': 'PDFs Sauvegardés',
    'dashboard.stats.responses': 'Réponses Totales',

    // Formulaires
    'forms.title': 'Mes Formulaires',
    'forms.subtitle': 'Créez, gérez et analysez vos formulaires en toute simplicité',
    'forms.new': 'Nouveau formulaire',
    'forms.edit': 'Modifier',
    'forms.stats': 'Stats',
    'forms.delete': 'Supprimer',
    'forms.published': 'Publié',
    'forms.draft': 'Brouillon',

    // Paramètres
    'settings.title': 'Paramètres',
    'settings.subtitle': 'Personnalisez votre expérience SignFast',
    'settings.profile': 'Profil',
    'settings.subaccounts': 'Sous-comptes',
    'settings.affiliate': 'Affiliation',
    'settings.app': 'Application',
    'settings.language': 'Langue',
    'settings.language.select': 'Sélectionner la langue',

    // Langues
    'language.french': 'Français',
    'language.english': 'English',
    'language.spanish': 'Español',

    // Boutons communs
    'common.save': 'Sauvegarder',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.create': 'Créer',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.previous': 'Précédent',
    'common.loading': 'Chargement...',
    'common.close': 'Fermer',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.forms': 'Forms',
    'nav.templates': 'Templates',
    'nav.storage': 'Storage',
    'nav.support': 'Support',
    'nav.settings': 'Settings',
    'nav.login': 'Login',
    'nav.signup': 'Sign Up',
    'nav.logout': 'Logout',
    'nav.admin': 'Admin',

    // Homepage
    'home.hero.title': 'Create electronic contracts in just a few clicks',
    'home.hero.subtitle': 'Rental contracts, service agreements, commercial deals... Create, sign and manage all your legal documents with valid electronic signature.',
    'home.hero.cta.primary': 'Create my first contract',
    'home.hero.cta.demo': 'View demo',
    'home.hero.stats.reliability': 'Reliability',
    'home.hero.stats.creation': 'Average creation',
    'home.hero.stats.legal': 'Legal in France',

    // Features
    'features.title': 'Simplified electronic signature',
    'features.subtitle': 'A complete solution to digitize your contractual processes with a modern interface',
    'features.legal.title': 'Legal electronic signature',
    'features.legal.desc': 'Signatures compliant with European eIDAS regulation. Legal value equivalent to handwritten signature.',
    'features.fast.title': 'Creation in 2 minutes',
    'features.fast.desc': 'Intuitive interface with pre-designed templates. Drag and drop your fields and you\'re ready.',
    'features.mobile.title': 'Mobile signature',
    'features.mobile.desc': 'Your clients sign directly on their phone, tablet or computer. No app to download.',
    'features.security.title': 'Maximum security',
    'features.security.desc': 'End-to-end encryption, certified timestamping and secure archiving for 10 years.',

    // Process
    'process.title': '3 steps to a signed contract',
    'process.subtitle': 'Simplified process for maximum efficiency',
    'process.step1.title': 'Create your contract',
    'process.step1.desc': 'Choose a template or create your custom contract with our intuitive editor',
    'process.step2.title': 'Share and collect',
    'process.step2.desc': 'Send the link to your clients. They fill out and sign directly online',
    'process.step3.title': 'Get the signed PDF',
    'process.step3.desc': 'Automatically download the signed contract in PDF format with legal value',

    // Authentication
    'auth.login.title': 'Login',
    'auth.login.subtitle': 'Connect to your SignFast space',
    'auth.login.email': 'Email address',
    'auth.login.password': 'Password',
    'auth.login.submit': 'Sign in',
    'auth.login.forgot': 'Forgot password?',
    'auth.login.signup': 'Create free account',

    'auth.signup.title': 'Create account',
    'auth.signup.subtitle': 'Start creating your contracts in 2 minutes',
    'auth.signup.email': 'Email address',
    'auth.signup.password': 'Password',
    'auth.signup.confirm': 'Confirm password',
    'auth.signup.submit': 'Create my account',
    'auth.signup.login': 'Sign in',

    // Dashboard
    'dashboard.title': 'SignFast Dashboard',
    'dashboard.subtitle': 'Overview of your activity and complete management of your documents',
    'dashboard.stats.forms': 'Forms',
    'dashboard.stats.templates': 'PDF Templates',
    'dashboard.stats.pdfs': 'Saved PDFs',
    'dashboard.stats.responses': 'Total Responses',

    // Forms
    'forms.title': 'My Forms',
    'forms.subtitle': 'Create, manage and analyze your forms with ease',
    'forms.new': 'New form',
    'forms.edit': 'Edit',
    'forms.stats': 'Stats',
    'forms.delete': 'Delete',
    'forms.published': 'Published',
    'forms.draft': 'Draft',

    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Customize your SignFast experience',
    'settings.profile': 'Profile',
    'settings.subaccounts': 'Sub-accounts',
    'settings.affiliate': 'Affiliate',
    'settings.app': 'Application',
    'settings.language': 'Language',
    'settings.language.select': 'Select language',

    // Languages
    'language.french': 'Français',
    'language.english': 'English',
    'language.spanish': 'Español',

    // Common buttons
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.loading': 'Loading...',
    'common.close': 'Close',
  },
  es: {
    // Navigation
    'nav.dashboard': 'Panel',
    'nav.forms': 'Formularios',
    'nav.templates': 'Plantillas',
    'nav.storage': 'Almacenamiento',
    'nav.support': 'Soporte',
    'nav.settings': 'Configuración',
    'nav.login': 'Iniciar sesión',
    'nav.signup': 'Registrarse',
    'nav.logout': 'Cerrar sesión',
    'nav.admin': 'Admin',

    // Homepage
    'home.hero.title': 'Crea contratos electrónicos en pocos clics',
    'home.hero.subtitle': 'Contratos de alquiler, servicios, acuerdos comerciales... Crea, firma y gestiona todos tus documentos legales con firma electrónica válida.',
    'home.hero.cta.primary': 'Crear mi primer contrato',
    'home.hero.cta.demo': 'Ver demo',
    'home.hero.stats.reliability': 'Fiabilidad',
    'home.hero.stats.creation': 'Creación promedio',
    'home.hero.stats.legal': 'Legal en Francia',

    // Features
    'features.title': 'Firma electrónica simplificada',
    'features.subtitle': 'Una solución completa para digitalizar tus procesos contractuales con una interfaz moderna',
    'features.legal.title': 'Firma electrónica legal',
    'features.legal.desc': 'Firmas conformes al reglamento eIDAS europeo. Valor jurídico equivalente a la firma manuscrita.',
    'features.fast.title': 'Creación en 2 minutos',
    'features.fast.desc': 'Interfaz intuitiva con plantillas prediseñadas. Arrastra y suelta tus campos y listo.',
    'features.mobile.title': 'Firma en móvil',
    'features.mobile.desc': 'Tus clientes firman directamente en su teléfono, tablet u ordenador. Sin app que descargar.',
    'features.security.title': 'Seguridad máxima',
    'features.security.desc': 'Cifrado extremo a extremo, sellado de tiempo certificado y archivo seguro durante 10 años.',

    // Process
    'process.title': '3 pasos para un contrato firmado',
    'process.subtitle': 'Proceso simplificado para máxima eficiencia',
    'process.step1.title': 'Crea tu contrato',
    'process.step1.desc': 'Elige una plantilla o crea tu contrato personalizado con nuestro editor intuitivo',
    'process.step2.title': 'Comparte y recolecta',
    'process.step2.desc': 'Envía el enlace a tus clientes. Completan y firman directamente en línea',
    'process.step3.title': 'Obtén el PDF firmado',
    'process.step3.desc': 'Descarga automáticamente el contrato firmado en formato PDF con valor legal',

    // Authentication
    'auth.login.title': 'Iniciar sesión',
    'auth.login.subtitle': 'Conéctate a tu espacio SignFast',
    'auth.login.email': 'Dirección de email',
    'auth.login.password': 'Contraseña',
    'auth.login.submit': 'Iniciar sesión',
    'auth.login.forgot': '¿Olvidaste tu contraseña?',
    'auth.login.signup': 'Crear cuenta gratuita',

    'auth.signup.title': 'Crear cuenta',
    'auth.signup.subtitle': 'Comienza a crear tus contratos en 2 minutos',
    'auth.signup.email': 'Dirección de email',
    'auth.signup.password': 'Contraseña',
    'auth.signup.confirm': 'Confirmar contraseña',
    'auth.signup.submit': 'Crear mi cuenta',
    'auth.signup.login': 'Iniciar sesión',

    // Dashboard
    'dashboard.title': 'Panel SignFast',
    'dashboard.subtitle': 'Resumen de tu actividad y gestión completa de tus documentos',
    'dashboard.stats.forms': 'Formularios',
    'dashboard.stats.templates': 'Plantillas PDF',
    'dashboard.stats.pdfs': 'PDFs Guardados',
    'dashboard.stats.responses': 'Respuestas Totales',

    // Forms
    'forms.title': 'Mis Formularios',
    'forms.subtitle': 'Crea, gestiona y analiza tus formularios con facilidad',
    'forms.new': 'Nuevo formulario',
    'forms.edit': 'Editar',
    'forms.stats': 'Estadísticas',
    'forms.delete': 'Eliminar',
    'forms.published': 'Publicado',
    'forms.draft': 'Borrador',

    // Settings
    'settings.title': 'Configuración',
    'settings.subtitle': 'Personaliza tu experiencia SignFast',
    'settings.profile': 'Perfil',
    'settings.subaccounts': 'Sub-cuentas',
    'settings.affiliate': 'Afiliación',
    'settings.app': 'Aplicación',
    'settings.language': 'Idioma',
    'settings.language.select': 'Seleccionar idioma',

    // Languages
    'language.french': 'Français',
    'language.english': 'English',
    'language.spanish': 'Español',

    // Common buttons
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.create': 'Crear',
    'common.back': 'Volver',
    'common.next': 'Siguiente',
    'common.previous': 'Anterior',
    'common.loading': 'Cargando...',
    'common.close': 'Cerrar',
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Récupérer la langue sauvegardée ou détecter la langue du navigateur
    const savedLanguage = localStorage.getItem('signfast_language') as Language;
    if (savedLanguage && ['fr', 'en', 'es'].includes(savedLanguage)) {
      return savedLanguage;
    }
    
    // Détecter la langue du navigateur
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('fr')) return 'fr';
    if (browserLang.startsWith('es')) return 'es';
    return 'en'; // Anglais par défaut
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('signfast_language', lang);
    // Mettre à jour la langue du document HTML
    document.documentElement.lang = lang;
  };

  const t = (key: string, params?: Record<string, string>): string => {
    let translation = translations[language][key] || translations.en[key] || key;
    
    // Remplacer les paramètres si fournis
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(`{{${param}}}`, value);
      });
    }
    
    return translation;
  };

  // Mettre à jour la langue du document au chargement
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};