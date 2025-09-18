import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Plus, FileText, Eye, Edit, Trash2, Calendar, Users, BarChart3, Globe, Lock } from 'lucide-react';
import { useForms } from '../contexts/FormsContext';

export const Forms: React.FC = () => {
  const { forms, deleteForm } = useForms();

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le formulaire "${title}" ?`)) {
      deleteForm(id);
    }
  };

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

        {forms.length === 0 ? (
          /* État vide */
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
        ) : (
          /* Liste des formulaires */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <Card key={form.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                        {form.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                          form.is_published 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {form.is_published ? 'Publié' : 'Brouillon'}
                        </span>
                        {form.password && (
                          <Lock className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {form.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                      {form.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <FileText className="h-4 w-4" />
                        <span>{form.fields.length} champs</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>0 réponses</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(form.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" className="p-2">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="p-2">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-2 text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(form.id, form.title)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};