import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SearchSection } from "@/components/SearchSection";
import { SongCard, Song } from "@/components/SongCard";
import { CurrentSong } from "@/components/CurrentSong";
import { QueueSection } from "@/components/QueueSection";
import { Pagination } from "@/components/Pagination";
import { LanguageToggle } from "@/components/LanguageToggle";
import { searchYouTubeVideos, saveSearchHistory, saveCurrentQueue, loadCurrentQueue, updateQueue, getSharedQueue, saveQueue, getSavedQueues } from "@/services/apiService";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Mic2, X, EyeOff, Search, Expand, Shrink, List } from "lucide-react";
import heroImage from "@/assets/karaoke-hero.jpg";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
  const [prevPageToken, setPrevPageToken] = useState<string | undefined>(undefined);
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>("");
  const [currentSearchGender, setCurrentSearchGender] = useState<string>("all");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [pageTokenHistory, setPageTokenHistory] = useState<string[]>([]);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  const [shouldPause, setShouldPause] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true); // Enable auto-advance by default
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeView, setActiveView] = useState<'search' | 'queue'>('queue'); // Track which view is active
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load saved queue on component mount and handle shared queues
  useEffect(() => {
    const loadInitialQueue = async () => {
      // Check for shared queue in URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const shareGuid = urlParams.get('share');
      
      if (shareGuid) {
        try {
          const sharedQueue = await getSharedQueue(shareGuid);
          if (sharedQueue) {
            setQueue(sharedQueue.songs);
            setCurrentIndex(0);
            setCurrentQueueName(sharedQueue.name);
            setCurrentQueueId(sharedQueue.id);
            setActiveView('queue'); // Switch to queue view to show the shared playlist
            
            toast({
              title: "Shared Queue Loaded",
              description: `Loaded "${sharedQueue.name}" with ${sharedQueue.songs.length} songs`,
            });
            
            // Clean up URL to remove share parameter
            window.history.replaceState({}, '', window.location.pathname);
            return;
          } else {
            toast({
              title: "Shared Queue Not Found",
              description: "The shared queue could not be found or may have been deleted",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('Failed to load shared queue:', error);
          toast({
            title: "Failed to Load Shared Queue",
            description: "There was an error loading the shared queue",
            variant: "destructive"
          });
        }
      }
      
      // Load regular saved queue if no shared queue
      const savedData = loadCurrentQueue();
      if (Array.isArray(savedData.songs) && savedData.songs.length > 0) {
        setQueue(savedData.songs);
        setCurrentIndex(savedData.currentIndex);
        setCurrentQueueName(savedData.queueName);
      }
    };
    
    loadInitialQueue();
  }, []);

  // Auto-save queue whenever it changes
  useEffect(() => {
    if ((Array.isArray(queue) && queue.length > 0) || currentIndex >= 0) {
      saveCurrentQueue(queue, currentIndex, currentQueueName);
    }
  }, [queue, currentIndex, currentQueueName]);

  const handleSearch = async (query: string, gender: string, pageToken?: string) => {
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
    setCurrentSearchGender(gender);
    setActiveView('search'); // Switch to search view when searching
    
    // If no pageToken provided, this is a new search
    if (!pageToken) {
      setCurrentPage(1);
      setPageTokenHistory([]);
      setPrevPageToken(undefined);
    }
    
    try {
      console.log('Calling searchYouTubeVideos with:', { 
        query, 
        gender, 
        itemsPerPage, 
        pageToken 
      });
      
      const result = await searchYouTubeVideos(query, gender, itemsPerPage, pageToken);
      
      console.log('Search result:', {
        songsCount: result.songs.length,
        nextPageToken: result.nextPageToken,
        hasNextPageToken: !!result.nextPageToken
      });
      
      setSearchResults(result.songs);
      setNextPageToken(result.nextPageToken);
      
      // Debug logging
      console.log('Search complete:', {
        query,
        gender,
        pageToken,
        currentPage,
        results: result.songs.length,
        hasNext: !!result.nextPageToken,
        hasPrev: pageTokenHistory.length > 0
      });
      
      // Save search to history (only for new searches, not pagination)
      if (!pageToken) {
        await saveSearchHistory(query, gender);
        // Trigger history refresh
        setRefreshHistory(prev => !prev);
      }
      
      toast({
        title: t('app.notifications.searchCompleteTitle'),
        description: t('app.notifications.searchComplete', { count: result.songs.length }) + ` (Page ${currentPage})`,
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
    
    // Auto-save queue if it's the first song and queue isn't saved yet
    if (!currentQueueId && !currentQueueName && queue.length === 0) {
      try {
        const autoSaveName = `My Queue ${new Date().toLocaleDateString()}`;
        const success = await saveQueue(autoSaveName, newQueue);
        if (success) {
          // Get the newly saved queue to get its ID
          const savedQueues = await getSavedQueues();
          const savedQueue = savedQueues.find(q => q.name === autoSaveName);
          if (savedQueue) {
            setCurrentQueueName(autoSaveName);
            setCurrentQueueId(savedQueue.id);
            toast({
              title: "Queue Auto-Saved",
              description: `Created "${autoSaveName}" and added ${song.title}`,
            });
            return;
          }
        }
      } catch (error) {
        console.error('Failed to auto-save new queue:', error);
      }
    }
    
    // Auto-update saved queue if this is a saved queue
    if (currentQueueId && currentQueueName) {
      try {
        const success = await updateQueue(currentQueueId, currentQueueName, newQueue);
        if (success) {
          toast({
            title: "Song Added",
            description: `${song.title} added to "${currentQueueName}" and saved`,
          });
        } else {
          toast({
            title: "Song Added",
            description: `${song.title} added to queue (save failed)`,
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Failed to update saved queue:', error);
        toast({
          title: "Song Added",
          description: `${song.title} added to queue (save failed)`,
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Song Added",
        description: `${song.title} added to queue`,
      });
    }
  };

  const addToFront = async (song: Song) => {
    const newQueue = [song, ...queue];
    setQueue(newQueue);
    if (currentIndex >= 0) {
      setCurrentIndex(prev => prev + 1);
    }
    
    // Auto-save queue if it's the first song and queue isn't saved yet
    if (!currentQueueId && !currentQueueName && queue.length === 0) {
      try {
        const autoSaveName = `My Queue ${new Date().toLocaleDateString()}`;
        const success = await saveQueue(autoSaveName, newQueue);
        if (success) {
          // Get the newly saved queue to get its ID
          const savedQueues = await getSavedQueues();
          const savedQueue = savedQueues.find(q => q.name === autoSaveName);
          if (savedQueue) {
            setCurrentQueueName(autoSaveName);
            setCurrentQueueId(savedQueue.id);
            toast({
              title: "Queue Auto-Saved",
              description: `Created "${autoSaveName}" and added ${song.title} to front`,
            });
            return;
          }
        }
      } catch (error) {
        console.error('Failed to auto-save new queue:', error);
      }
    }
    
    // Auto-update saved queue if this is a saved queue
    if (currentQueueId && currentQueueName) {
      try {
        const success = await updateQueue(currentQueueId, currentQueueName, newQueue);
        if (success) {
          toast({
            title: "Priority Added",
            description: `${song.title} added to front of "${currentQueueName}" and saved`,
          });
        } else {
          toast({
            title: "Priority Added",
            description: `${song.title} added to front of queue (save failed)`,
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Failed to update saved queue:', error);
        toast({
          title: "Priority Added",
          description: `${song.title} added to front of queue (save failed)`,
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Priority Added",
        description: `${song.title} added to front of queue`,
      });
    }
  };

  const removeFromQueue = async (index: number) => {
    const songToRemove = Array.isArray(queue) && queue[index] ? queue[index] : null;
    const newQueue = Array.isArray(queue) ? queue.filter((_, i) => i !== index) : [];
    setQueue(newQueue);
    
    if (index === currentIndex) {
      setCurrentIndex(-1);
    } else if (index < currentIndex) {
      setCurrentIndex(prev => prev - 1);
    }
    
    // Auto-update saved queue if this is a saved queue
    if (currentQueueId && currentQueueName) {
      try {
        const success = await updateQueue(currentQueueId, currentQueueName, newQueue);
        if (success && songToRemove) {
          toast({
            title: "Song Removed",
            description: `${songToRemove.title} removed from "${currentQueueName}" and saved`,
          });
        } else if (!success && songToRemove) {
          toast({
            title: "Song Removed",
            description: `${songToRemove.title} removed from queue (save failed)`,
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Failed to update saved queue after removal:', error);
        if (songToRemove) {
          toast({
            title: "Song Removed",
            description: `${songToRemove.title} removed from queue (save failed)`,
            variant: "destructive"
          });
        }
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
        const success = await updateQueue(currentQueueId, currentQueueName, newQueue);
        if (!success) {
          toast({
            title: "Reorder Failed",
            description: `Failed to save queue changes to "${currentQueueName}"`,
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Failed to update saved queue after reorder:', error);
        toast({
          title: "Reorder Failed",
          description: `Failed to save queue changes to "${currentQueueName}"`,
          variant: "destructive"
        });
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

  const handleLogoClick = () => {
    navigate('/');
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
    setPrevPageToken(undefined);
    setCurrentPage(1);
    setPageTokenHistory([]);
  };

  const nextPage = async () => {
    if (!nextPageToken || !currentSearchQuery) return;
    
    setIsLoadingMore(true);
    
    try {
      // Add current page token to history
      setPageTokenHistory(prev => [...prev, nextPageToken]);
      setPrevPageToken(nextPageToken);
      setCurrentPage(prev => prev + 1);
      
      await handleSearch(currentSearchQuery, currentSearchGender, nextPageToken);
    } catch (error) {
      console.error('Next page error:', error);
      toast({
        title: "Page Load Failed",
        description: "Unable to load next page",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const prevPage = async () => {
    if (pageTokenHistory.length === 0) return;
    
    setIsLoadingMore(true);
    
    try {
      // Get the previous page token from history
      const newHistory = [...pageTokenHistory];
      const prevToken = newHistory.pop();
      
      setPageTokenHistory(newHistory);
      setCurrentPage(prev => prev - 1);
      
      // If we're going to page 1, use no token
      const tokenToUse = newHistory.length === 0 ? undefined : newHistory[newHistory.length - 1];
      
      await handleSearch(currentSearchQuery, currentSearchGender, tokenToUse);
    } catch (error) {
      console.error('Previous page error:', error);
      toast({
        title: "Page Load Failed",
        description: "Unable to load previous page",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const toggleView = () => {
    setActiveView(prev => prev === 'search' ? 'queue' : 'search');
  };

  const switchToQueue = () => {
    setActiveView('queue');
  };

  const handlePreviewSong = (song: Song) => {
    // Create a temporary queue with just this song for preview
    const tempQueue = [song];
    setQueue(tempQueue);
    setCurrentIndex(0);
    setCurrentQueueName("Preview");
    setCurrentQueueId(null);
    
    toast({
      title: "Preview Mode",
      description: `Previewing: ${song.title}`,
    });
  };

  const currentSong = currentIndex >= 0 && Array.isArray(queue) && queue[currentIndex] ? queue[currentIndex] : null;
  
  // Determine layout based on active view
  const hasResults = Array.isArray(searchResults) && searchResults.length > 0;
  const showSearchResults = activeView === 'search' && (hasSearched || isSearchLoading);
  const showQueueSection = activeView === 'queue';
  
  // Dynamic grid configuration - only show one main section at a time
  const getGridConfig = () => {
    return {
      gridCols: "grid-cols-1 lg:grid-cols-4",
      mainSpan: "lg:col-span-3", // Main content (search OR queue) gets 3 columns
      previewSpan: "lg:col-span-1" // Preview always gets 1 column
    };
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
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleLogoClick}
            >
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
                  <>
                    <LanguageToggle />
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
                  </>
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
            <div className={`${gridConfig.mainSpan} flex flex-col min-h-0`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {t('app.search.resultsTitle')} ({Array.isArray(searchResults) ? searchResults.length : 0})
                </h2>
                <div className="flex gap-2">
                  {hasSearched && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={clearSearch}
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      {t('app.actions.clear')}
                    </Button>
                  )}
                  <Button 
                    size="sm"
                    onClick={toggleView}
                    className="flex items-center gap-2 bg-gradient-primary hover:shadow-neon transition-bounce"
                  >
                    <List className="w-4 h-4" />
                    {t('app.queue.title')}
                  </Button>
                </div>
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
                    {hasSearched ? t('app.searchResults.noResults') : t('app.searchResults.searchPrompt')}
                  </p>
                </div>
              ) : (
                <>
                  <div ref={scrollContainerRef} className="grid gap-4 flex-1 overflow-y-auto">
                    {(Array.isArray(searchResults) ? searchResults : []).map(song => (
                      <SongCard
                        key={song.id}
                        song={song}
                        onAddToQueue={addToQueue}
                        onAddToFront={addToFront}
                        onPreview={handlePreviewSong}
                        showPlayButton
                        compact
                      />
                    ))}
                  </div>
                  
                  {/* Fixed Pagination at bottom */}
                  <div className="border-t border-border bg-card/50 backdrop-blur-sm py-4 mt-4">
                    <Pagination
                      currentPage={currentPage}
                      hasNextPage={!!nextPageToken}
                      hasPrevPage={currentPage > 1}
                      onPrevious={prevPage}
                      onNext={nextPage}
                      isLoading={isLoadingMore}
                    />
                    
                    {/* Debug info */}
                    <div className="text-xs text-muted-foreground text-center pt-2">
                      Debug: Page {currentPage}, Next: {nextPageToken ? 'Yes' : 'No'}, Prev: {currentPage > 1 ? 'Yes' : 'No'}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Queue */}
          {showQueueSection && (
            <div className={`${gridConfig.mainSpan} flex flex-col min-h-0`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {t('app.queue.title')}
                </h2>
                <Button 
                  size="sm"
                  onClick={toggleView}
                  className="flex items-center gap-2 bg-gradient-primary hover:shadow-neon transition-bounce"
                >
                  <Search className="w-4 h-4" />
                  {t('app.search.resultsTitle')}
                </Button>
              </div>
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
          )}

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