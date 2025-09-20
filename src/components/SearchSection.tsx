import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Mic, Clock, Loader2, X } from "lucide-react";
import { getSearchHistory, deleteSearchHistory, type SearchHistory } from "@/services/apiService";

interface SearchSectionProps {
  onSearch: (query: string, gender: string) => void;
  isLoading?: boolean;
  refreshHistory?: boolean;
  compact?: boolean;
  extraButton?: React.ReactNode;
}

export const SearchSection = ({ onSearch, isLoading = false, refreshHistory = false, compact = false, extraButton }: SearchSectionProps) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);

  const loadHistory = async () => {
    try {
      const history = await getSearchHistory();
      setSearchHistory(history.slice(0, 5)); // Show only last 5 searches
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (refreshHistory) {
      loadHistory();
    }
  }, [refreshHistory]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery, "all");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleHistoryClick = (historyQuery: string, historyGender: string) => {
    setSearchQuery(historyQuery);
    onSearch(historyQuery, historyGender);
  };

  const handleDeleteHistory = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevent triggering the search
    try {
      const success = await deleteSearchHistory(id);
      if (success) {
        await loadHistory(); // Refresh the history list
      }
    } catch (error) {
      console.error('Failed to delete search history:', error);
    }
  };

  if (compact) {
    return (
      <div className="w-full">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder={t('app.search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-input border-border focus:ring-2 focus:ring-primary transition-smooth"
            />
          </div>
          
          <Button 
            onClick={handleSearch}
            className="px-4 bg-gradient-primary hover:shadow-neon transition-bounce"
            disabled={!searchQuery.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
          
          {/* Extra button (e.g. fullscreen toggle) */}
          {extraButton}
        </div>

        {/* Recent Searches - Dropdown style for compact mode */}
        {Array.isArray(searchHistory) && searchHistory.length > 0 && (
          <div className="mt-2">
            <div className="flex flex-wrap gap-1">
                {(Array.isArray(searchHistory) ? searchHistory : []).slice(0, 3).map((history) => (
                <Badge
                  key={`${history.query}-${history.gender}-${history.id}`}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80 transition-colors text-xs flex items-center gap-1 pr-1"
                  onClick={() => handleHistoryClick(history.query, history.gender)}
                >
                  <span>{history.query}</span>
                  <button
                    onClick={(e) => handleDeleteHistory(e, history.id)}
                    className="hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                    title="Remove from history"
                  >
                    <X className="w-2 h-2" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-card">
      <div className="flex items-center gap-3 mb-3">
        <Mic className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Search Karaoke Songs
        </h2>
      </div>
      
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder={t('app.search.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="text-lg py-3 bg-input border-border focus:ring-2 focus:ring-primary transition-smooth"
          />
        </div>
        
        <Button 
          onClick={handleSearch}
          className="px-6 bg-gradient-primary hover:shadow-neon transition-bounce"
          disabled={!searchQuery.trim() || isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Search className="w-5 h-5 mr-2" />
          )}
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {/* Search History */}
      {Array.isArray(searchHistory) && searchHistory.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Recent Searches</span>
          </div>
          <div className="flex flex-wrap gap-2">
              {(Array.isArray(searchHistory) ? searchHistory : []).map((history) => (
              <Badge
                key={`${history.query}-${history.gender}-${history.id}`}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 transition-colors flex items-center gap-1 pr-1"
                onClick={() => handleHistoryClick(history.query, history.gender)}
              >
                <span>
                  {history.query}
                  {history.gender !== 'all' && (
                    <span className="ml-1 text-xs opacity-70">
                      ({history.gender === 'male' ? '男' : '女'})
                    </span>
                  )}
                </span>
                <button
                  onClick={(e) => handleDeleteHistory(e, history.id)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                  title="Remove from history"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};