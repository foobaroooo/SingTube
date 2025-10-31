import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Mic, Clock, Loader2, X, MoreHorizontal, Sparkles } from "lucide-react";
import { getSearchHistory, type SearchHistory } from "@/services/apiService";
import { AIRecommendationDialog } from "@/components/AIRecommendationDialog";
import { useAIRecommendationTrigger } from "@/hooks/useAIRecommendationTrigger";

interface SearchSectionProps {
  onSearch: (query: string, gender: string) => void;
  isLoading?: boolean;
  refreshHistory?: boolean;
  compact?: boolean;
  extraButton?: React.ReactNode;
  mobileOptimized?: boolean;
  onSearchAndAdd?: (title: string, artist: string) => Promise<void>;
}

export const SearchSection = ({ onSearch, isLoading = false, refreshHistory = false, compact = false, extraButton, mobileOptimized = false, onSearchAndAdd }: SearchSectionProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [searchCount, setSearchCount] = useState(0);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  // AI recommendation trigger logic
  const { shouldShow: shouldShowAIPrompt, dismiss: dismissAIPrompt } = useAIRecommendationTrigger({
    searchCount,
    roomGuid: undefined, // Can pass room GUID if available
  });

  const loadHistory = async () => {
    try {
      // console.log('📋 Loading search history...');
      const history = await getSearchHistory(); // Get recent searches (already limited to 50 in PHP)
      // console.log('📋 Raw history from API:', history);
      const historyToSet = history.slice(0, 5);
      setSearchHistory(historyToSet); // Show only last 5 searches in UI
      // console.log('📋 Search history set:', historyToSet);
      
      // Debug: Check what's actually in the state after setting
      // setTimeout(() => {
      //   console.log('📋 Checking searchHistory state after setting...');
      //   console.log('📋 searchHistory length:', historyToSet.length);
      //   console.log('📋 searchHistory content:', historyToSet);
      //   console.log('📋 Array.isArray(searchHistory):', Array.isArray(historyToSet));
      // }, 100);
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    // console.log('🔄 Refresh history triggered, refreshHistory:', refreshHistory);
    loadHistory();
  }, [refreshHistory]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery, "all");
      setSearchCount(prev => prev + 1); // Track search count for AI trigger
    }
  };

  const handleAIRecommendationYes = () => {
    setAiDialogOpen(true);
  };

  const handleAIRecommendationLater = () => {
    dismissAIPrompt();
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
              <span className="ml-1 hidden sm:inline">{t('app.actions.search')}</span>
            )}
          </Button>
          
          {/* Extra button (e.g. fullscreen toggle) - hide on mobile when mobileOptimized */}
          {!mobileOptimized && extraButton}
        </div>

        {/* Recent Searches - Optimized for mobile */}
        {(() => {
          // console.log('📋 RENDER: Checking searchHistory for display...', {
          //   isArray: Array.isArray(searchHistory),
          //   length: searchHistory.length,
          //   content: searchHistory,
          //   firstItem: searchHistory[0],
          //   itemsToRender: (Array.isArray(searchHistory) ? searchHistory : []).slice(0, mobileOptimized ? 2 : 3)
          // });
          const shouldShow = Array.isArray(searchHistory) && searchHistory.length > 0;
          // console.log('📋 RENDER: Should show search history?', shouldShow);
          return shouldShow;
        })() && (
          <div className="mt-2">
            <div className="flex flex-wrap gap-1 items-center">
                {(Array.isArray(searchHistory) ? searchHistory : []).slice(0, mobileOptimized ? 2 : 3).map((history, index) => {
                  // console.log(`📋 RENDER: Mapping history item ${index}:`, history);
                  return (
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
                    title={t('app.search.removeFromHistory')}
                  >
                    <X className="w-2 h-2" />
                  </button>
                </Badge>
                  );
                })}
              
              {/* Three dots link to top search page */}
              <button
                onClick={() => navigate('/top-search')}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors text-primary hover:text-primary border border-primary/20 hover:border-primary/40"
                title={t('app.topSearch.viewMore')}
              >
                <MoreHorizontal className="w-3 h-3" />
              </button>

              {/* AI recommendation icon button */}
              <button
                onClick={() => setAiDialogOpen(true)}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors text-primary hover:text-primary border border-primary/20 hover:border-primary/40"
                title="Get AI Song Recommendations"
              >
                <Sparkles className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* AI Recommendation Prompt */}
        {shouldShowAIPrompt && searchHistory.length >= 3 && (
          <div className="mt-3 p-3 bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-2">
                  ✨ Want AI to recommend songs based on your searches?
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAIRecommendationYes}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Yes, Show Me!
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleAIRecommendationLater}
                  >
                    Maybe Later
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Recommendation Dialog */}
        <AIRecommendationDialog
          isOpen={aiDialogOpen}
          onClose={() => setAiDialogOpen(false)}
          searchHistory={searchHistory.map(h => h.query)}
          onAddToQueue={async (title, artist) => {
            if (onSearchAndAdd) {
              // Search for the song and add to queue automatically
              await onSearchAndAdd(title, artist);
              // Dialog stays open for users to add more songs
            } else {
              // Fallback: just search for the song
              onSearch(`${title} ${artist}`, "all");
              // Dialog stays open for users to add more songs
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-card">
      <div className="flex items-center gap-3 mb-3">
        <Mic className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          {t('app.search.title')}
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
          {isLoading ? t('app.search.searching') : t('app.actions.search')}
        </Button>
      </div>

      {/* Search History */}
      {(() => {
        // console.log('📋 NON-COMPACT RENDER: Checking searchHistory for display...', {
        //   isArray: Array.isArray(searchHistory),
        //   length: searchHistory.length,
        //   content: searchHistory,
        //   firstItem: searchHistory[0]
        // });
        const shouldShow = Array.isArray(searchHistory) && searchHistory.length > 0;
        // console.log('📋 NON-COMPACT RENDER: Should show search history?', shouldShow);
        return shouldShow;
      })() && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('app.search.recentSearches')}</span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
              {(Array.isArray(searchHistory) ? searchHistory : []).map((history, index) => {
                // console.log(`📋 NON-COMPACT RENDER: Mapping history item ${index}:`, history);
                return (
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
                  title={t('app.search.removeFromHistory')}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
                );
              })}
            
            {/* Three dots link to top search page */}
            <button
              onClick={() => navigate('/top-search')}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors text-primary hover:text-primary border border-primary/20 hover:border-primary/40"
              title={t('app.topSearch.viewMore')}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {/* AI recommendation icon button */}
            <button
              onClick={() => setAiDialogOpen(true)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors text-primary hover:text-primary border border-primary/20 hover:border-primary/40"
              title="Get AI Song Recommendations"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* AI Recommendation Prompt - Non-compact Mode */}
      {shouldShowAIPrompt && searchHistory.length >= 3 && (
        <div className="mt-3 p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium mb-3">
                ✨ Want AI to recommend songs based on your searches?
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleAIRecommendationYes}
                  className="bg-primary hover:bg-primary/90"
                >
                  Yes, Show Me!
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleAIRecommendationLater}
                >
                  Maybe Later
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Recommendation Dialog - Non-compact Mode */}
      <AIRecommendationDialog
        isOpen={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        searchHistory={searchHistory.map(h => h.query)}
        onAddToQueue={async (title, artist) => {
          if (onSearchAndAdd) {
            // Search for the song and add to queue automatically
            await onSearchAndAdd(title, artist);
            // Dialog stays open for users to add more songs
          } else {
            // Fallback: just search for the song
            onSearch(`${title} ${artist}`, "all");
            // Dialog stays open for users to add more songs
          }
        }}
      />
    </div>
  );
};