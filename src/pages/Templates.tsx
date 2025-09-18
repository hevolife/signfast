import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { 
  Plus, 
  FileText, 
  Eye, 
  Edit, 
  Trash2, 
  Calendar,
  Download,
  Copy,
  Star,
  Users,
  Clock
} from 'lucide-react';

export const Templates: React.FC = () => {
  // Templates de démonstration
  const templates = [
    {
      id: '1',
      name: 'Contrat de Location',
      description: 'Template complet pour contrats de location immobilière',
      category: 'Immobilier',
      fields: 12,
      uses: 45,
      rating: 4.8,
      created_at: '2024-01-15',
      is_public: true,
      preview_url: '/templates/1/preview'
    },
    {
      id: '2',
      name: 'Contrat de Prestation',
      description: 'Pour prestations de services entre professionnels',
      category: 'Business',
      fields: 8,
      uses: 32,
      rating: 4.6,
      created_at: '2024-01-20',
      is_public: true,
      preview_url: '/templates/2/preview'
    },
    {
      id: '3',
      name: 'Accord de Confidentialité',
      description: 'NDA standard pour protéger vos informations',
      category: 'Juridique',
      fields: 6,
      uses: 28,
      rating: 4.9,
      created_at: '2024-01-25',
      is_public: true,
      preview_url: '/templates/3/preview'
    }
  ];

  const categories = ['Tous', 'Immobilier', 'Business', 'Juridique', 'RH', 'Commercial'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Templates PDF
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Utilisez nos templates pré-conçus ou créez les vôtres
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/templates/new">
              <Button className="flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Nouveau template</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Filtres par catégorie */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => (
            <Button
              key={category}
              variant={category === 'Tous' ? 'primary' : 'ghost'}
              size="sm"
              className="rounded-full"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/90 mb-1">
                    Templates disponibles
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {templates.length}
                  </p>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                  <FileText className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/90 mb-1">
                    Utilisations totales
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {templates.reduce((sum, t) => sum + t.uses, 0)}
                  </p>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/90 mb-1">
                    Note moyenne
                  </p>
                  <p className="text-3xl font-bold text-white">
                    4.8/5
                  </p>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                  <Star className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des templates */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                      {template.name}
                    </h3>
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      {template.category}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-yellow-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {template.rating}
                    </span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                  {template.description}
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span>{template.fields} champs</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{template.uses} utilisations</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(template.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" className="p-2">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="p-2">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="primary" size="sm">
                      Utiliser
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Template vide pour créer */}
        <Card className="mt-6 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 transition-colors">
          <Link to="/templates/new">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-gray-800 dark:to-gray-700 rounded-3xl mb-4 shadow-lg">
                <Plus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Créer un nouveau template
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Concevez votre propre template PDF personnalisé
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
};