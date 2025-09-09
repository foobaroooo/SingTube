import { useState, useEffect, useRef } from "react";
import { SearchSection } from "@/components/SearchSection";
import { SongCard, Song } from "@/components/SongCard";
import { CurrentSong } from "@/components/CurrentSong";
import { QueueSection } from "@/components/QueueSection";
import { searchYouTubeVideos, saveSearchHistory, saveCurrentQueue, loadCurrentQueue } from "@/services/apiService";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Mic2, X, EyeOff, Search } from "lucide-react";
import heroImage from "@/assets/karaoke-hero.jpg";

const Index = () => {
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [refreshHistory, setRefreshHistory] = useState(false);
  const [isQueueMaximized, setIsQueueMaximized] = useState(false);
  const [currentQueueName, setCurrentQueueName] = useState<string>("");
  const [hasSearched, setHasSearched] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load saved queue on component mount
  useEffect(() => {
    const savedData = loadCurrentQueue();
    if (Array.isArray(savedData.songs) && savedData.songs.length > 0) {
      setQueue(savedData.songs);
      setCurrentIndex(savedData.currentIndex);
    }
  }, []);

  // Auto-save queue whenever it changes
  useEffect(() => {
    if ((Array.isArray(queue) && queue.length > 0) || currentIndex >= 0) {
      saveCurrentQueue(queue, currentIndex);
    }
  }, [queue, currentIndex]);

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

  const addToQueue = (song: Song) => {
    setQueue(prev => [...prev, song]);
    setCurrentQueueName(""); // Clear queue name when adding individual songs
    toast({
      title: "Song Added",
      description: `${song.title} added to queue`,
    });
  };

  const addToFront = (song: Song) => {
    setQueue(prev => [song, ...prev]);
    if (currentIndex >= 0) {
      setCurrentIndex(prev => prev + 1);
    }
    setCurrentQueueName(""); // Clear queue name when adding individual songs
    toast({
      title: "Priority Added",
      description: `${song.title} added to front of queue`,
    });
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => Array.isArray(prev) ? prev.filter((_, i) => i !== index) : []);
    if (index === currentIndex) {
      setCurrentIndex(-1);
    } else if (index < currentIndex) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const selectSong = (index: number) => {
    setCurrentIndex(index);
  };

  const nextSong = () => {
    if (Array.isArray(queue) && currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const previousSong = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const loadQueue = (songs: Song[], queueName: string = "") => {
    const safeSongs = Array.isArray(songs) ? songs : [];
    setQueue(safeSongs);
    setCurrentIndex(safeSongs.length > 0 ? 0 : -1);
    setCurrentQueueName(queueName);
  };

  const toggleQueueMaximize = () => {
    setIsQueueMaximized(prev => !prev);
  };

  const handleQueueSaved = (queueName: string) => {
    setCurrentQueueName(queueName);
  };

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
      // No search results: Queue gets more space (2 columns), Preview gets 1
      return {
        gridCols: "grid-cols-1 lg:grid-cols-3",
        searchSpan: "lg:col-span-1 hidden lg:block", // Hidden on large screens when no search
        queueSpan: "lg:col-span-2", // Queue gets 2 columns
        previewSpan: "lg:col-span-1"
      };
    } else if (hasResults) {
      // Has search results: Equal distribution
      return {
        gridCols: "grid-cols-1 lg:grid-cols-3",
        searchSpan: "lg:col-span-1",
        queueSpan: "lg:col-span-1",
        previewSpan: "lg:col-span-1"
      };
    } else {
      // Searched but no results: Compact search, more space for queue
      return {
        gridCols: "grid-cols-1 lg:grid-cols-3",
        searchSpan: "lg:col-span-1",
        queueSpan: "lg:col-span-1",
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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Mic2 className="w-8 h-8 text-primary" />
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                SingTube
              </h1>
              <p className="text-sm text-muted-foreground">
                The Missing Karaoke Player for YouTube
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-3">
        {/* Search Section */}
        <div className="mb-4">
          <SearchSection onSearch={handleSearch} isLoading={isSearchLoading} refreshHistory={refreshHistory} />
        </div>

        {/* Main Content Grid */}
        <div className={`grid gap-6 ${isQueueMaximized ? 'hidden' : gridConfig.gridCols}`}>
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
          <div className={gridConfig.queueSpan}>
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
              onReorder={() => {}} // TODO: Implement drag & drop
              onSelect={selectSong}
              currentIndex={currentIndex}
              onLoadQueue={loadQueue}
              onQueueSaved={handleQueueSaved}
              isMaximized={isQueueMaximized}
              onToggleMaximize={toggleQueueMaximize}
              queueName={currentQueueName}
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
            />
          </div>
        </div>

        {/* Maximized Queue */}
        {isQueueMaximized && (
          <QueueSection
            queue={queue}
            onRemove={removeFromQueue}
            onReorder={() => {}} // TODO: Implement drag & drop
            onSelect={selectSong}
            currentIndex={currentIndex}
            onLoadQueue={loadQueue}
            onQueueSaved={handleQueueSaved}
            isMaximized={isQueueMaximized}
            onToggleMaximize={toggleQueueMaximize}
            queueName={currentQueueName}
          />
        )}
      </div>
    </div>
  );
};

export default Index;