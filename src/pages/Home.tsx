import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
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
  ArrowRight,
  Smartphone,
  Globe,
  Lock,
  Sparkles,
  Crown
} from 'lucide-react';

export const Home: React.FC = () => {
  const { user } = useAuth();

  // Rediriger vers le dashboard si l'utilisateur est connecté
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
          <div className="absolute inset-0 bg-black/20"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-8 shadow-xl">
              <Sparkles className="h-4 w-4 mr-2" />
              Signature électronique • Génération PDF • Contrats automatisés
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight">
              Créez des
              <span className="block bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                contrats électroniques
              </span>
              <span className="block">
                en quelques clics
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-white/90 mb-12 max-w-4xl mx-auto leading-relaxed">
              Contrats de location, prestations de services, accords commerciaux... 
              Créez, signez et gérez tous vos documents légaux avec signature électronique valide.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/signup">
                <Button size="lg" className="group bg-white text-blue-600 hover:bg-gray-100 font-bold px-8 py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 rounded-2xl">
                  <PenTool className="h-6 w-6 mr-3" />
                  Créer mon premier contrat
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
              <div className="text-center group">
                <div className="text-3xl lg:text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">99.9%</div>
                <div className="text-white/80 text-sm font-medium">Fiabilité</div>
              </div>
              <div className="text-center group">
                <div className="text-3xl lg:text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">2min</div>
                <div className="text-white/80 text-sm font-medium">Création moyenne</div>
              </div>
              <div className="text-center group">
                <div className="text-3xl lg:text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">100%</div>
                <div className="text-white/80 text-sm font-medium">Légal en France</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Fonctionnalités */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Signature électronique simplifiée
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Une solution complète pour digitaliser vos processus contractuels
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              {[
                {
                  icon: <PenTool className="h-8 w-8 text-blue-600" />,
                  title: "Signature électronique légale",
                  description: "Signatures conformes au règlement eIDAS européen. Valeur juridique équivalente à la signature manuscrite."
                },
                {
                  icon: <Clock className="h-8 w-8 text-green-600" />,
                  title: "Création en 2 minutes",
                  description: "Interface intuitive avec templates pré-conçus. Glissez-déposez vos champs et c'est prêt."
                },
                {
                  icon: <Smartphone className="h-8 w-8 text-purple-600" />,
                  title: "Signature sur mobile",
                  description: "Vos clients signent directement sur leur téléphone, tablette ou ordinateur. Aucune app à télécharger."
                },
                {
                  icon: <Shield className="h-8 w-8 text-red-600" />,
                  title: "Sécurité maximale",
                  description: "Chiffrement bout-en-bout, horodatage certifié et archivage sécurisé."
                }
              ].map((feature, index) => (
                <div key={index} className="flex items-start space-x-6 group animate-slide-in-bottom" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Mockup */}
            <div className="relative animate-slide-in-bottom" style={{ animationDelay: '0.5s' }}>
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl p-8 shadow-2xl">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Contrat de Prestation</h4>
                    <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">En cours</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full w-3/4"></div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>Prestataire: Jean Dupont</span>
                      <span className="font-bold text-blue-600">75% complété</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Informations personnelles ✓</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Conditions de prestation ✓</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Signature électronique...</span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border-2 border-dashed border-purple-300">
                      <div className="flex items-center space-x-3">
                        <PenTool className="h-5 w-5 text-purple-600" />
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Zone de signature</span>
                      </div>
                      <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        Signer maintenant
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-800">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Prêt à digitaliser vos contrats ?
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Rejoignez des milliers d'entreprises qui ont simplifié leur processus contractuel
          </p>
          
          <Link to="/signup">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 font-bold px-8 py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 rounded-2xl">
              <PenTool className="h-6 w-6 mr-3" />
              Commencer gratuitement
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center mt-16">
            <div>
              <div className="text-2xl font-bold text-white mb-1">1 000+</div>
              <div className="text-blue-200 text-sm font-medium">Contrats signés</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">100+</div>
              <div className="text-blue-200 text-sm font-medium">Entreprises</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">99.9%</div>
              <div className="text-blue-200 text-sm font-medium">Disponibilité</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">4.9/5</div>
              <div className="text-blue-200 text-sm font-medium">Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FormInput className="h-6 w-6 text-white" />
                </div>
                <span className="text-3xl font-bold">SignFast</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
                La solution française de signature électronique pour tous vos contrats. 
                Simple, sécurisé et conforme à la réglementation européenne.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-lg">Types de contrats</h4>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li>Contrats de location</li>
                <li>Prestations de services</li>
                <li>Accords commerciaux</li>
                <li>Contrats de travail</li>
                <li>Partenariats</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-lg">Fonctionnalités</h4>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li>Signature électronique</li>
                <li>Templates personnalisés</li>
                <li>Génération PDF</li>
                <li>Archivage sécurisé</li>
                <li>API disponible</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2025 SignFast. Tous droits réservés. Signature électronique conforme eIDAS.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};