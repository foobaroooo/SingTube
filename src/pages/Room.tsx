import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUser } from "@/contexts/UserContext";
import { SearchSection } from "@/components/SearchSection";
import { SongCard, Song } from "@/components/SongCard";
import { ShareQRDialog } from "@/components/ShareQRDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageToggle } from "@/components/LanguageToggle";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { MobilePreviewOverlay } from "@/components/MobilePreviewOverlay";
import { useToast } from "@/hooks/use-toast";
import {
  getSharedQueue,
  saveQueue,
  trackSongPlay,
  trackSearch,
  saveCurrentQueue,
  loadCurrentQueue,
  type SavedQueue
} from "@/services/apiService";
import { searchYouTubeVideos } from "@/services/apiService";
import { socketService } from "@/services/socketService";

const Room = () => {
  const { guid } = useParams<{ guid: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { userName, setUserName, setIsHost } = useUser();
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [currentQueueName, setCurrentQueueName] = useState("");
  const [currentQueueId, setCurrentQueueId] = useState<number | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshHistory, setRefreshHistory] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDialogData, setShareDialogData] = useState<{ url: string; name: string }>({ url: "", name: "" });
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load shared queue and check user authentication
  useEffect(() => {
    const loadRoom = async () => {
      if (!guid) {
        navigate("/", { replace: true });
        return;
      }

      // Check if user has entered their name
      const storedUserName = localStorage.getItem('singtube_user_name');
      
      if (!storedUserName || storedUserName.trim().length < 2) {
        // Redirect back to join page if no name
        navigate(`/join/${guid}`, { replace: true });
        return;
      }

      // Set user name in context
      setUserName(storedUserName);

      try {
        // Load the shared queue
        const sharedQueue = await getSharedQueue(guid);
        if (sharedQueue) {
          setQueue(sharedQueue.songs);
          setCurrentIndex(0);
          setCurrentQueueName(sharedQueue.name);
          setCurrentQueueId(sharedQueue.id);

          toast({
            title: "Welcome to the Room!",
            description: `You can search and add songs to "${sharedQueue.name}"`,
          });
        } else {
          toast({
            title: "Room Not Found",
            description: "The karaoke room could not be found or may have been deleted",
            variant: "destructive"
          });
          navigate("/", { replace: true });
          return;
        }
      } catch (error) {
        console.error('Failed to load room:', error);
        toast({
          title: "Failed to Load Room",
          description: "There was an error loading the karaoke room",
          variant: "destructive"
        });
        navigate("/", { replace: true });
        return;
      } finally {
        setIsRoomLoading(false);
      }
    };

    loadRoom();
  }, [guid, navigate, setUserName, toast]);

  // WebSocket Connection and Real-time Sync
  useEffect(() => {
    if (!guid || !userName || isRoomLoading) {
      return;
    }

    console.log('🔌 Connecting to WebSocket for room:', guid);

    // Connect to WebSocket
    socketService.connect();

    // Join room as guest (isHost = false)
    socketService.joinRoom(guid, userName, false);

    // Listen for initial queue state
    socketService.onQueueState((state) => {
      console.log('📊 Received queue state:', state);
      setQueue(state.songs);
      setCurrentQueueName(state.name);
      setCurrentQueueId(state.id);
    });

    // Listen for queue updates from host/other guests
    socketService.onQueueUpdated((payload) => {
      console.log('🔄 Queue updated:', payload);
      setQueue(payload.songs);

      // Show toast notification when others add songs
      if (payload.updatedBy !== userName) {
        if (payload.action === 'add' && payload.song) {
          toast({
            title: "New Song Added!",
            description: `"${payload.song.title}" added by ${payload.updatedBy}`,
          });
        } else if (payload.action === 'add-to-front' && payload.song) {
          toast({
            title: "Song Added to Front!",
            description: `"${payload.song.title}" added by ${payload.updatedBy}`,
          });
        } else if (payload.action === 'remove') {
          toast({
            title: "Song Removed",
            description: `Host removed a song from queue`,
          });
        }
      }
    });

    // Listen for user join/leave events
    socketService.onUserJoined((payload) => {
      console.log('👤 User joined:', payload);
      if (payload.userName !== userName) {
        toast({
          title: "User Joined",
          description: `${payload.userName} joined the room`,
        });
      }
    });

    socketService.onUserLeft((payload) => {
      console.log('👋 User left:', payload);
      toast({
        title: "User Left",
        description: `${payload.userName} left the room`,
      });
    });

    // Cleanup on unmount
    return () => {
      console.log('🔌 Disconnecting from WebSocket');
      socketService.leaveRoom();
      socketService.removeAllListeners();
    };
  }, [guid, userName, isRoomLoading, toast]);

  // Auto-save queue changes
  useEffect(() => {
    if (queue.length > 0 && currentQueueId && currentQueueName) {
      saveCurrentQueue(queue, currentIndex, currentQueueName);
    }
  }, [queue, currentIndex, currentQueueName, currentQueueId]);

  const handleSearch = async (query: string, gender: string = 'all') => {
    if (!query.trim()) return;

    setIsSearchLoading(true);
    setNextPageToken(undefined);
    
    try {
      const result = await searchYouTubeVideos(query, gender, 25);
      setSearchResults(result.songs);
      setNextPageToken(result.nextPageToken);

      // Track search
      await trackSearch(query, gender);
      setRefreshHistory(prev => !prev);
      
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "An error occurred while searching",
        variant: "destructive"
      });
    } finally {
      setIsSearchLoading(false);
    }
  };

  const addToQueue = async (song: Song) => {
    if (!guid) {
      toast({
        title: "Error",
        description: "Not connected to a room",
        variant: "destructive"
      });
      return;
    }

    const songWithUser = { ...song, addedBy: userName || "Unknown" };

    // Send via WebSocket for real-time sync
    socketService.addSong(guid, songWithUser);

    toast({
      title: "Adding Song",
      description: `Adding "${song.title}" to queue...`
    });

    await trackSongPlay(song);
  };

  const addToFront = async (song: Song) => {
    if (!guid) {
      toast({
        title: "Error",
        description: "Not connected to a room",
        variant: "destructive"
      });
      return;
    }

    const songWithUser = { ...song, addedBy: userName || "Unknown" };

    // Send via WebSocket for real-time sync
    socketService.addToFront(guid, songWithUser);

    toast({
      title: "Adding to Front",
      description: `Adding "${song.title}" to front of queue...`
    });

    await trackSongPlay(song);
  };

  // Guests cannot remove or reorder songs - only hosts can do that

  const selectSong = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(false);
  };

  const nextSong = () => {
    if (Array.isArray(queue) && currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsPlaying(false);
      setShowMobilePreview(false);
    }
  };

  const previousSong = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsPlaying(false);
      setShowMobilePreview(false);
    }
  };

  const handleDoubleClickPlay = async (index: number) => {
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
    setIsPlaying(true);

    if (queue[index]) {
      await trackSongPlay(queue[index]);
    }
  };

  const loadMoreResults = async () => {
    if (!nextPageToken || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const lastQuery = localStorage.getItem('last_search_query') || '';
      const lastGender = localStorage.getItem('last_search_gender') || 'all';
      
      const result = await searchYouTubeVideos(lastQuery, lastGender, 25, nextPageToken);
      setSearchResults(prev => [...prev, ...result.songs]);
      setNextPageToken(result.nextPageToken);
    } catch (error) {
      console.error('Load more failed:', error);
      toast({
        title: "Failed to Load More",
        description: "Could not load more search results",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (isRoomLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
            <p className="text-center mt-4 text-muted-foreground">Loading room...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSong = Array.isArray(queue) && currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-4xl font-bold text-foreground">
            {currentQueueName || t('app.queue.title')}
          </h1>
          <div className="flex items-center gap-2">
            <LanguageToggle />
          </div>
        </div>

        {/* Single Column - Guests can only search and add songs */}
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Search Section */}
          <SearchSection
            onSearch={handleSearch}
            isLoading={isSearchLoading}
            refreshHistory={refreshHistory}
          />

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">{t('app.search.resultsTitle')}</h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto" ref={scrollContainerRef}>
                {searchResults.map((song, index) => (
                  <SongCard
                    key={`${song.id}-${index}`}
                    song={song}
                    onAddToQueue={addToQueue}
                    onAddToFront={addToFront}
                    showPlayButton
                    compact
                  />
                ))}
                {isLoadingMore && (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                )}
                {nextPageToken && !isLoadingMore && (
                  <Button
                    variant="outline"
                    onClick={loadMoreResults}
                    className="w-full"
                  >
                    Load More Results
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Welcome message when no search results */}
          {searchResults.length === 0 && !isSearchLoading && (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                {t('app.searchResults.searchPrompt')}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Search and add songs to the karaoke queue
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs and Overlays */}
      <ShareQRDialog
        isOpen={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        shareUrl={shareDialogData.url}
        queueName={shareDialogData.name}
      />

      <OnboardingTutorial
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      <MobilePreviewOverlay
        isOpen={showMobilePreview}
        onClose={() => setShowMobilePreview(false)}
        song={currentSong}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onNext={nextSong}
        onPrevious={previousSong}
        canGoNext={Array.isArray(queue) && currentIndex < queue.length - 1}
        canGoPrevious={currentIndex > 0}
      />
    </div>
  );
};

export default Room;