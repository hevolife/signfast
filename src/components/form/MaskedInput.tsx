import React, { useState, useEffect } from 'react';
import { Input } from '../ui/Input';

interface MaskedInputProps {
  mask: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export const MaskedInput: React.FC<MaskedInputProps> = ({
  mask,
  value,
  onChange,
  placeholder,
  label,
  required,
  className,
}) => {
  const [displayValue, setDisplayValue] = useState('');

  // Appliquer le masque à une valeur
  const applyMask = (inputValue: string, maskPattern: string): { masked: string; raw: string } => {
    let masked = '';
    let raw = '';
    let maskIndex = 0;
    let valueIndex = 0;

    // Nettoyer la valeur d'entrée (garder seulement les caractères valides)
    const cleanValue = inputValue.replace(/[^a-zA-Z0-9]/g, '');

    while (maskIndex < maskPattern.length && valueIndex < cleanValue.length) {
      const maskChar = maskPattern[maskIndex];
      const inputChar = cleanValue[valueIndex];

      if (maskChar === '9') {
        // Chiffre requis
        if (/[0-9]/.test(inputChar)) {
          masked += inputChar;
          raw += inputChar;
          valueIndex++;
        } else {
          break; // Caractère invalide
        }
      } else if (maskChar === 'A') {
        // Lettre majuscule requise
        if (/[a-zA-Z]/.test(inputChar)) {
          const upperChar = inputChar.toUpperCase();
          masked += upperChar;
          raw += upperChar;
          valueIndex++;
        } else {
          break; // Caractère invalide
        }
      } else if (maskChar === 'a') {
        // Lettre minuscule requise
        if (/[a-zA-Z]/.test(inputChar)) {
          const lowerChar = inputChar.toLowerCase();
          masked += lowerChar;
          raw += lowerChar;
          valueIndex++;
        } else {
          break; // Caractère invalide
        }
      } else if (maskChar === '*') {
        // Caractère alphanumérique
        if (/[a-zA-Z0-9]/.test(inputChar)) {
          masked += inputChar;
          raw += inputChar;
          valueIndex++;
        } else {
          break; // Caractère invalide
        }
      } else {
        // Caractère littéral du masque
        masked += maskChar;
        // Ne pas inclure les caractères littéraux dans la valeur brute
      }

      maskIndex++;
    }

    return { masked, raw };
  };

  // Mettre à jour l'affichage quand la valeur change
  useEffect(() => {
    if (mask && value !== undefined) {
      const { masked } = applyMask(value, mask);
      setDisplayValue(masked);
    } else {
      setDisplayValue(value || '');
    }
  }, [value, mask]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    if (!mask) {
      // Pas de masque, comportement normal
      onChange(inputValue);
      return;
    }

    // Appliquer le masque
    const { masked, raw } = applyMask(inputValue, mask);
    
    setDisplayValue(masked);
    onChange(masked); // Envoyer la valeur masquée (formatée)
    
    // Ajuster la position du curseur
    setTimeout(() => {
      const input = e.target;
      if (input && masked.length >= cursorPos) {
        input.setSelectionRange(masked.length, masked.length);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permettre les touches de navigation et suppression
    const allowedKeys = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 
      'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab'
    ];

    if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
      return;
    }

    // Si on a un masque, vérifier que le caractère est valide
    if (mask) {
      const input = e.target as HTMLInputElement;
      const cursorPos = input.selectionStart || 0;
      const currentMaskChar = mask[displayValue.length];

      if (currentMaskChar === '9' && !/[0-9]/.test(e.key)) {
        e.preventDefault();
      } else if (currentMaskChar === 'A' && !/[a-zA-Z]/.test(e.key)) {
        e.preventDefault();
      } else if (currentMaskChar === 'a' && !/[a-zA-Z]/.test(e.key)) {
        e.preventDefault();
      } else if (currentMaskChar === '*' && !/[a-zA-Z0-9]/.test(e.key)) {
        e.preventDefault();
      }
    }
  };

  // Générer un placeholder basé sur le masque
  const getMaskPlaceholder = (maskPattern: string): string => {
    return maskPattern
      .replace(/9/g, '_')
      .replace(/A/g, 'A')
      .replace(/a/g, 'a')
      .replace(/\*/g, '_');
  };

  const effectivePlaceholder = mask ? getMaskPlaceholder(mask) : placeholder;

  return (
    <Input
      label={label}
      value={displayValue}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      placeholder={effectivePlaceholder}
      required={required}
      className={className}
    />
  );
};