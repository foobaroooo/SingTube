import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Mic, Clock, Loader2, X, MoreHorizontal } from "lucide-react";
import { getSearchHistoryFromAnalytics, type SearchHistory } from "@/services/apiService";

interface SearchSectionProps {
  onSearch: (query: string, gender: string) => void;
  isLoading?: boolean;
  refreshHistory?: boolean;
  compact?: boolean;
  extraButton?: React.ReactNode;
  mobileOptimized?: boolean;
}

export const SearchSection = ({ onSearch, isLoading = false, refreshHistory = false, compact = false, extraButton, mobileOptimized = false }: SearchSectionProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);

  const loadHistory = async () => {
    try {
      const history = await getSearchHistoryFromAnalytics(10); // Get recent 10 searches
      setSearchHistory(history.slice(0, 5)); // Show only last 5 searches in UI
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

  const handleDeleteHistory = async (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation(); // Prevent triggering the search
    // Since analytics data shouldn't be deleted by users, just remove from local state
    // This is a UI-only operation - the analytics database remains intact for reporting
    setSearchHistory(prev => prev.filter(item => item.id !== id));
  };

  if (compact) {
    return (
      <div className="w-full">
        <div className={`flex gap-2 ${mobileOptimized ? 'gap-2' : 'gap-3'}`}>
          <div className="flex-1">
            <Input
              placeholder={t('app.search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className={`bg-input border-border focus:ring-2 focus:ring-primary transition-smooth ${
                mobileOptimized ? 'text-base py-2.5' : ''
              }`}
              data-tutorial="search-input"
            />
          </div>
          
          <Button 
            onClick={handleSearch}
            className={`bg-gradient-primary hover:shadow-neon transition-bounce ${
              mobileOptimized ? 'px-3' : 'px-4'
            }`}
            disabled={!searchQuery.trim() || isLoading}
            data-tutorial="search-button"
            size={mobileOptimized ? 'default' : 'default'}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {mobileOptimized && !isLoading && (
              <span className="ml-1 hidden sm:inline">Search</span>
            )}
          </Button>
          
          {/* Extra button (e.g. fullscreen toggle) - hide on mobile when mobileOptimized */}
          {!mobileOptimized && extraButton}
        </div>

        {/* Recent Searches - Optimized for mobile */}
        {Array.isArray(searchHistory) && searchHistory.length > 0 && (
          <div className="mt-2">
            <div className="flex flex-wrap gap-1 items-center">
                {(Array.isArray(searchHistory) ? searchHistory : []).slice(0, mobileOptimized ? 2 : 3).map((history) => (
                <Badge
                  key={`${history.query}-${history.gender}-${history.id}`}
                  variant="secondary"
                  className={`cursor-pointer hover:bg-secondary/80 transition-colors flex items-center gap-1 pr-1 ${
                    mobileOptimized ? 'text-xs max-w-[120px]' : 'text-xs'
                  }`}
                  onClick={() => handleHistoryClick(history.query, history.gender)}
                >
                  <span className={mobileOptimized ? 'truncate' : ''}>{history.query}</span>
                  <button
                    onClick={(e) => handleDeleteHistory(e, history.id)}
                    className="hover:bg-destructive/20 rounded-full p-0.5 transition-colors flex-shrink-0"
                    title="Remove from history"
                  >
                    <X className="w-2 h-2" />
                  </button>
                </Badge>
              ))}
              
              {/* Three dots link to top search page */}
              <button
                onClick={() => navigate('/top-search')}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors text-primary hover:text-primary border border-primary/20 hover:border-primary/40"
                title={t('app.topSearch.viewMore')}
              >
                <MoreHorizontal className="w-3 h-3" />
              </button>
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
          <div className="flex flex-wrap gap-2 items-center">
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
            
            {/* Three dots link to top search page */}
            <button
              onClick={() => navigate('/top-search')}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors text-primary hover:text-primary border border-primary/20 hover:border-primary/40"
              title={t('app.topSearch.viewMore')}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};