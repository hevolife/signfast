import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { User, Mail, Shield, Bell, Palette, Globe } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Paramètres
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gérez vos préférences et paramètres de compte
          </p>
        </div>

        <div className="space-y-6">
          {/* Profil */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Profil utilisateur
                </h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Adresse email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-gray-50 dark:bg-gray-800"
              />
              <Input
                label="Nom complet"
                type="text"
                placeholder="Votre nom complet"
              />
              <Input
                label="Entreprise"
                type="text"
                placeholder="Nom de votre entreprise"
              />
              <Button>
                Sauvegarder les modifications
              </Button>
            </CardContent>
          </Card>

          {/* Sécurité */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Sécurité
                </h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                <div>
                  <h3 className="font-medium text-green-900 dark:text-green-100">
                    Authentification à deux facteurs
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Sécurisez votre compte avec 2FA
                  </p>
                </div>
                <Button variant="secondary" size="sm">
                  Activer
                </Button>
              </div>
              <Button variant="secondary">
                Changer le mot de passe
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Bell className="h-5 w-5 text-yellow-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Nouvelles réponses aux formulaires
                  </span>
                </label>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Signatures de contrats
                  </span>
                </label>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded border-gray-300" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Newsletter et mises à jour
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Préférences */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Palette className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Préférences
                </h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Thème
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                  <option>Clair</option>
                  <option>Sombre</option>
                  <option>Automatique</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Langue
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                  <option>Français</option>
                  <option>English</option>
                  <option>Español</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};