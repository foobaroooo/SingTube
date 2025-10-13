import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getTopKeywords, TopKeyword } from "@/services/apiService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, Search } from "lucide-react";

const TopSearch = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [keywords, setKeywords] = useState<TopKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    const fetchTopKeywords = async () => {
      setLoading(true);
      try {
        const data = await getTopKeywords(period, 200); // Get more keywords for better cloud
        setKeywords(data);
      } catch (error) {
        console.error('Failed to fetch top keywords:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopKeywords();
  }, [period]);

  const handleKeywordClick = (keyword: string, gender: string) => {
    // Navigate back to main page and trigger search
    navigate(`/?search=${encodeURIComponent(keyword)}&gender=${gender}`);
  };

  const getKeywordSize = (searchCount: number, maxCount: number, minCount: number) => {
    // Calculate font size between 12px and 48px based on search count
    const minSize = 12;
    const maxSize = 48;
    const range = maxSize - minSize;
    const normalizedCount = (searchCount - minCount) / (maxCount - minCount);
    return Math.round(minSize + (range * normalizedCount));
  };

  const getKeywordColor = (searchCount: number, maxCount: number, minCount: number) => {
    // Return color intensity based on popularity
    const normalizedCount = (searchCount - minCount) / (maxCount - minCount);
    if (normalizedCount > 0.8) return "text-red-500";
    if (normalizedCount > 0.6) return "text-orange-500";
    if (normalizedCount > 0.4) return "text-yellow-500";
    if (normalizedCount > 0.2) return "text-blue-500";
    return "text-gray-500";
  };

  const maxCount = Math.max(...keywords.map(k => k.searchCount));
  const minCount = Math.min(...keywords.map(k => k.searchCount));

  // Group keywords by gender for better organization
  const groupedKeywords = keywords.reduce((acc, keyword) => {
    if (!acc[keyword.gender]) {
      acc[keyword.gender] = [];
    }
    acc[keyword.gender].push(keyword);
    return acc;
  }, {} as Record<string, TopKeyword[]>);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate('/')}
                className="flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {t('app.topSearch.title')}
                </h1>
              </div>
            </div>
            
            {/* Period selector */}
            <div className="flex bg-muted rounded-full p-1">
              {(['week', 'month', 'all'] as const).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPeriod(p)}
                  className={`rounded-full px-4 py-2 transition-all text-sm ${
                    period === p 
                      ? 'bg-gradient-primary text-white shadow-md' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(`app.topSearch.periods.${p}`)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('app.topSearch.loading')}</p>
          </div>
        ) : keywords.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('app.topSearch.noData')}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-2xl font-bold text-primary">{keywords.length}</div>
                <div className="text-sm text-muted-foreground">{t('app.topSearch.stats.totalKeywords')}</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-2xl font-bold text-primary">{keywords.reduce((sum, k) => sum + k.searchCount, 0)}</div>
                <div className="text-sm text-muted-foreground">{t('app.topSearch.stats.totalSearches')}</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-2xl font-bold text-primary">{keywords[0]?.searchCount || 0}</div>
                <div className="text-sm text-muted-foreground">{t('app.topSearch.stats.topKeywordCount')}</div>
              </div>
            </div>

            {/* Keyword Cloud */}
            {Object.entries(groupedKeywords).map(([gender, genderKeywords]) => (
              <div key={gender} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{t(`app.search.gender.${gender}`)}</h2>
                  <Badge variant="secondary">{genderKeywords.length} keywords</Badge>
                </div>
                
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex flex-wrap gap-3 justify-center items-center min-h-[200px]">
                    {genderKeywords.map((keyword, index) => {
                      const fontSize = getKeywordSize(keyword.searchCount, maxCount, minCount);
                      const color = getKeywordColor(keyword.searchCount, maxCount, minCount);
                      
                      return (
                        <button
                          key={`${keyword.query}-${keyword.gender}-${index}`}
                          onClick={() => handleKeywordClick(keyword.query, keyword.gender)}
                          className={`${color} hover:text-primary transition-colors font-medium cursor-pointer hover:scale-110 transform transition-transform`}
                          style={{ fontSize: `${fontSize}px` }}
                          title={`${keyword.query} (${keyword.searchCount} searches)`}
                        >
                          {keyword.query}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Top Keywords List */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">{t('app.topSearch.topList')}</h2>
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
                  {keywords.slice(0, 30).map((keyword, index) => (
                    <button
                      key={`${keyword.query}-${keyword.gender}-list-${index}`}
                      onClick={() => handleKeywordClick(keyword.query, keyword.gender)}
                      className="p-4 border-b border-r border-border hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                          <span className="font-medium">{keyword.query}</span>
                          <Badge variant="outline" className="text-xs">
                            {t(`app.search.gender.${keyword.gender}`)}
                          </Badge>
                        </div>
                        <span className="text-sm font-bold text-primary">{keyword.searchCount}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopSearch;