import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { AdminSetupButton } from '../components/admin/AdminSetupButton';
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
  Star,
  ArrowRight,
  Smartphone,
  Globe,
  Lock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Home: React.FC = () => {
  const { user } = useAuth();

  // Rediriger vers le dashboard si l'utilisateur est connecté
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-8">
              <Zap className="h-4 w-4 mr-2" />
              Signature électronique • Génération PDF • Contrats automatisés
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight">
              Créez des
              <span className="block bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                contrats électroniques
              </span>
              en quelques clics
            </h1>
            
            <p className="text-xl lg:text-2xl text-white/90 mb-12 max-w-4xl mx-auto leading-relaxed">
              Contrats de location, prestations de services, accords commerciaux... 
              Créez, signez et gérez tous vos documents légaux avec signature électronique valide.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/signup">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-4 text-lg shadow-xl">
                  <PenTool className="h-6 w-6 mr-3" />
                  Créer mon premier contrat
                </Button>
              </Link>
              <Link to="#demo">
                <Button variant="ghost" size="lg" className="text-white border-white/30 hover:bg-white/10 px-8 py-4 text-lg">
                  <span>Voir la démo</span>
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-white mb-2">99.9%</div>
                <div className="text-white/80 text-sm">Fiabilité</div>
              </div>
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-white mb-2">2min</div>
                <div className="text-white/80 text-sm">Création moyenne</div>
              </div>
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-white mb-2">100%</div>
                <div className="text-white/80 text-sm">Légal en France</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-yellow-400/20 rounded-full blur-xl"></div>
      </div>

      {/* Contract Types Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Tous vos contrats en un seul endroit
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
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
                features: ["État des lieux intégré", "Caution et loyers", "Renouvellement automatique"]
              },
              {
                icon: "🤝",
                title: "Prestations de Services",
                description: "Contrats freelance, consulting, maintenance avec conditions sur mesure",
                features: ["Tarification flexible", "Livrables définis", "Pénalités de retard"]
              },
              {
                icon: "💼",
                title: "Accords Commerciaux",
                description: "Partenariats, distribution, franchise avec protection juridique",
                features: ["Clauses de confidentialité", "Territoires exclusifs", "Commissions"]
              },
              {
                icon: "👥",
                title: "Contrats de Travail",
                description: "CDI, CDD, stages avec conformité légale garantie",
                features: ["Convention collective", "Période d'essai", "Avantages sociaux"]
              },
              {
                icon: "🚚",
                title: "Transport & Logistique",
                description: "Contrats de transport, stockage, livraison avec assurances",
                features: ["Responsabilité limitée", "Délais garantis", "Tracking inclus"]
              },
              {
                icon: "⚡",
                title: "Contrats Express",
                description: "Templates pré-remplis pour signature immédiate",
                features: ["Validation en 1 clic", "Envoi automatique", "Archivage sécurisé"]
              }
            ].map((contract, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-8">
                  <div className="text-4xl mb-4">{contract.icon}</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {contract.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                    {contract.description}
                  </p>
                  <ul className="space-y-2">
                    {contract.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Signature électronique simplifiée
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
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
                  description: "Chiffrement bout-en-bout, horodatage certifié et archivage sécurisé pendant 10 ans."
                }
              ].map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 shadow-2xl">
                <div className="bg-white rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900">Contrat de Prestation</h4>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">En cours</span>
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 bg-gray-200 rounded-full">
                      <div className="h-3 bg-blue-500 rounded-full w-3/4"></div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Prestataire: Jean Dupont</span>
                      <span>75% complété</span>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Signature requise</span>
                      <div className="flex items-center space-x-2">
                        <PenTool className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">Signer maintenant</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full animate-pulse"></div>
              <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-green-400 rounded-full animate-pulse delay-1000"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              3 étapes pour un contrat signé
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Processus simplifié pour une efficacité maximale
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Créez votre contrat",
                description: "Choisissez un template ou créez votre contrat personnalisé avec notre éditeur intuitif",
                icon: <FileText className="h-12 w-12 text-blue-600" />,
                color: "blue"
              },
              {
                step: "02", 
                title: "Partagez et collectez",
                description: "Envoyez le lien à vos clients. Ils remplissent et signent directement en ligne",
                icon: <Share2 className="h-12 w-12 text-green-600" />,
                color: "green"
              },
              {
                step: "03",
                title: "Récupérez le PDF signé",
                description: "Téléchargez automatiquement le contrat signé au format PDF avec valeur légale",
                icon: <Download className="h-12 w-12 text-purple-600" />,
                color: "purple"
              }
            ].map((step, index) => (
              <div key={index} className="relative">
                <Card className="text-center group hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                  <CardContent className="p-8">
                    <div className={`inline-flex items-center justify-center w-20 h-20 bg-${step.color}-100 rounded-2xl mb-6 group-hover:scale-110 transition-transform`}>
                      {step.icon}
                    </div>
                    <div className={`text-6xl font-bold text-${step.color}-600 mb-4 opacity-20`}>
                      {step.step}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
                
                {/* Connector arrow */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="h-8 w-8 text-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-8">
                Pourquoi choisir SignFast ?
              </h2>
              
              <div className="space-y-6">
                {[
                  {
                    icon: <Globe className="h-6 w-6 text-blue-600" />,
                    title: "Accessible partout",
                    description: "Vos clients signent depuis n'importe quel appareil, n'importe où dans le monde"
                  },
                  {
                    icon: <Clock className="h-6 w-6 text-green-600" />,
                    title: "Gain de temps énorme",
                    description: "Fini les impressions, envois postaux et attentes. Signature en temps réel"
                  },
                  {
                    icon: <Lock className="h-6 w-6 text-red-600" />,
                    title: "Conformité RGPD",
                    description: "Données hébergées en France, chiffrement militaire, conformité totale"
                  },
                  {
                    icon: <BarChart3 className="h-6 w-6 text-purple-600" />,
                    title: "Suivi en temps réel",
                    description: "Dashboard complet pour suivre l'état de tous vos contrats"
                  }
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-1 shadow-2xl">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Contrat de Location</h4>
                      <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full">Signé ✓</span>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Locataire:</span>
                        <span className="font-medium text-gray-900 dark:text-white">Marie Martin</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Loyer:</span>
                        <span className="font-medium text-gray-900 dark:text-white">1 200€/mois</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Durée:</span>
                        <span className="font-medium text-gray-900 dark:text-white">3 ans</span>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <PenTool className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600 font-medium">Signé le 15/01/2025</span>
                        </div>
                        <Button size="sm" variant="ghost" className="text-blue-600">
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
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
                rating: 5
              },
              {
                name: "Thomas R.", 
                role: "Consultant Freelance",
                content: "Fini les allers-retours par email. Mes contrats de prestation sont signés instantanément.",
                rating: 5
              },
              {
                name: "Marie C.",
                role: "Directrice RH",
                content: "Parfait pour nos contrats de travail. Interface claire et conformité légale garantie.",
                rating: 5
              }
            ].map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Prêt à digitaliser vos contrats ?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Rejoignez des milliers d'entreprises qui ont simplifié leur processus contractuel
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link to="/signup">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-4 text-lg shadow-xl">
                <PenTool className="h-6 w-6 mr-3" />
                Commencer gratuitement
              </Button>
            </Link>
            <div className="text-white/90 text-sm">
              ✓ Aucune carte bancaire requise<br/>
              ✓ Configuration en 2 minutes<br/>
              ✓ Support client inclus
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-white mb-1">10 000+</div>
              <div className="text-blue-200 text-sm">Contrats signés</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">500+</div>
              <div className="text-blue-200 text-sm">Entreprises</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">99.9%</div>
              <div className="text-blue-200 text-sm">Disponibilité</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">4.9/5</div>
              <div className="text-blue-200 text-sm">Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <FormInput className="h-8 w-8 text-blue-400" />
                <span className="text-2xl font-bold">SignFast</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                La solution française de signature électronique pour tous vos contrats. 
                Simple, sécurisé et conforme à la réglementation européenne.
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <span>🇫🇷 Hébergé en France</span>
                <span>🔒 Conforme RGPD</span>
                <span>⚡ Support 24/7</span>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Types de contrats</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>Contrats de location</li>
                <li>Prestations de services</li>
                <li>Accords commerciaux</li>
                <li>Contrats de travail</li>
                <li>Partenariats</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Fonctionnalités</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>Signature électronique</li>
                <li>Templates personnalisés</li>
                <li>Génération PDF</li>
                <li>Archivage sécurisé</li>
                <li>API disponible</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2025 SignFast. Tous droits réservés. Signature électronique conforme eIDAS.</p>
          </div>
        </div>
      </footer>
      
      {/* Admin Setup Button */}
      <AdminSetupButton />
    </div>
  );
};