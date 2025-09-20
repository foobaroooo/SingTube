import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const getCurrentLanguageLabel = () => {
    return i18n.language === 'en' ? '中文' : 'EN';
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2"
      title={i18n.language === 'en' ? 'Switch to Chinese' : '切換至英文'}
    >
      <Globe className="h-4 w-4" />
      {getCurrentLanguageLabel()}
    </Button>
  );
}