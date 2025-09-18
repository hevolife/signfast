/**
 * Utilitaire pour formater les dates au format français DD/MM/YYYY
 */

export const formatDateFR = (value: string | Date | null | undefined): string => {
  if (!value) return '';
  
  try {
    let date: Date;
    
    // Si c'est déjà une Date
    if (value instanceof Date) {
      date = value;
    } 
    // Si c'est une string au format ISO (YYYY-MM-DD)
    else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = value.split('-');
      return `${day}/${month}/${year}`;
    }
    // Sinon, essayer de parser
    else {
      date = new Date(value);
    }
    
    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      return typeof value === 'string' ? value : '';
    }
    
    // Format français DD/MM/YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch {
    return typeof value === 'string' ? value : '';
  }
};

export const formatDateTimeFR = (value: string | Date | null | undefined): string => {
  if (!value) return '';
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return typeof value === 'string' ? value : '';
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} à ${hours}:${minutes}`;
  } catch {
    return typeof value === 'string' ? value : '';
  }
};