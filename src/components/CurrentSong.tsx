import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, SkipBack, SkipForward, Play } from "lucide-react";
import { Song } from "./SongCard";
import { useEffect, useState, useRef } from "react";

interface PreviewProps {
  currentSong: Song | null;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  shouldAutoplay?: boolean;
  onAutoplayHandled?: () => void;
}

export const CurrentSong = ({ currentSong, onNext, onPrevious, canGoNext, canGoPrevious, shouldAutoplay = false, onAutoplayHandled }: PreviewProps) => {
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Force iframe reload when shouldAutoplay changes to ensure fresh player
  useEffect(() => {
    if (shouldAutoplay && currentSong) {
      setIframeKey(prev => prev + 1);
    }
  }, [shouldAutoplay, currentSong]);

  // Use postMessage to control YouTube player when autoplay is triggered
  useEffect(() => {
    if (shouldAutoplay && currentSong) {
      // Wait for iframe to load, then send play command
      const timer = setTimeout(() => {
        if (iframeRef.current?.contentWindow) {
          try {
            iframeRef.current.contentWindow.postMessage(
              '{"event":"command","func":"playVideo","args":""}',
              'https://www.youtube.com'
            );
          } catch (error) {
            console.log('PostMessage failed, iframe may not be ready yet');
          }
        }
        if (onAutoplayHandled) {
          onAutoplayHandled();
        }
      }, 2000); // Wait longer for iframe to fully load
      return () => clearTimeout(timer);
    }
  }, [iframeKey, shouldAutoplay, currentSong, onAutoplayHandled]);
  
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
          <p className="text-muted-foreground">Select a song from your queue to preview!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-secondary border-border shadow-card">
      <CardHeader>
        <CardTitle className="text-center bg-gradient-primary bg-clip-text text-transparent">
          Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="aspect-video w-full">
            <iframe
              ref={iframeRef}
              key={iframeKey}
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${currentSong.youtubeId}?enablejsapi=1&origin=${window.location.origin}`}
              title={currentSong.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-lg"
            />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-card-foreground mb-1">
              {currentSong.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {currentSong.artist} • {currentSong.duration}
            </p>
          </div>
        </div>
        
        <div className="flex justify-center gap-3 mt-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="border-border hover:bg-secondary"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          
          <Button 
            onClick={handlePlayYouTube}
            className="bg-gradient-primary hover:shadow-neon transition-bounce px-6"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in YouTube
          </Button>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={onNext}
            disabled={!canGoNext}
            className="border-border hover:bg-secondary"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};