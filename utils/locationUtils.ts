
const MAP_CODES: Record<string, string> = {
  'F': 'Frigo',
  'A': 'Armadio',
  'C': 'Corridoio',
  'L': 'Locale',
  'T': 'Tavolo',
  'U': 'Ufficio'
};

export const humanizeLocation = (code: string): string => {
  if (!code || code.length < 2) return code;
  
  const parts: string[] = [];
  const chars = code.toUpperCase().split('');
  
  // Example: FL013 -> F (Frigo) + L (Locale) + 013
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (MAP_CODES[char]) {
      parts.push(MAP_CODES[char]);
    } else {
      // If it's a number, it's the specific ID
      const remaining = chars.slice(i).join('');
      if (remaining) parts.push(remaining);
      break;
    }
  }
  
  return parts.length > 0 ? parts.join(' ') : code;
};
