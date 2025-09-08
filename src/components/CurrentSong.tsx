import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, SkipBack, SkipForward, Play } from "lucide-react";
import { Song } from "./SongCard";

interface CurrentSongProps {
  currentSong: Song | null;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

export const CurrentSong = ({ currentSong, onNext, onPrevious, canGoNext, canGoPrevious }: CurrentSongProps) => {
  const handlePlayYouTube = () => {
    if (currentSong) {
      window.open(`https://www.youtube.com/watch?v=${currentSong.youtubeId}`, '_blank');
    }
  };

  if (!currentSong) {
    return (
      <Card className="bg-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-center text-muted-foreground">
            No Song Selected
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-16">
          <div className="w-32 h-32 mx-auto bg-muted rounded-lg flex items-center justify-center mb-4">
            <Play className="w-12 h-12 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Add songs to your queue to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-secondary border-border shadow-card">
      <CardHeader>
        <CardTitle className="text-center bg-gradient-primary bg-clip-text text-transparent">
          Now Playing
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <div className="relative mb-6">
          <img 
            src={currentSong.thumbnail} 
            alt={currentSong.title}
            className="w-48 h-48 mx-auto object-cover rounded-lg shadow-lg"
          />
          <div className="absolute inset-0 bg-gradient-accent rounded-lg" />
        </div>
        
        <h2 className="text-xl font-bold mb-2 text-card-foreground">
          {currentSong.title}
        </h2>
        <p className="text-muted-foreground mb-6">
          {currentSong.artist}
        </p>
        
        <div className="flex justify-center gap-4 mb-6">
          <Button 
            variant="outline" 
            size="icon"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="border-border hover:bg-secondary"
          >
            <SkipBack className="w-5 h-5" />
          </Button>
          
          <Button 
            onClick={handlePlayYouTube}
            className="bg-gradient-primary hover:shadow-neon transition-bounce px-8"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            Open in YouTube
          </Button>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={onNext}
            disabled={!canGoNext}
            className="border-border hover:bg-secondary"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Duration: {currentSong.duration}
        </p>
      </CardContent>
    </Card>
  );
};