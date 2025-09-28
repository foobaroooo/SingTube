import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useEffect, useState } from 'react';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState<string>('en');

  // Track the current language and ensure component re-renders when it changes
  useEffect(() => {
    const updateLanguage = () => {
      // Get the current language, fallback to saved language or 'en'
      const detectedLang = i18n.language || localStorage.getItem('language') || 'en';
      // Normalize to 'en' or 'zh'
      const normalizedLang = detectedLang.startsWith('zh') ? 'zh' : 'en';
      setCurrentLang(normalizedLang);
    };

    // Update immediately
    updateLanguage();
    
    // Listen for language changes
    i18n.on('languageChanged', updateLanguage);
    
    return () => {
      i18n.off('languageChanged', updateLanguage);
    };
  }, [i18n]);

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
    setCurrentLang(newLang);
  };

  return (
    <Button
      variant="outline"
      size="default"
      onClick={toggleLanguage}
      className="flex items-center gap-2 hover:bg-transparent hover:text-current h-10 px-3"
      title={currentLang === 'en' ? 'Switch to Chinese' : '切換至英文'}
    >
      <Globe className="h-4 w-4" />
      <span className="flex items-center gap-1">
        <span className={currentLang === 'en' ? 'text-primary font-semibold' : 'text-muted-foreground'}>
          EN
        </span>
        <span className="text-muted-foreground">/</span>
        <span className={currentLang === 'zh' ? 'text-primary font-semibold' : 'text-muted-foreground'}>
          中文
        </span>
      </span>
    </Button>
  );
}