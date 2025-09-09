import { useState, useEffect } from "react";
import { SearchSection } from "@/components/SearchSection";
import { SongCard, Song } from "@/components/SongCard";
import { CurrentSong } from "@/components/CurrentSong";
import { QueueSection } from "@/components/QueueSection";
import { searchYouTubeVideos, saveSearchHistory, saveCurrentQueue, loadCurrentQueue } from "@/services/apiService";
import { useToast } from "@/hooks/use-toast";
import { Mic2 } from "lucide-react";
import heroImage from "@/assets/karaoke-hero.jpg";

const Index = () => {
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [refreshHistory, setRefreshHistory] = useState(false);
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
    
    try {
      const results = await searchYouTubeVideos(query, gender, 20);
      setSearchResults(results);
      
      // Save search to history
      await saveSearchHistory(query, gender);
      
      // Trigger history refresh
      setRefreshHistory(prev => !prev);
      
      toast({
        title: "Search Complete",
        description: `Found ${Array.isArray(results) ? results.length : 0} karaoke songs from YouTube`,
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: "Unable to search YouTube. Please check your API key configuration.",
        variant: "destructive"
      });
      setSearchResults([]);
    } finally {
      setIsSearchLoading(false);
    }
  };

  const addToQueue = (song: Song) => {
    setQueue(prev => [...prev, song]);
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

  const loadQueue = (songs: Song[]) => {
    const safeSongs = Array.isArray(songs) ? songs : [];
    setQueue(safeSongs);
    setCurrentIndex(safeSongs.length > 0 ? 0 : -1);
  };

  const currentSong = currentIndex >= 0 && Array.isArray(queue) && queue[currentIndex] ? queue[currentIndex] : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Mic2 className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              SingTube
            </h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Search Section */}
        <div className="mb-6">
          <SearchSection onSearch={handleSearch} isLoading={isSearchLoading} refreshHistory={refreshHistory} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Results */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4 text-foreground">
              Search Results ({Array.isArray(searchResults) ? searchResults.length : 0})
            </h2>
            
            {!Array.isArray(searchResults) || searchResults.length === 0 ? (
              <div className="text-center py-12">
                <img 
                  src={heroImage} 
                  alt="Karaoke Hero" 
                  className="w-full max-w-md mx-auto rounded-lg mb-4 opacity-50"
                />
                <p className="text-muted-foreground">
                  Search for your favorite Chinese karaoke songs
                </p>
              </div>
            ) : (
              <div className="grid gap-4 max-h-[600px] overflow-y-auto">
                {(Array.isArray(searchResults) ? searchResults : []).map(song => (
                  <SongCard
                    key={song.id}
                    song={song}
                    onAddToQueue={addToQueue}
                    onAddToFront={addToFront}
                    showPlayButton
                  />
                ))}
              </div>
            )}
          </div>

          {/* Current Song */}
          <div className="lg:col-span-1">
            <CurrentSong
              currentSong={currentSong}
              onNext={nextSong}
              onPrevious={previousSong}
              canGoNext={Array.isArray(queue) && currentIndex < queue.length - 1}
              canGoPrevious={currentIndex > 0}
            />
          </div>

          {/* Queue */}
          <div className="lg:col-span-1">
            <QueueSection
              queue={queue}
              onRemove={removeFromQueue}
              onReorder={() => {}} // TODO: Implement drag & drop
              onSelect={selectSong}
              currentIndex={currentIndex}
              onLoadQueue={loadQueue}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;