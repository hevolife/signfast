import React from 'react';
import { Button } from '../ui/Button';
import { BookOpen, Play } from 'lucide-react';

interface TutorialButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const TutorialButton: React.FC<TutorialButtonProps> = ({
  className = '',
  variant = 'ghost',
  size = 'sm',
}) => {
  const handleStartTutorial = () => {
    // Déclencher l'événement global pour ouvrir le tutoriel
    window.dispatchEvent(new CustomEvent('show-tutorial'));
  };

  return (
    <Button
      onClick={handleStartTutorial}
      variant={variant}
      size={size}
      className={`flex items-center space-x-2 ${className}`}
      title="Lancer le tutoriel interactif"
    >
      <BookOpen className="h-4 w-4" />
      <span>Tutoriel</span>
    </Button>
  );
};