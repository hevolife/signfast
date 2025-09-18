import { useState, useEffect } from 'react';

export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      // Toujours retourner false pour désactiver le mode sombre
      return false;
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Toujours supprimer la classe dark
    root.classList.remove('dark');
    
    // Forcer le mode clair dans le localStorage
    localStorage.setItem('darkMode', JSON.stringify(false));
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    // Désactiver le toggle - toujours rester en mode clair
    setIsDarkMode(false);
  };

  return { isDarkMode, toggleDarkMode };
};