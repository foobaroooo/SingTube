import { Button } from "@/components/ui/button";
import { SkipBack, SkipForward, Play, Pause, ExternalLink } from "lucide-react";
import { Song } from "./SongCard";
import { useTranslation } from "react-i18next";

interface MobilePlaybackControlsProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

export const MobilePlaybackControls = ({
  currentSong,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
}: MobilePlaybackControlsProps) => {
  const { t } = useTranslation();

  const handlePlayYouTube = () => {
    if (currentSong) {
      window.open(`https://www.youtube.com/watch?v=${currentSong.youtubeId}`, '_blank');
    }
  };

  // Don't render if no song is selected
  if (!currentSong) {
    return null;
  }

  return (
    <div className="fixed bottom-14 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-30">
      <div className="container mx-auto px-4 py-3">
        {/* Song Info Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-foreground truncate">
              {currentSong.title}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {currentSong.artist} • {currentSong.duration}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlayYouTube}
            className="h-8 w-8 flex-shrink-0 ml-2"
            title={t('app.actions.openInYoutube')}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="h-10 w-10 border-border hover:bg-secondary"
          >
            <SkipBack className="w-5 h-5" />
          </Button>
          
          <Button 
            onClick={isPlaying ? onPause : onPlay}
            className="h-12 w-12 bg-gradient-primary hover:shadow-neon transition-bounce rounded-full"
            disabled={!currentSong}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6" />
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={onNext}
            disabled={!canGoNext}
            className="h-10 w-10 border-border hover:bg-secondary"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};