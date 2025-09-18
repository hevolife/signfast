import React from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Crown, X, Zap, Check } from 'lucide-react';
import { stripeConfig } from '../../stripe-config';

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'forms' | 'pdfTemplates' | 'savedPdfs';
  currentCount: number;
  maxCount: number;
}

export const LimitReachedModal: React.FC<LimitReachedModalProps> = ({
  isOpen,
  onClose,
  limitType,
  currentCount,
  maxCount,
}) => {
  if (!isOpen) return null;

  const limitMessages = {
    forms: {
      title: 'Limite de formulaires atteinte',
      message: `Vous avez atteint la limite de ${maxCount} formulaire${maxCount > 1 ? 's' : ''} pour votre compte gratuit.`,
      icon: '📝',
    },
    pdfTemplates: {
      title: 'Limite de templates PDF atteinte',
      message: `Vous avez atteint la limite de ${maxCount} template${maxCount > 1 ? 's' : ''} PDF pour votre compte gratuit.`,
      icon: '📄',
    },
    savedPdfs: {
      title: 'Limite de PDFs sauvegardés atteinte',
      message: `Vous avez atteint la limite de ${maxCount} PDF${maxCount > 1 ? 's' : ''} sauvegardé${maxCount > 1 ? 's' : ''} pour votre compte gratuit.`,
      icon: '💾',
    },
  };

  const limit = limitMessages[limitType];
  const product = stripeConfig.products[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{limit.icon}</div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {limit.title}
                </h2>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {product.description}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {limit.message}
          </p>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-2 mb-3">
              <Crown className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {product.name}
              </h3>
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full dark:bg-blue-900 dark:text-blue-300">
                {product.price}€/mois
              </span>
            </div>
            
            <div className="space-y-2">
              {product.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Plus tard
            </Button>
            <Link to="/subscription" className="flex-1">
              <Button className="w-full flex items-center justify-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>Passer Pro</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};