import { useState, useEffect, useRef } from "react";
import { SearchSection } from "@/components/SearchSection";
import { SongCard, Song } from "@/components/SongCard";
import { CurrentSong } from "@/components/CurrentSong";
import { QueueSection } from "@/components/QueueSection";
import { searchYouTubeVideos, saveSearchHistory, saveCurrentQueue, loadCurrentQueue, updateQueue } from "@/services/apiService";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Mic2, X, EyeOff, Search, Expand, Shrink } from "lucide-react";
import heroImage from "@/assets/karaoke-hero.jpg";

const Index = () => {
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [refreshHistory, setRefreshHistory] = useState(false);
  const [isQueueMaximized, setIsQueueMaximized] = useState(false);
  const [currentQueueName, setCurrentQueueName] = useState<string>("");
  const [currentQueueId, setCurrentQueueId] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  const [shouldPause, setShouldPause] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true); // Enable auto-advance by default
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load saved queue on component mount
  useEffect(() => {
    const savedData = loadCurrentQueue();
    if (Array.isArray(savedData.songs) && savedData.songs.length > 0) {
      setQueue(savedData.songs);
      setCurrentIndex(savedData.currentIndex);
      setCurrentQueueName(savedData.queueName);
    }
  }, []);

  // Auto-save queue whenever it changes
  useEffect(() => {
    if ((Array.isArray(queue) && queue.length > 0) || currentIndex >= 0) {
      saveCurrentQueue(queue, currentIndex, currentQueueName);
    }
  }, [queue, currentIndex, currentQueueName]);

  const handleSearch = async (query: string, gender: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      toast({
        title: "Empty Search",
        description: "Please enter a search term",
        variant: "destructive"
      });
      return;
    }

    setIsSearchLoading(true);
    setHasSearched(true);
    setCurrentSearchQuery(query);
    
    try {
      const result = await searchYouTubeVideos(query, gender, 20);
      setSearchResults(result.songs);
      setNextPageToken(result.nextPageToken);
      
      // Save search to history
      await saveSearchHistory(query, gender);
      
      // Trigger history refresh
      setRefreshHistory(prev => !prev);
      
      toast({
        title: "Search Complete",
        description: `Found ${Array.isArray(result.songs) ? result.songs.length : 0} karaoke songs from YouTube`,
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: "Unable to search YouTube. Please check your API key configuration.",
        variant: "destructive"
      });
      setSearchResults([]);
      setNextPageToken(undefined);
    } finally {
      setIsSearchLoading(false);
    }
  };

  const addToQueue = async (song: Song) => {
    const newQueue = [...queue, song];
    setQueue(newQueue);
    
    // Auto-update saved queue if this is a saved queue
    if (currentQueueId && currentQueueName) {
      try {
        await updateQueue(currentQueueId, currentQueueName, newQueue);
      } catch (error) {
        console.error('Failed to update saved queue:', error);
      }
    }
    
    toast({
      title: "Song Added",
      description: `${song.title} added to queue`,
    });
  };

  const addToFront = async (song: Song) => {
    const newQueue = [song, ...queue];
    setQueue(newQueue);
    if (currentIndex >= 0) {
      setCurrentIndex(prev => prev + 1);
    }
    
    // Auto-update saved queue if this is a saved queue
    if (currentQueueId && currentQueueName) {
      try {
        await updateQueue(currentQueueId, currentQueueName, newQueue);
      } catch (error) {
        console.error('Failed to update saved queue:', error);
      }
    }
    
    toast({
      title: "Priority Added",
      description: `${song.title} added to front of queue`,
    });
  };

  const removeFromQueue = async (index: number) => {
    const newQueue = Array.isArray(queue) ? queue.filter((_, i) => i !== index) : [];
    setQueue(newQueue);
    
    if (index === currentIndex) {
      setCurrentIndex(-1);
    } else if (index < currentIndex) {
      setCurrentIndex(prev => prev - 1);
    }
    
    // Auto-update saved queue if this is a saved queue
    if (currentQueueId && currentQueueName && newQueue.length > 0) {
      try {
        await updateQueue(currentQueueId, currentQueueName, newQueue);
      } catch (error) {
        console.error('Failed to update saved queue after removal:', error);
      }
    }
  };

  const reorderQueue = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || !Array.isArray(queue)) return;
    
    const newQueue = [...queue];
    const [removed] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, removed);
    
    // Update current index if needed
    let newCurrentIndex = currentIndex;
    if (currentIndex === fromIndex) {
      newCurrentIndex = toIndex;
    } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
      newCurrentIndex = currentIndex - 1;
    } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
      newCurrentIndex = currentIndex + 1;
    }
    
    setQueue(newQueue);
    setCurrentIndex(newCurrentIndex);
    
    // Auto-update saved queue if this is a saved queue
    if (currentQueueId && currentQueueName) {
      try {
        await updateQueue(currentQueueId, currentQueueName, newQueue);
      } catch (error) {
        console.error('Failed to update saved queue after reorder:', error);
      }
    }
  };

  const selectSong = (index: number) => {
    setCurrentIndex(index);
    // Reset playing state when selecting a different song
    setIsPlaying(false);
  };

  const nextSong = () => {
    if (Array.isArray(queue) && currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      // Reset playing state when changing songs
      setIsPlaying(false);
    }
  };

  const previousSong = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      // Reset playing state when changing songs  
      setIsPlaying(false);
    }
  };

  const loadQueue = (songs: Song[], queueName: string = "", queueId: number | null = null) => {
    const safeSongs = Array.isArray(songs) ? songs : [];
    setQueue(safeSongs);
    setCurrentIndex(safeSongs.length > 0 ? 0 : -1);
    setCurrentQueueName(queueName);
    setCurrentQueueId(queueId);
  };

  const toggleQueueMaximize = () => {
    setIsQueueMaximized(prev => !prev);
  };

  const handleQueueSaved = (queueName: string, queueId: number | null = null) => {
    setCurrentQueueName(queueName);
    setCurrentQueueId(queueId);
  };

  const handlePlayCurrentSong = () => {
    if (currentIndex >= 0 && Array.isArray(queue) && queue[currentIndex]) {
      const song = queue[currentIndex];
      // Trigger autoplay by forcing a re-render with autoplay enabled
      setShouldAutoplay(true);
      setIsPlaying(true);
      
      toast({
        title: "Playing Song",
        description: `Playing: ${song.title}`,
      });
    }
  };

  const handlePauseCurrentSong = () => {
    setShouldPause(true);
    setIsPlaying(false);
    
    toast({
      title: "Paused",
      description: "Playback paused",
    });
  };

  const handleAutoplayComplete = () => {
    setShouldAutoplay(false);
  };

  const handlePauseComplete = () => {
    setShouldPause(false);
  };

  const handlePlaybackStarted = (title: string) => {
    toast({
      title: "Playback Started",
      description: `Now playing: ${title}`,
    });
  };

  const handleDoubleClickPlay = (index: number) => {
    // First, select the song if it's not already selected
    if (currentIndex !== index) {
      setCurrentIndex(index);
    }
    
    // Then trigger play
    if (index >= 0 && Array.isArray(queue) && queue[index]) {
      const song = queue[index];
      setShouldAutoplay(true);
      setIsPlaying(true);
      
      toast({
        title: "Double-click Play",
        description: `Playing: ${song.title}`,
      });
    }
  };

  const handleVideoEnd = () => {
    if (autoAdvance && Array.isArray(queue) && currentIndex < queue.length - 1) {
      // Auto-advance to next song and start playing it
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      
      // Show loading toast for auto-advance
      toast({
        title: "Auto-advancing",
        description: `Loading next song: ${queue[nextIndex]?.title || 'Unknown'}`,
      });
      
      // Trigger autoplay for the next song
      setTimeout(() => {
        setShouldAutoplay(true);
        setIsPlaying(true);
      }, 500); // Small delay to allow iframe to update
    } else {
      // End of queue or auto-advance disabled
      setIsPlaying(false);
      if (autoAdvance) {
        toast({
          title: "Queue Complete",
          description: "Reached end of queue",
        });
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
        toast({
          title: "Fullscreen Mode",
          description: "Press ESC to exit fullscreen",
        });
      }).catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
        toast({
          title: "Fullscreen Error",
          description: "Unable to enter fullscreen mode",
          variant: "destructive"
        });
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Listen for fullscreen changes (ESC key or other methods)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const loadMoreResults = async () => {
    if (!nextPageToken || !currentSearchQuery || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    
    try {
      const result = await searchYouTubeVideos(currentSearchQuery, "all", 20, nextPageToken);
      setSearchResults(prev => [...prev, ...result.songs]);
      setNextPageToken(result.nextPageToken);
    } catch (error) {
      console.error('Load more error:', error);
      toast({
        title: "Load More Failed",
        description: "Unable to load more results",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const clearSearch = () => {
    setSearchResults([]);
    setNextPageToken(undefined);
  };

  const hideSearch = () => {
    setHasSearched(false);
  };

  const showSearch = () => {
    setHasSearched(true);
  };

  const currentSong = currentIndex >= 0 && Array.isArray(queue) && queue[currentIndex] ? queue[currentIndex] : null;
  
  // Determine layout based on search state
  const hasResults = Array.isArray(searchResults) && searchResults.length > 0;
  const showSearchResults = hasSearched || isSearchLoading;
  
  // Dynamic grid configuration
  const getGridConfig = () => {
    if (!showSearchResults) {
      // No search results: Queue gets more space (3 columns), Preview gets 1
      return {
        gridCols: "grid-cols-1 lg:grid-cols-4",
        searchSpan: "lg:col-span-1 hidden lg:block", // Hidden on large screens when no search
        queueSpan: "lg:col-span-3", // Queue gets 3 columns (more space)
        previewSpan: "lg:col-span-1"
      };
    } else if (hasResults) {
      // Has search results: Search gets 1, Queue gets 2, Preview gets 1
      return {
        gridCols: "grid-cols-1 lg:grid-cols-4",
        searchSpan: "lg:col-span-1",
        queueSpan: "lg:col-span-2", // Queue gets 2 columns
        previewSpan: "lg:col-span-1"
      };
    } else {
      // Searched but no results: Compact search, more space for queue
      return {
        gridCols: "grid-cols-1 lg:grid-cols-4",
        searchSpan: "lg:col-span-1",
        queueSpan: "lg:col-span-2", // Queue gets 2 columns
        previewSpan: "lg:col-span-1"
      };
    }
  };
  
  const gridConfig = getGridConfig();

  // Infinite scroll hook
  const { targetRef, isFetching, setIsFetchingMore } = useInfiniteScroll(
    loadMoreResults, 
    scrollContainerRef.current
  );

  // Reset fetching state when load more completes
  useEffect(() => {
    if (isFetching && !isLoadingMore) {
      setIsFetchingMore(false);
    }
  }, [isLoadingMore, isFetching, setIsFetchingMore]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-2 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <Mic2 className="w-8 h-8 text-primary" />
              <div className="flex flex-col">
                <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  SingTube <sup className="text-xs font-semibold text-white -top-4 relative">Beta</sup>
                </h1>
                <p className="text-sm text-muted-foreground">
                  The Missing Karaoke Player for YouTube
                </p>
              </div>
            </div>
            
            {/* Search Section and Controls */}
            <div className="flex-1 max-w-2xl">
              <SearchSection 
                onSearch={handleSearch} 
                isLoading={isSearchLoading} 
                refreshHistory={refreshHistory} 
                compact 
                extraButton={
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="flex-shrink-0"
                    title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  >
                    {isFullscreen ? (
                      <Shrink className="w-4 h-4" />
                    ) : (
                      <Expand className="w-4 h-4" />
                    )}
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 py-3 flex-1 flex flex-col">

        {/* Main Content Grid */}
        <div className={`grid gap-6 flex-1 ${isQueueMaximized ? 'hidden' : gridConfig.gridCols}`}>
          {/* Search Results */}
          {showSearchResults && (
            <div className={gridConfig.searchSpan}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">
                  Search Results ({Array.isArray(searchResults) ? searchResults.length : 0})
                </h2>
                {hasSearched && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={clearSearch}
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Clear
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={hideSearch}
                      className="flex items-center gap-2"
                    >
                      <EyeOff className="w-4 h-4" />
                      Hide
                    </Button>
                  </div>
                )}
              </div>
              
              {isSearchLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Searching for karaoke songs...</p>
                </div>
              ) : !Array.isArray(searchResults) || searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <img 
                    src={heroImage} 
                    alt="Karaoke Hero" 
                    className="w-full max-w-md mx-auto rounded-lg mb-4 opacity-50"
                  />
                  <p className="text-muted-foreground">
                    {hasSearched ? "No results found. Try a different search term." : "Search for your favorite Chinese karaoke songs"}
                  </p>
                </div>
              ) : (
                <div ref={scrollContainerRef} className="grid gap-4 max-h-[600px] overflow-y-auto">
                  {(Array.isArray(searchResults) ? searchResults : []).map(song => (
                    <SongCard
                      key={song.id}
                      song={song}
                      onAddToQueue={addToQueue}
                      onAddToFront={addToFront}
                      showPlayButton
                    />
                  ))}
                  
                  {/* Infinite scroll trigger */}
                  {nextPageToken && (
                    <div ref={targetRef} className="py-4 text-center">
                      {isLoadingMore ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          <span className="text-sm text-muted-foreground">Loading more songs...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-sm text-muted-foreground">Scroll down for more results</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={loadMoreResults}
                            disabled={isLoadingMore}
                          >
                            Load More
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Queue */}
          <div className={`${gridConfig.queueSpan} flex flex-col min-h-0`}>
            {!showSearchResults && (
              <div className="mb-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={showSearch}
                  className="flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Show Search
                </Button>
              </div>
            )}
            <QueueSection
              queue={queue}
              onRemove={removeFromQueue}
              onReorder={reorderQueue}
              onSelect={selectSong}
              onPlay={handlePlayCurrentSong}
              onPause={handlePauseCurrentSong}
              onNext={nextSong}
              onPrevious={previousSong}
              onDoubleClickPlay={handleDoubleClickPlay}
              currentIndex={currentIndex}
              isPlaying={isPlaying}
              canGoNext={Array.isArray(queue) && currentIndex < queue.length - 1}
              canGoPrevious={currentIndex > 0}
              onLoadQueue={loadQueue}
              onQueueSaved={handleQueueSaved}
              isMaximized={isQueueMaximized}
              onToggleMaximize={toggleQueueMaximize}
              queueName={currentQueueName}
              queueId={currentQueueId}
            />
          </div>

          {/* Preview */}
          <div className={gridConfig.previewSpan}>
            <CurrentSong
              currentSong={currentSong}
              onNext={nextSong}
              onPrevious={previousSong}
              canGoNext={Array.isArray(queue) && currentIndex < queue.length - 1}
              canGoPrevious={currentIndex > 0}
              shouldAutoplay={shouldAutoplay}
              shouldPause={shouldPause}
              onAutoplayHandled={handleAutoplayComplete}
              onPauseHandled={handlePauseComplete}
              onVideoEnd={handleVideoEnd}
              autoAdvance={autoAdvance}
              onPlaybackStarted={handlePlaybackStarted}
            />
          </div>
        </div>

        {/* Maximized Queue */}
        {isQueueMaximized && (
          <QueueSection
            queue={queue}
            onRemove={removeFromQueue}
            onReorder={reorderQueue}
            onSelect={selectSong}
            onPlay={handlePlayCurrentSong}
            onPause={handlePauseCurrentSong}
            onNext={nextSong}
            onPrevious={previousSong}
            onDoubleClickPlay={handleDoubleClickPlay}
            currentIndex={currentIndex}
            isPlaying={isPlaying}
            canGoNext={Array.isArray(queue) && currentIndex < queue.length - 1}
            canGoPrevious={currentIndex > 0}
            onLoadQueue={loadQueue}
            onQueueSaved={handleQueueSaved}
            isMaximized={isQueueMaximized}
            onToggleMaximize={toggleQueueMaximize}
            queueName={currentQueueName}
            queueId={currentQueueId}
          />
        )}
      </div>
    </div>
  );
};

export default Index;