import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from '../components/language/LanguageSelector';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useDemo } from '../contexts/DemoContext';
import { 
  FormInput, 
  BarChart3, 
  Share2, 
  Download, 
  Zap, 
  Shield, 
  FileText,
  PenTool,
  Clock,
  Users,
  CheckCircle,
  Star,
  ArrowRight,
  Smartphone,
  Globe,
  Lock,
  Sparkles,
  Crown,
  TrendingUp,
  Calendar,
  Mail,
  Eye,
  MousePointer,
  Layers
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Home: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { startDemo } = useDemo();
  const location = useLocation();
  const [isVisible, setIsVisible] = React.useState(false);

  // Animation d'entrée
  React.useEffect(() => {
    setIsVisible(true);
  }, []);

  // Rediriger vers le dashboard si l'utilisateur est connecté
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 overflow-hidden">
      {/* Sélecteur de langue en haut à droite */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector variant="compact" showLabel={false} />
      </div>
      
      {/* Hero Section avec animations */}
      <div className="relative overflow-hidden">
        {/* Background animé */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
          <div className="absolute inset-0 bg-black/20"></div>
          {/* Éléments décoratifs animés */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-yellow-400/20 rounded-full blur-2xl animate-bounce"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-pink-400/20 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/3 right-1/3 w-20 h-20 bg-green-400/20 rounded-full blur-lg animate-bounce delay-500"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Badge animé */}
            <div className="inline-flex items-center px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 animate-in slide-in-from-top duration-700 delay-300">
              <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
              Signature électronique • Génération PDF • Contrats automatisés
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight animate-in slide-in-from-bottom duration-1000 delay-500">
              {t('home.hero.title').split(' ').slice(0, 2).join(' ')}
              <span className="block bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
                {t('home.hero.title').split(' ').slice(2, 4).join(' ')}
              </span>
              <span className="block animate-in slide-in-from-right duration-1000 delay-700">
                {t('home.hero.title').split(' ').slice(4).join(' ')}
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-white/90 mb-12 max-w-4xl mx-auto leading-relaxed animate-in fade-in duration-1000 delay-1000">
              {t('home.hero.subtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-in slide-in-from-bottom duration-1000 delay-1200">
              <Link to="/signup">
                <Button size="lg" className="group bg-white text-blue-600 hover:bg-gray-100 font-bold px-8 py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 rounded-2xl">
                  <PenTool className="h-6 w-6 mr-3 group-hover:animate-pulse" />
                  {t('home.hero.cta.primary')}
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="lg" 
                className="group text-white border-white/30 hover:bg-white/10 px-8 py-4 text-lg backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                onClick={() => {
                  startDemo();
                  window.location.href = '/dashboard';
                }}
              >
                <Eye className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                <span>{t('home.hero.cta.demo')}</span>
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Stats animées */}
            <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto animate-in fade-in duration-1000 delay-1500">
              <div className="text-center group">
                <div className="text-3xl lg:text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">99.9%</div>
                <div className="text-white/80 text-sm font-medium">{t('home.hero.stats.reliability')}</div>
              </div>
              <div className="text-center group">
                <div className="text-3xl lg:text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">2min</div>
                <div className="text-white/80 text-sm font-medium">{t('home.hero.stats.creation')}</div>
              </div>
              <div className="text-center group">
                <div className="text-3xl lg:text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">100%</div>
                <div className="text-white/80 text-sm font-medium">{t('home.hero.stats.legal')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Types de Contrats avec animations */}
      <section className="py-20 bg-white dark:bg-gray-900 relative overflow-hidden">
        {/* Background décoratif */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10"></div>
        <div className="absolute top-10 right-10 w-64 h-64 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-in slide-in-from-top duration-1000">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full text-blue-800 dark:text-blue-300 text-sm font-medium mb-6 shadow-lg">
              <FileText className="h-4 w-4 mr-2" />
              Tous vos contrats professionnels
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Tous vos contrats en un seul endroit
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              De la location immobilière aux prestations de services, créez des contrats professionnels 
              avec signature électronique en quelques minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "🏠",
                title: "Contrats de Location",
                description: "Baux d'habitation, commerciaux, saisonniers avec clauses personnalisables",
                features: ["État des lieux intégré", "Caution et loyers", "Renouvellement automatique"],
                color: "from-blue-500 to-indigo-600",
                delay: "delay-100"
              },
              {
                icon: "🤝",
                title: "Prestations de Services",
                description: "Contrats freelance, consulting, maintenance avec conditions sur mesure",
                features: ["Tarification flexible", "Livrables définis", "Pénalités de retard"],
                color: "from-green-500 to-emerald-600",
                delay: "delay-200"
              },
              {
                icon: "💼",
                title: "Accords Commerciaux",
                description: "Partenariats, distribution, franchise avec protection juridique",
                features: ["Clauses de confidentialité", "Territoires exclusifs", "Commissions"],
                color: "from-purple-500 to-pink-600",
                delay: "delay-300"
              },
              {
                icon: "👥",
                title: "Contrats de Travail",
                description: "CDI, CDD, stages avec conformité légale garantie",
                features: ["Convention collective", "Période d'essai", "Avantages sociaux"],
                color: "from-orange-500 to-red-600",
                delay: "delay-400"
              },
              {
                icon: "🚚",
                title: "Transport & Logistique",
                description: "Contrats de transport, stockage, livraison avec assurances",
                features: ["Responsabilité limitée", "Délais garantis", "Tracking inclus"],
                color: "from-teal-500 to-cyan-600",
                delay: "delay-500"
              },
              {
                icon: "⚡",
                title: "Contrats Express",
                description: "Templates pré-remplis pour signature immédiate",
                features: ["Validation en 1 clic", "Envoi automatique", "Archivage sécurisé"],
                color: "from-yellow-500 to-orange-600",
                delay: "delay-600"
              }
            ].map((contract, index) => (
              <Card key={index} className={`group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/80 backdrop-blur-sm border-0 shadow-xl animate-in slide-in-from-bottom duration-700 ${contract.delay}`}>
                <CardContent className="p-8 relative overflow-hidden">
                  {/* Background gradient au hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${contract.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                  
                  <div className="relative">
                    <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">{contract.icon}</div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-blue-600 transition-colors">
                      {contract.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      {contract.description}
                    </p>
                    <ul className="space-y-3">
                      {contract.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0 group-hover:scale-110 transition-transform" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Section Fonctionnalités avec animations */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 relative overflow-hidden">
        {/* Background décoratif animé */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-in slide-in-from-top duration-1000">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full text-purple-800 dark:text-purple-300 text-sm font-medium mb-6 shadow-lg">
              <PenTool className="h-4 w-4 mr-2" />
              Signature électronique nouvelle génération
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              {t('features.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Fonctionnalités */}
            <div className="space-y-8 animate-in slide-in-from-left duration-1000 delay-300">
              {[
                {
                  icon: <PenTool className="h-8 w-8 text-blue-600" />,
                  title: t('features.legal.title'),
                  description: t('features.legal.desc'),
                  color: "from-blue-100 to-blue-200",
                  delay: "delay-100"
                },
                {
                  icon: <Clock className="h-8 w-8 text-green-600" />,
                  title: t('features.fast.title'),
                  description: t('features.fast.desc'),
                  color: "from-green-100 to-green-200",
                  delay: "delay-200"
                },
                {
                  icon: <Smartphone className="h-8 w-8 text-purple-600" />,
                  title: t('features.mobile.title'),
                  description: t('features.mobile.desc'),
                  color: "from-purple-100 to-purple-200",
                  delay: "delay-300"
                },
                {
                  icon: <Shield className="h-8 w-8 text-red-600" />,
                  title: t('features.security.title'),
                  description: t('features.security.desc'),
                  color: "from-red-100 to-red-200",
                  delay: "delay-400"
                }
              ].map((feature, index) => (
                <div key={index} className={`flex items-start space-x-6 group animate-in slide-in-from-left duration-700 ${feature.delay}`}>
                  <div className={`flex-shrink-0 w-16 h-16 bg-gradient-to-br ${feature.color} dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                    {feature.icon}
                  </div>
                  <div className="group-hover:translate-x-2 transition-transform duration-300">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Mockup animé */}
            <div className="relative animate-in slide-in-from-right duration-1000 delay-500">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2 hover:rotate-1">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-6 shadow-inner">
                  {/* Header du contrat */}
                  <div className="flex items-center justify-between animate-pulse">
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Contrat de Prestation</h4>
                    <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold shadow-sm">En cours</span>
                  </div>
                  
                  {/* Barre de progression animée */}
                  <div className="space-y-3">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full w-3/4 animate-pulse shadow-lg"></div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Prestataire: Jean Dupont</span>
                      <span className="font-bold text-blue-600">75% complété</span>
                    </div>
                  </div>
                  
                  {/* Champs du formulaire */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Informations personnelles ✓</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse delay-200"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Conditions de prestation ✓</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Signature électronique...</span>
                    </div>
                  </div>
                  
                  {/* Zone de signature */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-700">
                      <div className="flex items-center space-x-3">
                        <PenTool className="h-5 w-5 text-purple-600 animate-pulse" />
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Zone de signature</span>
                      </div>
                      <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse">
                        Signer maintenant
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Éléments flottants animés */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full animate-bounce shadow-lg"></div>
              <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-green-400 rounded-full animate-bounce delay-1000 shadow-lg"></div>
              <div className="absolute top-1/2 -left-6 w-4 h-4 bg-pink-400 rounded-full animate-pulse delay-500 shadow-lg"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Processus avec animations */}
      <section className="py-20 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 relative overflow-hidden">
        {/* Background animé */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-indigo-200/40 to-purple-200/40 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-br from-pink-200/40 to-red-200/40 rounded-full blur-2xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-in slide-in-from-top duration-1000">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full text-indigo-800 dark:text-indigo-300 text-sm font-medium mb-6 shadow-lg">
              <Layers className="h-4 w-4 mr-2" />
              Processus simplifié
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              {t('process.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('process.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: t('process.step1.title'),
                description: t('process.step1.desc'),
                icon: <FileText className="h-12 w-12 text-blue-600" />,
                color: "blue",
                bgColor: "from-blue-50 to-blue-100",
                delay: "delay-200"
              },
              {
                step: "02", 
                title: t('process.step2.title'),
                description: t('process.step2.desc'),
                icon: <Share2 className="h-12 w-12 text-green-600" />,
                color: "green",
                bgColor: "from-green-50 to-green-100",
                delay: "delay-400"
              },
              {
                step: "03",
                title: t('process.step3.title'),
                description: t('process.step3.desc'),
                icon: <Download className="h-12 w-12 text-purple-600" />,
                color: "purple",
                bgColor: "from-purple-50 to-purple-100",
                delay: "delay-600"
              }
            ].map((step, index) => (
              <div key={index} className={`relative animate-in slide-in-from-bottom duration-700 ${step.delay}`}>
                <Card className={`text-center group hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 bg-gradient-to-br ${step.bgColor} dark:from-gray-800 dark:to-gray-700 border-0 shadow-xl relative overflow-hidden`}>
                  {/* Numéro d'étape en arrière-plan */}
                  <div className={`absolute top-4 right-4 text-8xl font-bold text-${step.color}-600/10 dark:text-${step.color}-400/10 group-hover:scale-110 transition-transform duration-500`}>
                    {step.step}
                  </div>
                  
                  <CardContent className="p-8 relative">
                    <div className={`inline-flex items-center justify-center w-20 h-20 bg-white dark:bg-gray-800 rounded-3xl mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-xl`}>
                      {step.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-blue-600 transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
                
                {/* Flèche de connexion animée */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Avantages avec animations */}
      <section className="py-20 bg-white dark:bg-gray-900 relative overflow-hidden">
        {/* Particules flottantes */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
          <div className="absolute top-20 right-20 w-3 h-3 bg-purple-400 rounded-full animate-ping delay-1000"></div>
          <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-green-400 rounded-full animate-ping delay-500"></div>
          <div className="absolute bottom-10 right-1/3 w-3 h-3 bg-pink-400 rounded-full animate-ping delay-1500"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Avantages */}
            <div className="animate-in slide-in-from-left duration-1000">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full text-green-800 dark:text-green-300 text-sm font-medium mb-6 shadow-lg">
                <Crown className="h-4 w-4 mr-2" />
                Pourquoi choisir SignFast
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-8">
                Pourquoi choisir SignFast ?
              </h2>
              
              <div className="space-y-6">
                {[
                  {
                    icon: <Globe className="h-6 w-6 text-blue-600" />,
                    title: "Accessible partout",
                    description: "Vos clients signent depuis n'importe quel appareil, n'importe où dans le monde",
                    delay: "delay-100"
                  },
                  {
                    icon: <Clock className="h-6 w-6 text-green-600" />,
                    title: "Gain de temps énorme",
                    description: "Fini les impressions, envois postaux et attentes. Signature en temps réel",
                    delay: "delay-200"
                  },
                  {
                    icon: <Lock className="h-6 w-6 text-red-600" />,
                    title: "Conformité RGPD",
                    description: "Données hébergées en France, chiffrement militaire, conformité totale",
                    delay: "delay-300"
                  },
                  {
                    icon: <BarChart3 className="h-6 w-6 text-purple-600" />,
                    title: "Suivi en temps réel",
                    description: "Dashboard complet pour suivre l'état de tous vos contrats",
                    delay: "delay-400"
                  }
                ].map((benefit, index) => (
                  <div key={index} className={`flex items-start space-x-4 group animate-in slide-in-from-left duration-700 ${benefit.delay}`}>
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                      {benefit.icon}
                    </div>
                    <div className="group-hover:translate-x-2 transition-transform duration-300">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard mockup animé */}
            <div className="relative animate-in slide-in-from-right duration-1000 delay-300">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-2 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2 hover:-rotate-1">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-inner">
                  {/* Header dashboard */}
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Dashboard SignFast</h4>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 font-medium">En ligne</span>
                    </div>
                  </div>
                  
                  {/* Stats cards */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl">
                      <div className="text-2xl font-bold text-blue-600 animate-pulse">12</div>
                      <div className="text-xs text-blue-700 dark:text-blue-400">Contrats signés</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl">
                      <div className="text-2xl font-bold text-green-600 animate-pulse delay-200">8</div>
                      <div className="text-xs text-green-700 dark:text-green-400">Cette semaine</div>
                    </div>
                  </div>
                  
                  {/* Liste des contrats récents */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Bail commercial - Signé</span>
                      </div>
                      <Download className="h-4 w-4 text-gray-400 hover:text-blue-500 transition-colors cursor-pointer" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse delay-300"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Prestation web - En attente</span>
                      </div>
                      <Eye className="h-4 w-4 text-gray-400 hover:text-blue-500 transition-colors cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Témoignages avec animations */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-in slide-in-from-top duration-1000">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-full text-yellow-800 dark:text-yellow-300 text-sm font-medium mb-6 shadow-lg">
              <Users className="h-4 w-4 mr-2" />
              Témoignages clients
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Ils nous font confiance
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Sophie L.",
                role: "Agent Immobilier",
                content: "Mes baux sont signés en 24h au lieu de 2 semaines. Mes clients adorent la simplicité !",
                rating: 5,
                avatar: "👩‍💼",
                delay: "delay-100"
              },
              {
                name: "Thomas R.", 
                role: "Consultant Freelance",
                content: "Fini les allers-retours par email. Mes contrats de prestation sont signés instantanément.",
                rating: 5,
                avatar: "👨‍💻",
                delay: "delay-300"
              },
              {
                name: "Marie C.",
                role: "Directrice RH",
                content: "Parfait pour nos contrats de travail. Interface claire et conformité légale garantie.",
                rating: 5,
                avatar: "👩‍💼",
                delay: "delay-500"
              }
            ].map((testimonial, index) => (
              <Card key={index} className={`group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/80 backdrop-blur-sm border-0 shadow-xl animate-in slide-in-from-bottom duration-700 ${testimonial.delay}`}>
                <CardContent className="p-8 relative overflow-hidden">
                  {/* Background gradient au hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative">
                    {/* Avatar et étoiles */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="text-4xl group-hover:scale-110 transition-transform duration-300">{testimonial.avatar}</div>
                      <div className="flex items-center space-x-1">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 text-yellow-400 fill-current group-hover:animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                        ))}
                      </div>
                    </div>
                    
                    {/* Témoignage */}
                    <p className="text-gray-600 dark:text-gray-300 mb-6 italic leading-relaxed group-hover:text-gray-700 transition-colors">
                      "{testimonial.content}"
                    </p>
                    
                    {/* Auteur */}
                    <div className="border-t pt-4">
                      <div className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{testimonial.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Section CTA finale avec animations */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-800 relative overflow-hidden">
        {/* Background animé */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/80 via-purple-600/80 to-indigo-800/80"></div>
          <div className="absolute top-10 right-10 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-yellow-400/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="animate-in slide-in-from-bottom duration-1000">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-8 shadow-lg">
              <Zap className="h-4 w-4 mr-2 animate-pulse" />
              Prêt à commencer ?
            </div>
            
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 animate-in slide-in-from-top duration-1000 delay-200">
              Prêt à digitaliser vos contrats ?
            </h2>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed animate-in fade-in duration-1000 delay-400">
              Rejoignez des milliers d'entreprises qui ont simplifié leur processus contractuel
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12 animate-in slide-in-from-bottom duration-1000 delay-600">
              <Link to="/signup">
                <Button size="lg" className="group bg-white text-blue-600 hover:bg-gray-100 font-bold px-8 py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 rounded-2xl">
                  <PenTool className="h-6 w-6 mr-3 group-hover:animate-pulse" />
                  Commencer gratuitement
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <div className="text-white/90 text-sm font-medium space-y-1">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>Aucune carte bancaire requise</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>Configuration en 2 minutes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>Support client inclus</span>
                </div>
              </div>
            </div>

            {/* Stats finales animées */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center animate-in fade-in duration-1000 delay-800">
              <div className="group">
                <div className="text-2xl font-bold text-white mb-1 group-hover:scale-110 transition-transform">1 000+</div>
                <div className="text-blue-200 text-sm font-medium">Contrats signés</div>
              </div>
              <div className="group">
                <div className="text-2xl font-bold text-white mb-1 group-hover:scale-110 transition-transform">100+</div>
                <div className="text-blue-200 text-sm font-medium">Entreprises</div>
              </div>
              <div className="group">
                <div className="text-2xl font-bold text-white mb-1 group-hover:scale-110 transition-transform">99.9%</div>
                <div className="text-blue-200 text-sm font-medium">Disponibilité</div>
              </div>
              <div className="group">
                <div className="text-2xl font-bold text-white mb-1 group-hover:scale-110 transition-transform">4.9/5</div>
                <div className="text-blue-200 text-sm font-medium">Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer moderne avec animations */}
      <footer className="bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 text-white py-16 relative overflow-hidden">
        {/* Background décoratif */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          <div className="absolute top-10 right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl animate-pulse"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Logo et description */}
            <div className="md:col-span-2 animate-in slide-in-from-left duration-1000">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FormInput className="h-6 w-6 text-white" />
                </div>
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">SignFast</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
                La solution française de signature électronique pour tous vos contrats. 
                Simple, sécurisé et conforme à la réglementation européenne.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center space-x-2 bg-white/5 px-3 py-2 rounded-lg">
                  <span>🇫🇷</span>
                  <span>Hébergé en France</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/5 px-3 py-2 rounded-lg">
                  <span>🔒</span>
                  <span>Conforme RGPD</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/5 px-3 py-2 rounded-lg">
                  <span>⚡</span>
                  <span>Support 24/7</span>
                </div>
              </div>
            </div>
            
            {/* Types de contrats */}
            <div className="animate-in slide-in-from-bottom duration-1000 delay-200">
              <h4 className="font-bold mb-6 text-lg">Types de contrats</h4>
              <ul className="space-y-3 text-gray-400 text-sm">
                {[
                  "Contrats de location",
                  "Prestations de services", 
                  "Accords commerciaux",
                  "Contrats de travail",
                  "Partenariats"
                ].map((item, index) => (
                  <li key={index} className="flex items-center space-x-2 hover:text-white transition-colors cursor-pointer">
                    <ArrowRight className="h-3 w-3 text-blue-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Fonctionnalités */}
            <div className="animate-in slide-in-from-bottom duration-1000 delay-400">
              <h4 className="font-bold mb-6 text-lg">Fonctionnalités</h4>
              <ul className="space-y-3 text-gray-400 text-sm">
                {[
                  "Signature électronique",
                  "Templates personnalisés",
                  "Génération PDF",
                  "Archivage sécurisé",
                  "API disponible"
                ].map((item, index) => (
                  <li key={index} className="flex items-center space-x-2 hover:text-white transition-colors cursor-pointer">
                    <CheckCircle className="h-3 w-3 text-green-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400 text-sm animate-in fade-in duration-1000 delay-1000">
            <p>&copy; 2025 SignFast. Tous droits réservés. Signature électronique conforme eIDAS.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};