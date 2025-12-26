/**
 * Address Autocomplete Component
 * Address input with geocoding suggestions
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { MapPin, Loader2, X } from 'lucide-react';

export interface AddressResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  coordinates?: { lat: number; lng: number };
}

export interface AddressAutocompleteProps {
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (address: AddressResult) => void;
  placeholder?: string;
  country?: string;
  types?: ('address' | 'geocode' | 'establishment' | 'regions' | 'cities')[];
  debounceMs?: number;
  minChars?: number;
  disabled?: boolean;
  className?: string;
}

// Mock suggestions for demo
const mockSuggestions = (query: string): AddressResult[] => {
  if (!query || query.length < 3) return [];
  const base = [
    { placeId: '1', description: 'Av. Paulista, 1000 - São Paulo, SP', mainText: 'Av. Paulista, 1000', secondaryText: 'São Paulo, SP' },
    { placeId: '2', description: 'Rua Oscar Freire, 500 - São Paulo, SP', mainText: 'Rua Oscar Freire, 500', secondaryText: 'São Paulo, SP' },
    { placeId: '3', description: 'Av. Brasil, 2000 - Rio de Janeiro, RJ', mainText: 'Av. Brasil, 2000', secondaryText: 'Rio de Janeiro, RJ' },
    { placeId: '4', description: 'Rua das Flores, 100 - Curitiba, PR', mainText: 'Rua das Flores, 100', secondaryText: 'Curitiba, PR' },
    { placeId: '5', description: 'Av. Beira Mar, 300 - Florianópolis, SC', mainText: 'Av. Beira Mar, 300', secondaryText: 'Florianópolis, SC' },
  ];
  return base.filter(s => s.description.toLowerCase().includes(query.toLowerCase()));
};

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Digite um endereço...',
  country,
  types,
  debounceMs = 300,
  minChars = 3,
  disabled = false,
  className,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < minChars) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // In production, use Google Places API or similar
      await new Promise(resolve => setTimeout(resolve, 200));
      const results = mockSuggestions(query);
      setSuggestions(results);
      setIsOpen(results.length > 0);
    } finally {
      setIsLoading(false);
    }
  }, [minChars]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(newValue), debounceMs);
  };

  const handleSelect = (address: AddressResult) => {
    setInputValue(address.description);
    onChange?.(address.description);
    onSelect?.(address);
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) handleSelect(suggestions[selectedIndex]);
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleClear = () => {
    setInputValue('');
    onChange?.('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={cn('address-autocomplete relative', className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full pl-10 pr-10 py-2 border rounded-lg bg-background',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        ) : inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-accent"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.placeId}
              onClick={() => handleSelect(suggestion)}
              className={cn(
                'px-4 py-3 cursor-pointer transition-colors',
                index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
              )}
            >
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{suggestion.mainText}</p>
                  <p className="text-xs text-muted-foreground">{suggestion.secondaryText}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
