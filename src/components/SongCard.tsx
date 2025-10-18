import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, PlayCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  youtubeId: string;
  addedBy?: string; // Name of the user who added this song
}

interface SongCardProps {
  song: Song;
  onAddToQueue: (song: Song) => void;
  onAddToFront?: (song: Song) => void;
  showPlayButton?: boolean;
  compact?: boolean;
  onPreview?: (song: Song) => void;
}

export const SongCard = ({ song, onAddToQueue, onAddToFront, showPlayButton, compact = false, onPreview }: SongCardProps) => {
  const { t } = useTranslation();
  
  const handlePlayYouTube = () => {
    window.open(`https://www.youtube.com/watch?v=${song.youtubeId}`, '_blank');
  };

  if (compact) {
    return (
      <Card className={`group hover:shadow-card hover:shadow-primary/20 transition-smooth bg-card border-border ${onPreview ? 'cursor-pointer' : ''}`} onClick={onPreview ? () => onPreview(song) : undefined}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Bigger thumbnail on the left */}
            <div className="relative flex-shrink-0">
              <img 
                src={song.thumbnail} 
                alt={song.title}
                className="w-20 h-16 md:w-32 md:h-24 object-cover rounded-md bg-muted"
              />
              {showPlayButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-smooth bg-black/50 hover:bg-black/70 text-white w-8 h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayYouTube();
                  }}
                >
                  <PlayCircle className="w-5 h-5" />
                </Button>
              )}
            </div>
            
            {/* Song info in the middle */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg md:text-2xl mb-1 md:mb-2 line-clamp-2 md:line-clamp-1 text-card-foreground">
                {song.title}
              </h3>
              <p className="text-muted-foreground text-xs md:text-sm line-clamp-1">
                {song.artist}
              </p>
            </div>
            
            {/* Duration and actions on the right */}
            <div className="flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-3 flex-shrink-0">
              <span className="text-muted-foreground text-xs md:text-sm font-medium">
                {song.duration}
              </span>
              <div className="flex gap-1 md:gap-2">
                <Button 
                  size="sm" 
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    // Immediate action on touch start for better mobile responsiveness
                    onAddToQueue(song);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Fallback for desktop/non-touch devices
                    onAddToQueue(song);
                  }}
                  className="bg-gradient-primary hover:shadow-neon transition-bounce text-primary-foreground text-xs md:text-sm px-2 md:px-3 touch-manipulation"
                >
                  <Plus className="w-3 h-3 md:hidden" />
                  <span className="hidden md:inline">{t('app.queue.addToQueue')}</span>
                </Button>
                {onAddToFront && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      // Immediate action on touch start for better mobile responsiveness
                      onAddToFront(song);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Fallback for desktop/non-touch devices
                      onAddToFront(song);
                    }}
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs md:text-sm px-2 md:px-3 touch-manipulation"
                  >
                    <span className="hidden md:inline">{t('app.queue.priority')}</span>
                    <span className="md:hidden">!</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:shadow-card hover:shadow-primary/20 transition-smooth bg-card border-border">
      <CardContent className="p-4">
        <div className="relative mb-3">
          <img 
            src={song.thumbnail} 
            alt={song.title}
            className="w-full h-32 object-cover rounded-md bg-muted"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-smooth rounded-md" />
          {showPlayButton && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-smooth bg-black/50 hover:bg-black/70 text-white"
              onClick={handlePlayYouTube}
            >
              <PlayCircle className="w-8 h-8" />
            </Button>
          )}
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {song.duration}
          </span>
        </div>
        
        <h3 className="font-semibold text-lg md:text-2xl mb-1 line-clamp-2 text-card-foreground">
          {song.title}
        </h3>
        <p className="text-muted-foreground text-xs mb-2 md:mb-3 line-clamp-1">
          {song.artist}
        </p>
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onTouchStart={(e) => {
              e.stopPropagation();
              // Immediate action on touch start for better mobile responsiveness
              onAddToQueue(song);
            }}
            onClick={(e) => {
              e.stopPropagation();
              // Fallback for desktop/non-touch devices
              onAddToQueue(song);
            }}
            className="flex-1 bg-gradient-primary hover:shadow-neon transition-bounce text-primary-foreground touch-manipulation"
          >
            {t('app.queue.addToQueue')}
          </Button>
          {onAddToFront && (
            <Button 
              size="sm" 
              variant="outline"
              onTouchStart={(e) => {
                e.stopPropagation();
                // Immediate action on touch start for better mobile responsiveness
                onAddToFront(song);
              }}
              onClick={(e) => {
                e.stopPropagation();
                // Fallback for desktop/non-touch devices
                onAddToFront(song);
              }}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground touch-manipulation"
            >
              {t('app.queue.priority')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};