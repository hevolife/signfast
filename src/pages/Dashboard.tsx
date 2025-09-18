import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { 
  Plus, 
  FileText, 
  Users, 
  Calendar,
  BarChart3,
  ArrowRight,
  Activity,
  Sparkles,
  Settings,
  Download
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl shadow-2xl mb-8">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          
          <div className="relative px-6 py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Dashboard SignFast
              </h1>
              <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
                Bienvenue {user?.email} ! Gérez vos formulaires et contrats électroniques
              </p>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/90 mb-1">
                    Formulaires
                  </p>
                  <p className="text-3xl font-bold text-white">
                    0
                  </p>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                  <FileText className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/90 mb-1">
                    Réponses
                  </p>
                  <p className="text-3xl font-bold text-white">
                    0
                  </p>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/90 mb-1">
                    Cette semaine
                  </p>
                  <p className="text-3xl font-bold text-white">
                    0
                  </p>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/90 mb-1">
                    Taux de conversion
                  </p>
                  <p className="text-3xl font-bold text-white">
                    0%
                  </p>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <Link to="/forms/new">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Plus className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-blue-900 mb-2 text-lg">
                  Nouveau Formulaire
                </h3>
                <p className="text-sm text-blue-700">
                  Créer un nouveau formulaire
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <Link to="/forms">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Activity className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-green-900 mb-2 text-lg">
                  Mes Formulaires
                </h3>
                <p className="text-sm text-green-700">
                  Gérer mes formulaires
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <Link to="/templates">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-purple-900 mb-2 text-lg">
                  Templates PDF
                </h3>
                <p className="text-sm text-purple-700">
                  Gérer mes templates
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Section récente activité */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Activité récente
              </h3>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Aucune activité récente
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Créez votre premier formulaire pour commencer
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Formulaires populaires
              </h3>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Aucun formulaire créé
                </p>
                <Link to="/forms/new" className="inline-block mt-4">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un formulaire
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};