/**
 * Phone Input Component
 * International phone number input with country codes
 */

import React, { useState, useCallback, useMemo, forwardRef } from 'react';
import { cn } from '@/utils/cn';
import { ChevronDown, Phone } from 'lucide-react';

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  format?: string;
}

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string, country: Country, formatted: string) => void;
  defaultCountry?: string;
  countries?: Country[];
  onlyCountries?: string[];
  preferredCountries?: string[];
  disabled?: boolean;
  showFlags?: boolean;
}

const DEFAULT_COUNTRIES: Country[] = [
  { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷', format: '(##) #####-####' },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸', format: '(###) ###-####' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹', format: '### ### ###' },
  { code: 'ES', name: 'Espanha', dialCode: '+34', flag: '🇪🇸', format: '### ## ## ##' },
  { code: 'FR', name: 'França', dialCode: '+33', flag: '🇫🇷', format: '# ## ## ## ##' },
  { code: 'DE', name: 'Alemanha', dialCode: '+49', flag: '🇩🇪', format: '#### #######' },
  { code: 'IT', name: 'Itália', dialCode: '+39', flag: '🇮🇹', format: '### ### ####' },
  { code: 'GB', name: 'Reino Unido', dialCode: '+44', flag: '🇬🇧', format: '#### ######' },
  { code: 'JP', name: 'Japão', dialCode: '+81', flag: '🇯🇵', format: '##-####-####' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', format: '### #### ####' },
  { code: 'IN', name: 'Índia', dialCode: '+91', flag: '🇮🇳', format: '##### #####' },
  { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽', format: '## #### ####' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷', format: '## ####-####' },
  { code: 'CO', name: 'Colômbia', dialCode: '+57', flag: '🇨🇴', format: '### ### ####' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱', format: '# #### ####' },
];

const formatPhone = (value: string, format?: string): string => {
  if (!format) return value;
  
  const digits = value.replace(/\D/g, '');
  let formatted = '';
  let digitIndex = 0;

  for (let i = 0; i < format.length && digitIndex < digits.length; i++) {
    if (format[i] === '#') {
      formatted += digits[digitIndex];
      digitIndex++;
    } else {
      formatted += format[i];
    }
  }

  return formatted;
};

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(({
  value = '',
  onChange,
  defaultCountry = 'BR',
  countries = DEFAULT_COUNTRIES,
  onlyCountries,
  preferredCountries = ['BR', 'US', 'PT'],
  disabled = false,
  showFlags = true,
  className,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const availableCountries = useMemo(() => {
    let list = countries;
    if (onlyCountries) {
      list = countries.filter(c => onlyCountries.includes(c.code));
    }
    return list;
  }, [countries, onlyCountries]);

  const [selectedCountry, setSelectedCountry] = useState<Country>(
    () => availableCountries.find(c => c.code === defaultCountry) || availableCountries[0]
  );

  const [phoneNumber, setPhoneNumber] = useState(() => {
    if (value.startsWith('+')) {
      const country = availableCountries.find(c => value.startsWith(c.dialCode));
      if (country) {
        return value.slice(country.dialCode.length);
      }
    }
    return value;
  });

  const filteredCountries = useMemo(() => {
    const searchLower = search.toLowerCase();
    let filtered = availableCountries.filter(
      c => c.name.toLowerCase().includes(searchLower) || 
           c.dialCode.includes(searchLower) ||
           c.code.toLowerCase().includes(searchLower)
    );

    // Sort: preferred first, then alphabetically
    filtered.sort((a, b) => {
      const aPreferred = preferredCountries.includes(a.code);
      const bPreferred = preferredCountries.includes(b.code);
      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [availableCountries, search, preferredCountries]);

  const formattedNumber = useMemo(() => {
    return formatPhone(phoneNumber, selectedCountry.format);
  }, [phoneNumber, selectedCountry]);

  const fullNumber = useMemo(() => {
    const digits = phoneNumber.replace(/\D/g, '');
    return digits ? `${selectedCountry.dialCode}${digits}` : '';
  }, [phoneNumber, selectedCountry]);

  const handleCountrySelect = useCallback((country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearch('');
    onChange?.(fullNumber, country, formattedNumber);
  }, [fullNumber, formattedNumber, onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/[^\d\s\-()]/g, '');
    setPhoneNumber(newValue);
    
    const digits = newValue.replace(/\D/g, '');
    const full = digits ? `${selectedCountry.dialCode}${digits}` : '';
    const formatted = formatPhone(digits, selectedCountry.format);
    
    onChange?.(full, selectedCountry, formatted);
  }, [selectedCountry, onChange]);

  return (
    <div className={cn('phone-input relative', className)}>
      <div className={cn(
        'flex items-center border rounded-md bg-background',
        'focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent',
        disabled && 'opacity-50 cursor-not-allowed'
      )}>
        {/* Country selector */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="flex items-center gap-1 px-3 py-2 border-r hover:bg-accent transition-colors"
        >
          {showFlags && <span className="text-lg">{selectedCountry.flag}</span>}
          <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Phone input */}
        <div className="flex items-center flex-1 px-3">
          <Phone className="h-4 w-4 text-muted-foreground mr-2" />
          <input
            ref={ref}
            type="tel"
            value={formattedNumber}
            onChange={handleInputChange}
            disabled={disabled}
            placeholder={selectedCountry.format?.replace(/#/g, '0')}
            className="flex-1 py-2 bg-transparent outline-none text-sm"
            {...props}
          />
        </div>
      </div>

      {/* Country dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-64 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar país..."
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
              autoFocus
            />
          </div>

          {/* Countries list */}
          <div className="max-h-48 overflow-auto">
            {filteredCountries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCountrySelect(country)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 hover:bg-accent transition-colors text-left',
                  selectedCountry.code === country.code && 'bg-accent'
                )}
              >
                {showFlags && <span className="text-lg">{country.flag}</span>}
                <span className="flex-1 text-sm">{country.name}</span>
                <span className="text-sm text-muted-foreground">{country.dialCode}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;
