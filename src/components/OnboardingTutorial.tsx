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

    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const element = document.querySelector(currentTutorialStep.highlightSelector);
      console.log('Tutorial step:', currentStep, 'Looking for:', currentTutorialStep.highlightSelector, 'Found:', element);
      
      if (element) {
        // Remove any existing highlights first
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
          el.classList.remove('tutorial-highlight');
        });
        
        element.classList.add('tutorial-highlight');
        console.log('Added highlight to:', element);
      } else {
        console.warn('Element not found for selector:', currentTutorialStep.highlightSelector);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
    };
  }, [isOpen, currentStep, currentTutorialStep.highlightSelector]);

  if (!isOpen) return null;

  return (
    <>
      
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
      <style>{`
        .tutorial-highlight {
          position: relative !important;
          z-index: 55 !important;
          outline: 4px solid #3b82f6 !important;
          outline-offset: 3px !important;
          border-radius: 8px !important;
          animation: tutorial-pulse 2s infinite !important;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.6) !important;
        }
        
        @keyframes tutorial-pulse {
          0%, 100% {
            outline-color: #3b82f6 !important;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.6) !important;
          }
          50% {
            outline-color: #60a5fa !important;
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.8) !important;
          }
        }
      `}</style>
    </>
  );
};