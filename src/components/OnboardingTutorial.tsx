import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Search, 
  Music, 
  Globe, 
  Maximize2, 
  FolderOpen, 
  Save, 
  Share2,
  Play,
  SkipForward,
  SkipBack
} from 'lucide-react';

interface TutorialStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  highlightSelector?: string;
}

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingTutorial = ({ isOpen, onClose }: OnboardingTutorialProps) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'welcome',
      titleKey: 'app.tutorial.welcome.title',
      descriptionKey: 'app.tutorial.welcome.description',
      icon: <Music className="w-8 h-8 text-primary" />
    },
    {
      id: 'search-input',
      titleKey: 'app.tutorial.searchInput.title',
      descriptionKey: 'app.tutorial.searchInput.description',
      icon: <Search className="w-6 h-6 text-primary" />,
      highlightSelector: '[data-tutorial="search-input"]'
    },
    {
      id: 'search-button',
      titleKey: 'app.tutorial.searchButton.title',
      descriptionKey: 'app.tutorial.searchButton.description',
      icon: <Search className="w-6 h-6 text-primary" />,
      highlightSelector: '[data-tutorial="search-button"]'
    },
    {
      id: 'language',
      titleKey: 'app.tutorial.language.title',
      descriptionKey: 'app.tutorial.language.description',
      icon: <Globe className="w-6 h-6 text-primary" />,
      highlightSelector: '[data-tutorial="language-button"]'
    },
    {
      id: 'queue-basics',
      titleKey: 'app.tutorial.queue.title',
      descriptionKey: 'app.tutorial.queue.description',
      icon: <Music className="w-6 h-6 text-primary" />,
      highlightSelector: '[data-tutorial="queue-section"]'
    },
    {
      id: 'queue-controls',
      titleKey: 'app.tutorial.controls.title',
      descriptionKey: 'app.tutorial.controls.description',
      icon: <Play className="w-6 h-6 text-primary" />,
      highlightSelector: '[data-tutorial="playback-controls"]'
    },
    {
      id: 'queue-management',
      titleKey: 'app.tutorial.management.title',
      descriptionKey: 'app.tutorial.management.description',
      icon: <FolderOpen className="w-6 h-6 text-primary" />,
      highlightSelector: '[data-tutorial="queue-actions"]'
    },
    {
      id: 'maximize',
      titleKey: 'app.tutorial.maximize.title',
      descriptionKey: 'app.tutorial.maximize.description',
      icon: <Maximize2 className="w-6 h-6 text-primary" />,
      highlightSelector: '[data-tutorial="maximize-button"]'
    },
    {
      id: 'complete',
      titleKey: 'app.tutorial.complete.title',
      descriptionKey: 'app.tutorial.complete.description',
      icon: <Music className="w-8 h-8 text-primary" />
    }
  ];

  const currentTutorialStep = tutorialSteps[currentStep];

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('singtube_tutorial_completed', 'true');
    onClose();
  };

  const skipTutorial = () => {
    localStorage.setItem('singtube_tutorial_completed', 'true');
    onClose();
  };

  // Reset to first step when tutorial opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  // Highlight effect for targeted elements
  useEffect(() => {
    if (!isOpen || !currentTutorialStep.highlightSelector) return;

    const element = document.querySelector(currentTutorialStep.highlightSelector);
    if (element) {
      element.classList.add('tutorial-highlight');
    }

    return () => {
      const element = document.querySelector(currentTutorialStep.highlightSelector);
      if (element) {
        element.classList.remove('tutorial-highlight');
      }
    };
  }, [isOpen, currentStep, currentTutorialStep.highlightSelector]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay with highlighting effect */}
      <div className="fixed inset-0 bg-black/50 z-[60] tutorial-overlay" />
      
      {/* Tutorial Dialog */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="z-[70] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {currentTutorialStep.icon}
              {t(currentTutorialStep.titleKey)}
            </DialogTitle>
          </DialogHeader>
          
          <CardContent className="space-y-6 p-0">
            {/* Tutorial Content */}
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                {t(currentTutorialStep.descriptionKey)}
              </p>
              
              {/* Special content for specific steps */}
              {currentStep === 7 && (
                <div className="grid grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center space-y-2">
                    <FolderOpen className="w-6 h-6 mx-auto text-primary" />
                    <p className="text-xs font-medium">{t('app.tutorial.icons.load')}</p>
                  </div>
                  <div className="text-center space-y-2">
                    <Save className="w-6 h-6 mx-auto text-primary" />
                    <p className="text-xs font-medium">{t('app.tutorial.icons.save')}</p>
                  </div>
                  <div className="text-center space-y-2">
                    <Share2 className="w-6 h-6 mx-auto text-primary" />
                    <p className="text-xs font-medium">{t('app.tutorial.icons.share')}</p>
                  </div>
                </div>
              )}
              
              {currentStep === 6 && (
                <div className="grid grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center space-y-2">
                    <SkipBack className="w-6 h-6 mx-auto text-primary" />
                    <p className="text-xs font-medium">{t('app.tutorial.icons.previous')}</p>
                  </div>
                  <div className="text-center space-y-2">
                    <Play className="w-6 h-6 mx-auto text-primary" />
                    <p className="text-xs font-medium">{t('app.tutorial.icons.play')}</p>
                  </div>
                  <div className="text-center space-y-2">
                    <SkipForward className="w-6 h-6 mx-auto text-primary" />
                    <p className="text-xs font-medium">{t('app.tutorial.icons.next')}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Progress Indicator */}
            <div className="flex justify-center space-x-2">
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-primary'
                      : index < currentStep
                      ? 'bg-primary/50'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('app.tutorial.previous')}
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={skipTutorial}
                  className="text-muted-foreground"
                >
                  {t('app.tutorial.skip')}
                </Button>
                
                <Button
                  onClick={nextStep}
                  className="flex items-center gap-2 bg-gradient-primary hover:shadow-neon"
                >
                  {currentStep === tutorialSteps.length - 1 
                    ? t('app.tutorial.finish')
                    : t('app.tutorial.next')
                  }
                  {currentStep !== tutorialSteps.length - 1 && (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </DialogContent>
      </Dialog>
      
      {/* CSS for tutorial highlighting */}
      <style jsx global>{`
        .tutorial-highlight {
          position: relative;
          z-index: 65;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2);
          border-radius: 8px;
          animation: tutorial-pulse 2s infinite;
        }
        
        @keyframes tutorial-pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.7), 0 0 0 12px rgba(59, 130, 246, 0.3);
          }
        }
      `}</style>
    </>
  );
};