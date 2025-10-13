import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SearchSection } from "@/components/SearchSection";
import { SongCard, Song } from "@/components/SongCard";
import { CurrentSong } from "@/components/CurrentSong";
import { QueueSection } from "@/components/QueueSection";
import { Pagination } from "@/components/Pagination";
import { LanguageToggle } from "@/components/LanguageToggle";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { MobilePlaybackControls } from "@/components/MobilePlaybackControls";
import { MobilePreviewOverlay } from "@/components/MobilePreviewOverlay";
import { searchYouTubeVideos, saveSearchHistory, saveCurrentQueue, loadCurrentQueue, updateQueue, getSharedQueue, saveQueue, getSavedQueues, trackSearch, trackSongPlay } from "@/services/apiService";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic2, X, EyeOff, Search, Expand, Shrink, List, AlertCircle, SkipBack, SkipForward, Play, Pause } from "lucide-react";
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
  const [showTutorial, setShowTutorial] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load saved queue on component mount and handle shared queues
  useEffect(() => {
    const loadInitialQueue = async () => {
      // Check for shared queue in URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const shareGuid = urlParams.get('share');
      const searchQuery = urlParams.get('search');
      const searchGender = urlParams.get('gender') || 'all';
      
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
      
      // Handle search query from URL (e.g., from TopSearch page)
      if (searchQuery && !shareGuid) {
        try {
          // Clean up URL to remove search parameters
          window.history.replaceState({}, '', window.location.pathname);
          
          // Trigger search with the query from URL
          setTimeout(() => {
            handleSearch(searchQuery, searchGender);
          }, 500); // Small delay to ensure component is ready
          return;
        } catch (error) {
          console.error('Failed to handle search from URL:', error);
        }
      }
      
      // Load regular saved queue if no shared queue and no search query
      const savedData = loadCurrentQueue();
      if (Array.isArray(savedData.songs) && savedData.songs.length > 0) {
        setQueue(savedData.songs);
        setCurrentIndex(savedData.currentIndex);
        setCurrentQueueName(savedData.queueName);
      }
    };
    
    loadInitialQueue();
    
    // Check if tutorial should be shown
    const tutorialCompleted = localStorage.getItem('singtube_tutorial_completed');
    if (!tutorialCompleted) {
      // Delay showing tutorial to allow UI to render
      setTimeout(() => setShowTutorial(true), 1000);
    }
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
        // Track search in analytics database
        await trackSearch(query, gender);
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
      // Close preview overlay when changing songs
      setShowMobilePreview(false);
    }
  };

  const previousSong = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      // Reset playing state when changing songs  
      setIsPlaying(false);
      // Close preview overlay when changing songs
      setShowMobilePreview(false);
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
      
      // Track song play in analytics database
      trackSongPlay(song).catch(error => {
        console.error('Failed to track song play:', error);
      });
      
      // Auto-show preview when play is triggered
      setShowMobilePreview(true);
      
      toast({
        title: "Playing Song",
        description: `Playing: ${song.title}`,
      });
    }
  };

  const handlePauseCurrentSong = () => {
    setShouldPause(true);
    setIsPlaying(false);
    
    // Close preview overlay when pausing
    setShowMobilePreview(false);
    
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
      
      // Track song play in analytics database
      trackSongPlay(song).catch(error => {
        console.error('Failed to track song play:', error);
      });
      
      // Auto-show preview when double-click play is triggered
      setShowMobilePreview(true);
      
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
        
        // Track the auto-advanced song play
        if (queue[nextIndex]) {
          trackSongPlay(queue[nextIndex]).catch(error => {
            console.error('Failed to track auto-advanced song play:', error);
          });
        }
        
        // Keep preview open during auto-advance
        setShowMobilePreview(true);
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

  const handleCloseMobilePreview = () => {
    setShowMobilePreview(false);
  };

  // Helper function to always show preview (now universal for all devices)
  const shouldShowPreview = () => {
    return true; // Always show preview overlay when playing
  };


  const currentSong = currentIndex >= 0 && Array.isArray(queue) && queue[currentIndex] ? queue[currentIndex] : null;
  
  // Determine layout based on active view
  const hasResults = Array.isArray(searchResults) && searchResults.length > 0;
  const showSearchResults = activeView === 'search' && (hasSearched || isSearchLoading);
  const showQueueSection = activeView === 'queue';
  
  // Single column layout for consistency across all devices
  const gridConfig = {
    gridCols: "grid-cols-1",
    mainSpan: "col-span-1"
  };

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
        <div className="container mx-auto px-2 py-3 lg:py-4">
          {/* Mobile: Stacked Layout */}
          <div className="block lg:hidden space-y-3">
            {/* Mobile Top Row: Logo + Essential Controls */}
            <div className="flex items-center justify-between">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleLogoClick}
              >
                <Mic2 className="w-6 h-6 text-primary" />
                <div className="flex flex-col">
                  <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {t('app.title')} <sup className="text-xs font-semibold text-white -top-3 relative">Beta</sup>
                  </h1>
                </div>
              </div>
              
              {/* Mobile Controls Row */}
              <div className="flex items-center gap-2">
                <div data-tutorial="language-toggle">
                  <LanguageToggle />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowTutorial(true)}
                  className="w-8 h-8"
                  title="Show tutorial"
                >
                  <AlertCircle className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="w-8 h-8 hidden"
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? (
                    <Shrink className="w-3 h-3" />
                  ) : (
                    <Expand className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
            
            {/* Mobile Search Row - Full Width */}
            <div className="w-full" data-tutorial="search-section">
              <SearchSection 
                onSearch={handleSearch} 
                isLoading={isSearchLoading} 
                refreshHistory={refreshHistory} 
                compact 
                mobileOptimized
              />
            </div>
          </div>
          
          {/* Desktop: Original Single Row Layout */}
          <div className="hidden lg:flex items-center justify-between gap-4">
            {/* Logo and Title */}
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleLogoClick}
            >
              <Mic2 className="w-8 h-8 text-primary" />
              <div className="flex flex-col">
                <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {t('app.title')} <sup className="text-xs font-semibold text-white -top-4 relative">Beta</sup>
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t('app.slogan')}
                </p>
              </div>
            </div>
            
            {/* Search Section and Controls */}
            <div className="flex-1 max-w-2xl" data-tutorial="search-section">
              <SearchSection 
                onSearch={handleSearch} 
                isLoading={isSearchLoading} 
                refreshHistory={refreshHistory} 
                compact 
                extraButton={
                  <>
                    <div data-tutorial="language-toggle">
                      <LanguageToggle />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowTutorial(true)}
                      className="flex-shrink-0"
                      title="Show tutorial"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </Button>
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

      <div className="container mx-auto px-2 py-3 pb-32 flex-1 flex flex-col">

        {/* Main Content - Single Column */}
        <div className={`flex-1 ${isQueueMaximized ? 'hidden' : 'block'}`}>
          {/* Search Results */}
          {showSearchResults && (
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <h2 className="text-lg lg:text-xl font-semibold text-foreground">
                  {t('app.search.resultsTitle')} ({Array.isArray(searchResults) ? searchResults.length : 0})
                </h2>
                <div className="flex gap-1 lg:gap-2">
                  {hasSearched && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={clearSearch}
                      className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm px-2 lg:px-3"
                    >
                      <X className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span className="hidden sm:inline">{t('app.actions.clear')}</span>
                    </Button>
                  )}
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
                  </div>
                </>
              )}
            </div>
          )}

          {/* Queue */}
          {showQueueSection && (
            <div className="flex flex-col min-h-0">
              <div className="mb-3 lg:mb-4">
                <h2 className="text-lg lg:text-xl font-semibold text-foreground">
                  {t('app.queue.title')}
                </h2>
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

        </div>

        {/* API Limit Notice - Bottom of page */}
        <div className="mt-8 mb-4">
          <div className="bg-card border border-border rounded-lg p-4 shadow-card">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-card-foreground space-y-2">
                <p>
                  {t('app.apiNotice.description1')}
                </p>
                <p>
                  {t('app.apiNotice.description2')}{" "}
                  <span className="text-primary font-medium">
                    {t('app.apiNotice.email')}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright Disclaimer */}
        <div className="mt-4 mb-4">
          <div className="bg-card border border-border rounded-lg p-4 shadow-card">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor">C</text>
              </svg>
              <div className="text-sm text-card-foreground space-y-2">
                <p className="font-medium">{t('app.copyright.title')}</p>
                <p>
                  {t('app.copyright.contentOwnership')}
                </p>
                <p>
                  {t('app.copyright.usage')}
                </p>
              </div>
            </div>
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

      
      {/* Playback Controls - Mobile only (desktop uses combined bottom bar) */}
      <div className="lg:hidden">
        <MobilePlaybackControls
        currentSong={currentSong}
        isPlaying={isPlaying}
        onPlay={handlePlayCurrentSong}
        onPause={handlePauseCurrentSong}
        onNext={nextSong}
        onPrevious={previousSong}
        canGoNext={Array.isArray(queue) && currentIndex < queue.length - 1}
        canGoPrevious={currentIndex > 0}
        />
      </div>

      {/* Preview Overlay - Now universal for all screen sizes */}
      <MobilePreviewOverlay
        currentSong={currentSong}
        isVisible={showMobilePreview}
        onClose={handleCloseMobilePreview}
        onPause={handlePauseCurrentSong}
        shouldAutoplay={shouldAutoplay}
        shouldPause={shouldPause}
        onAutoplayHandled={handleAutoplayComplete}
        onPauseHandled={handlePauseComplete}
        onVideoEnd={handleVideoEnd}
        autoAdvance={autoAdvance}
        onPlaybackStarted={handlePlaybackStarted}
      />

      {/* Bottom Navigation - Now universal for all screen sizes */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-40">
        <div className="container mx-auto px-2">
          {/* Desktop: Combined layout with playback controls and navigation */}
          <div className="hidden lg:flex justify-between items-center py-2">
            {/* Current song info on desktop */}
            {currentSong && (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-foreground truncate">
                    {currentSong.title}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {currentSong.artist} • {currentSong.duration}
                  </p>
                </div>
              </div>
            )}
            
            {/* Combined playback controls and view toggle */}
            <div className="flex items-center gap-4">
              {/* Playback controls */}
              <div className="flex items-center gap-2">
                <Button 
                  onClick={previousSong}
                  disabled={currentIndex <= 0}
                  variant="outline" 
                  size="icon"
                  className="h-8 w-8 border-border hover:bg-secondary"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                
                <Button 
                  onClick={isPlaying ? handlePauseCurrentSong : handlePlayCurrentSong}
                  className="h-10 w-10 bg-gradient-primary hover:shadow-neon transition-bounce rounded-full"
                  disabled={!currentSong}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </Button>
                
                <Button 
                  onClick={nextSong}
                  disabled={!Array.isArray(queue) || currentIndex >= queue.length - 1}
                  variant="outline" 
                  size="icon"
                  className="h-8 w-8 border-border hover:bg-secondary"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>
              
              {/* View toggle */}
              <div className="flex bg-muted rounded-full p-1">
                <Button
                  variant={activeView === 'search' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('search')}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all text-sm ${
                    activeView === 'search' 
                      ? 'bg-gradient-primary text-white shadow-md' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </Button>
                <Button
                  variant={activeView === 'queue' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('queue')}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all text-sm ${
                    activeView === 'queue' 
                      ? 'bg-gradient-primary text-white shadow-md' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span>Queue</span>
                  {Array.isArray(queue) && queue.length > 0 && (
                    <Badge variant="secondary" className={`ml-1 text-xs ${
                      activeView === 'queue' ? 'bg-background/20 text-white' : 'bg-background/20'
                    }`}>
                      {queue.length}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Mobile: Original centered navigation */}
          <div className="lg:hidden flex justify-center py-2">
            <div className="flex bg-muted rounded-full p-1">
              <Button
                variant={activeView === 'search' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('search')}
                className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all ${
                  activeView === 'search' 
                    ? 'bg-gradient-primary text-white shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Search className="w-4 h-4" />
                <span className="text-sm font-medium">{t('app.actions.search')}</span>
              </Button>
              <Button
                variant={activeView === 'queue' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('queue')}
                className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all ${
                  activeView === 'queue' 
                    ? 'bg-gradient-primary text-white shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className="w-4 h-4" />
                <span className="text-sm font-medium">{t('app.queue.title')}</span>
                {Array.isArray(queue) && queue.length > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-background/20 text-white text-xs">
                    {queue.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Onboarding Tutorial */}
      <OnboardingTutorial 
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </div>
  );
};

export default Index;