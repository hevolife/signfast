import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Plus, FileText, Eye, Edit, Trash2, Calendar } from 'lucide-react';

export const Forms: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Mes Formulaires
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gérez tous vos formulaires et contrats électroniques
            </p>
          </div>
          <Link to="/forms/new">
            <Button className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Nouveau formulaire</span>
            </Button>
          </Link>
        </div>

        {/* État vide */}
        <Card className="text-center py-16">
          <CardContent>
            <div className="max-w-md mx-auto">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl mb-6 shadow-lg">
                <FileText className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Aucun formulaire créé
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Commencez par créer votre premier formulaire pour collecter des signatures électroniques et générer des contrats automatiquement.
              </p>
              <Link to="/forms/new">
                <Button size="lg" className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Créer mon premier formulaire</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};