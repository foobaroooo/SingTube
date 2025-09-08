import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Mic, Clock, Loader2 } from "lucide-react";
import { getSearchHistory, type SearchHistory } from "@/services/apiService";

interface SearchSectionProps {
  onSearch: (query: string, gender: string) => void;
  isLoading?: boolean;
}

export const SearchSection = ({ onSearch, isLoading = false }: SearchSectionProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await getSearchHistory();
        setSearchHistory(history.slice(0, 5)); // Show only last 5 searches
      } catch (error) {
        console.error('Failed to load search history:', error);
      }
    };
    
    loadHistory();
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery, genderFilter);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleHistoryClick = (historyQuery: string, historyGender: string) => {
    setSearchQuery(historyQuery);
    setGenderFilter(historyGender);
    onSearch(historyQuery, historyGender);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card">
      <div className="flex items-center gap-4 mb-4">
        <Mic className="w-8 h-8 text-primary" />
        <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Search Karaoke Songs
        </h2>
      </div>
      
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search for songs, artists... (e.g. 邓丽君, 周杰伦)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="text-lg py-3 bg-input border-border focus:ring-2 focus:ring-primary transition-smooth"
          />
        </div>
        
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-40 bg-input border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">All Versions</SelectItem>
            <SelectItem value="male">Male (男声版)</SelectItem>
            <SelectItem value="female">Female (女声版)</SelectItem>
          </SelectContent>
        </Select>
        
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
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Recent Searches</span>
          </div>
          <div className="flex flex-wrap gap-2">
              {(Array.isArray(searchHistory) ? searchHistory : []).map((history) => (
              <Badge
                key={`${history.query}-${history.gender}`}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => handleHistoryClick(history.query, history.gender)}
              >
                {history.query}
                {history.gender !== 'all' && (
                  <span className="ml-1 text-xs opacity-70">
                    ({history.gender === 'male' ? '男' : '女'})
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};