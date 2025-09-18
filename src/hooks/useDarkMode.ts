import { useState, useEffect } from 'react';

export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      // Toujours retourner false pour désactiver le mode sombre
      return false;
    }
    return false;
  });


  const toggleDarkMode = () => {
    // Désactiver le toggle - toujours rester en mode clair
    setIsDarkMode(false);
  };

  return { isDarkMode, toggleDarkMode };
};