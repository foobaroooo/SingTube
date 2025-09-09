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
  shouldPause?: boolean;
  onAutoplayHandled?: () => void;
  onPauseHandled?: () => void;
  onVideoEnd?: () => void;
  autoAdvance?: boolean;
}

export const CurrentSong = ({ currentSong, onNext, onPrevious, canGoNext, canGoPrevious, shouldAutoplay = false, shouldPause = false, onAutoplayHandled, onPauseHandled, onVideoEnd, autoAdvance = false }: PreviewProps) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Force iframe reload when shouldAutoplay changes to ensure fresh player
  useEffect(() => {
    if (shouldAutoplay && currentSong) {
      setIframeKey(prev => prev + 1);
    }
  }, [shouldAutoplay, currentSong]);

  // Use postMessage to control YouTube player when autoplay is triggered
  useEffect(() => {
    if (shouldAutoplay && currentSong) {
      // Wait for iframe to load, then send play command and enable listening
      const timer = setTimeout(() => {
        if (iframeRef.current?.contentWindow) {
          try {
            // Enable event listening first
            iframeRef.current.contentWindow.postMessage(
              '{"event":"listening","id":"' + currentSong.youtubeId + '"}',
              'https://www.youtube.com'
            );
            
            // Then send play command
            iframeRef.current.contentWindow.postMessage(
              '{"event":"command","func":"playVideo","args":""}',
              'https://www.youtube.com'
            );
            
            // Set playing state and start monitoring
            setIsVideoPlaying(true);
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

  // Handle pause requests via postMessage
  useEffect(() => {
    if (shouldPause && currentSong) {
      const timer = setTimeout(() => {
        if (iframeRef.current?.contentWindow) {
          try {
            iframeRef.current.contentWindow.postMessage(
              '{"event":"command","func":"pauseVideo","args":""}',
              'https://www.youtube.com'
            );
            setIsVideoPlaying(false);
          } catch (error) {
            console.log('Pause postMessage failed, iframe may not be ready yet');
          }
        }
        if (onPauseHandled) {
          onPauseHandled();
        }
      }, 100); // Immediate pause, no need to wait for reload
      return () => clearTimeout(timer);
    }
  }, [shouldPause, currentSong, onPauseHandled]);

  // Fallback: Monitor for video end using duration estimation
  useEffect(() => {
    if (!isVideoPlaying || !autoAdvance || !onVideoEnd || !currentSong) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    // Start checking for video end after 10 seconds (most karaoke songs are longer)
    const startCheckingAfter = setTimeout(() => {
      checkIntervalRef.current = setInterval(() => {
        if (iframeRef.current?.contentWindow) {
          try {
            // Request current time and duration from YouTube player
            iframeRef.current.contentWindow.postMessage(
              '{"event":"command","func":"getCurrentTime","args":""}',
              'https://www.youtube.com'
            );
            iframeRef.current.contentWindow.postMessage(
              '{"event":"command","func":"getDuration","args":""}',
              'https://www.youtube.com'
            );
          } catch (error) {
            console.log('Failed to check video progress');
          }
        }
      }, 5000); // Check every 5 seconds
    }, 10000);

    return () => {
      clearTimeout(startCheckingAfter);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [isVideoPlaying, autoAdvance, onVideoEnd, currentSong]);

  // Clean up on component unmount or song change
  useEffect(() => {
    setIsVideoPlaying(false);
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  }, [currentSong]);

  // Listen for YouTube player events
  useEffect(() => {
    if (!autoAdvance || !onVideoEnd) return;

    const handleMessage = (event: MessageEvent) => {
      // Only listen to messages from YouTube
      if (event.origin !== 'https://www.youtube.com') return;
      
      console.log('YouTube message received:', event.data); // Debug log
      
      try {
        // YouTube iframe API sends messages in different formats
        let data;
        if (typeof event.data === 'string') {
          // Handle string format: {"event":"onStateChange","info":0}
          if (event.data.startsWith('{')) {
            data = JSON.parse(event.data);
          } else {
            // Handle other string formats
            return;
          }
        } else {
          data = event.data;
        }
        
        console.log('Parsed YouTube data:', data); // Debug log
        
        // Listen for state changes - state 0 means video ended
        if (data.event === 'onStateChange' && data.info === 0) {
          console.log('Video ended, auto-advancing...'); // Debug log
          setIsVideoPlaying(false);
          // Video ended, auto-advance if possible
          if (canGoNext) {
            onVideoEnd();
          }
        }
        
        // Also listen for getCurrentTime response to check for video end
        if (data.event === 'infoDelivery' && data.info && typeof data.info === 'object') {
          const { currentTime, duration } = data.info;
          if (currentTime && duration && Math.abs(currentTime - duration) < 2) {
            // Video is within 2 seconds of ending
            console.log('Video near end, auto-advancing...'); // Debug log
            setIsVideoPlaying(false);
            if (canGoNext) {
              onVideoEnd();
            }
          }
        }
      } catch (error) {
        console.log('Error parsing YouTube message:', error); // Debug log
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [autoAdvance, onVideoEnd, canGoNext]);
  
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
              src={`https://www.youtube.com/embed/${currentSong.youtubeId}?enablejsapi=1&origin=${window.location.origin}&rel=0&showinfo=0&modestbranding=1&controls=1&fs=1&playsinline=1&widget_referrer=${window.location.origin}`}
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