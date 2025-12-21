import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { useI18n } from '@/contexts/i18n';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useI18n();
  return (
    <Select value={language} onValueChange={(v: 'pt-BR' | 'en-US' | 'es-ES') => setLanguage(v)}>
      <SelectTrigger className="w-32">
        <Globe className="w-4 h-4 mr-2" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pt-BR">Português</SelectItem>
        <SelectItem value="en-US">English</SelectItem>
        <SelectItem value="es-ES">Español</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default LanguageSelector;
