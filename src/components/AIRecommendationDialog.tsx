import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Music, AlertCircle } from 'lucide-react';
import { getAIRecommendations, type SongRecommendation } from '@/services/aiService';
import { useTranslation } from 'react-i18next';

interface AIRecommendationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  searchHistory: string[];
  onAddToQueue?: (title: string, artist: string) => void;
}

export const AIRecommendationDialog = ({
  isOpen,
  onClose,
  searchHistory,
  onAddToQueue,
}: AIRecommendationDialogProps) => {
  const { t } = useTranslation();
  const [recommendations, setRecommendations] = useState<SongRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleGetRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const results = await getAIRecommendations(searchHistory, 5);
      setRecommendations(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setRecommendations([]);
    setError(null);
    setHasSearched(false);
    onClose();
  };

  const handleAddSong = (song: SongRecommendation) => {
    if (onAddToQueue) {
      onAddToQueue(song.title, song.artist);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[600px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-2xl">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            AI Song Recommendations
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Search History Display */}
          <div className="bg-secondary/30 p-3 sm:p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">Based on your recent searches:</p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {searchHistory.slice(0, 5).map((song, index) => (
                <div
                  key={index}
                  className="bg-primary/10 text-primary px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm"
                >
                  {song}
                </div>
              ))}
            </div>
          </div>

          {/* Initial State - Show Get Recommendations Button */}
          {!hasSearched && (
            <div className="text-center py-4 sm:py-6">
              <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4 px-2">
                Get personalized karaoke song recommendations powered by AI
              </p>
              <Button
                onClick={handleGetRecommendations}
                disabled={isLoading}
                className="bg-gradient-primary hover:shadow-neon transition-bounce w-full sm:w-auto"
                size="default"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                    <span className="text-sm sm:text-base">Getting Recommendations...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    <span className="text-sm sm:text-base">Get AI Recommendations</span>
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && hasSearched && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">AI is thinking...</p>
            </div>
          )}

          {/* Error State */}
          {error && hasSearched && !isLoading && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-destructive font-medium mb-2">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGetRecommendations}
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations List */}
          {recommendations.length > 0 && !isLoading && (
            <div className="space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm font-medium">Here are some songs you might enjoy:</p>
              {recommendations.map((song, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Music className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base truncate">{song.title}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{song.artist}</p>
                  </div>
                  {onAddToQueue && (
                    <Button
                      size="sm"
                      onClick={() => handleAddSong(song)}
                      className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3"
                    >
                      <span className="hidden sm:inline">Add to Queue</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 sm:pt-4 border-t">
            <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              Close
            </Button>
            {recommendations.length > 0 && (
              <Button onClick={handleGetRecommendations} variant="ghost" className="w-full sm:w-auto">
                <Sparkles className="w-4 h-4 mr-2" />
                Get More
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
