import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Song } from "./SongCard";
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";

interface MobilePreviewOverlayProps {
  currentSong: Song | null;
  isVisible: boolean;
  onClose: () => void;
  onPause: () => void;
  shouldAutoplay?: boolean;
  shouldPause?: boolean;
  onAutoplayHandled?: () => void;
  onPauseHandled?: () => void;
  onVideoEnd?: () => void;
  autoAdvance?: boolean;
  onPlaybackStarted?: (title: string) => void;
}

export const MobilePreviewOverlay = ({
  currentSong,
  isVisible,
  onClose,
  onPause,
  shouldAutoplay = false,
  shouldPause = false,
  onAutoplayHandled,
  onPauseHandled,
  onVideoEnd,
  autoAdvance = false,
  onPlaybackStarted
}: MobilePreviewOverlayProps) => {
  const { t } = useTranslation();
  const [iframeKey, setIframeKey] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);

  // Handle close button - pause and close
  const handleClose = () => {
    onPause(); // Pause the video when closing
    onClose(); // Close the overlay
  };

  // Force iframe reload when shouldAutoplay changes to ensure fresh player
  useEffect(() => {
    if (shouldAutoplay && currentSong && isVisible) {
      setIframeKey(prev => prev + 1);
    }
  }, [shouldAutoplay, currentSong, isVisible]);

  // Function to attempt video playback
  const attemptPlayback = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        console.log(`Attempting playback (attempt ${retryCountRef.current + 1})`);
        
        // Enable event listening first
        iframeRef.current.contentWindow.postMessage(
          '{"event":"listening","id":"' + currentSong?.youtubeId + '"}',
          'https://www.youtube.com'
        );
        
        // Then send play command
        iframeRef.current.contentWindow.postMessage(
          '{"event":"command","func":"playVideo","args":""}',
          'https://www.youtube.com'
        );
        
        // Set playing state
        setIsVideoPlaying(true);
        
        // Notify parent that playback started (for success toast)
        if (onPlaybackStarted && currentSong && retryCountRef.current > 0) {
          onPlaybackStarted(currentSong.title);
        }
        
        return true;
      } catch (error) {
        console.log('PostMessage failed, iframe may not be ready yet');
        return false;
      }
    }
    return false;
  };

  // Use postMessage to control YouTube player when autoplay is triggered
  useEffect(() => {
    if (shouldAutoplay && currentSong && isVisible) {
      // Reset retry count
      retryCountRef.current = 0;
      
      // Clear any existing retry interval
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
      
      // Initial attempt after 2 seconds
      const initialTimer = setTimeout(() => {
        const success = attemptPlayback();
        
        if (!success) {
          // Start retry mechanism - try every 1 second for up to 10 seconds
          retryIntervalRef.current = setInterval(() => {
            retryCountRef.current++;
            console.log(`Retrying playback (attempt ${retryCountRef.current + 1}/10)`);
            
            const retrySuccess = attemptPlayback();
            
            if (retrySuccess || retryCountRef.current >= 10) {
              // Stop retrying if successful or max attempts reached
              if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
                retryIntervalRef.current = null;
              }
              
              if (!retrySuccess && retryCountRef.current >= 10) {
                console.log('Max retry attempts reached, giving up on autoplay');
              }
            }
          }, 1000); // Retry every 1 second
        }
        
        if (onAutoplayHandled) {
          onAutoplayHandled();
        }
      }, 2000);
      
      return () => {
        clearTimeout(initialTimer);
        if (retryIntervalRef.current) {
          clearInterval(retryIntervalRef.current);
          retryIntervalRef.current = null;
        }
      };
    }
  }, [iframeKey, shouldAutoplay, currentSong, onAutoplayHandled, isVisible]);

  // Handle pause requests via postMessage
  useEffect(() => {
    if (shouldPause && currentSong && isVisible) {
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
  }, [shouldPause, currentSong, onPauseHandled, isVisible]);

  // Fallback: Monitor for video end using duration estimation
  useEffect(() => {
    if (!isVideoPlaying || !autoAdvance || !onVideoEnd || !currentSong || !isVisible) {
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
  }, [isVideoPlaying, autoAdvance, onVideoEnd, currentSong, isVisible]);

  // Clean up on component unmount or song change
  useEffect(() => {
    setIsVideoPlaying(false);
    retryCountRef.current = 0;
    
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
  }, [currentSong]);

  // Listen for YouTube player events
  useEffect(() => {
    if (!autoAdvance || !onVideoEnd || !isVisible) return;

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
          if (onVideoEnd) {
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
            if (onVideoEnd) {
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
  }, [autoAdvance, onVideoEnd, isVisible]);

  // Don't render if not visible or no song
  if (!isVisible || !currentSong) {
    return null;
  }

  return (
    <div className="xl:hidden fixed inset-x-0 bottom-28 top-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
      <div className="w-full max-w-md mx-auto mb-4 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
        {/* Header with close button */}
        <div className="flex items-center justify-between p-3 bg-gradient-secondary border-b border-border">
          <h3 className="text-sm font-medium text-foreground truncate flex-1">
            {t('app.actions.preview')}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Video Container */}
        <div className="p-3">
          <div className="aspect-video w-full mb-3">
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
          
          {/* Song Info */}
          <div className="text-center">
            <h4 className="font-medium text-card-foreground mb-1 text-sm truncate">
              {currentSong.title}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {currentSong.artist} • {currentSong.duration}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};