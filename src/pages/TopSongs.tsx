import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getTopSongs, TopSong } from "@/services/apiService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, Music, Play, ExternalLink } from "lucide-react";

const TopSongs = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [songs, setSongs] = useState<TopSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    const fetchTopSongs = async () => {
      setLoading(true);
      try {
        const data = await getTopSongs(period, 100); // Get top 100 songs
        setSongs(data);
      } catch (error) {
        console.error('Failed to fetch top songs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopSongs();
  }, [period]);

  const handleSongClick = (song: TopSong) => {
    // Open YouTube video in new tab
    window.open(`https://www.youtube.com/watch?v=${song.youtubeId}`, '_blank');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const getRankingBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500 text-white"; // Gold
    if (rank === 2) return "bg-gray-400 text-white";   // Silver
    if (rank === 3) return "bg-amber-600 text-white";  // Bronze
    if (rank <= 10) return "bg-primary text-white";    // Top 10
    return "bg-muted text-muted-foreground";           // Others
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'week': return t('app.topSongs.thisWeek');
      case 'month': return t('app.topSongs.thisMonth');
      case 'all': return t('app.topSongs.allTime');
      default: return '';
    }
  };

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
                  {t('app.topSongs.title')}
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
                  {t(`app.topSongs.periods.${p}`)}
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
            <p className="text-muted-foreground">{t('app.topSongs.loading')}</p>
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('app.topSongs.noData')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header with period and stats */}
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">
                {getPeriodLabel()} - {t('app.topSongs.topSongsTitle')}
              </h2>
              <p className="text-muted-foreground">
                {t('app.topSongs.totalSongs', { count: songs.length })}
              </p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary">{songs.length}</div>
                <div className="text-sm text-muted-foreground">{t('app.topSongs.stats.totalSongs')}</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {songs.reduce((sum, song) => sum + song.playCount, 0)}
                </div>
                <div className="text-sm text-muted-foreground">{t('app.topSongs.stats.totalPlays')}</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {songs[0]?.playCount || 0}
                </div>
                <div className="text-sm text-muted-foreground">{t('app.topSongs.stats.topSongPlays')}</div>
              </div>
            </div>

            {/* Top 3 Podium */}
            {songs.length >= 3 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-center">{t('app.topSongs.podium')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {songs.slice(0, 3).map((song, index) => {
                    const rank = index + 1;
                    return (
                      <div
                        key={song.youtubeId}
                        className={`bg-card border rounded-lg p-6 text-center cursor-pointer hover:shadow-lg transition-all ${
                          rank === 1 ? 'md:order-2 border-yellow-500 bg-yellow-50/50' :
                          rank === 2 ? 'md:order-1 border-gray-400 bg-gray-50/50' :
                          'md:order-3 border-amber-600 bg-amber-50/50'
                        }`}
                        onClick={() => handleSongClick(song)}
                      >
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${getRankingBadgeColor(rank)}`}>
                          <span className="text-lg font-bold">#{rank}</span>
                        </div>
                        <img
                          src={song.thumbnail}
                          alt={song.title}
                          className="w-20 h-20 mx-auto rounded-lg mb-3 object-cover"
                        />
                        <h4 className="font-semibold text-sm mb-1 line-clamp-2">{song.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{song.artist}</p>
                        <div className="flex items-center justify-center gap-1 text-primary">
                          <Play className="w-3 h-3" />
                          <span className="text-sm font-bold">{song.playCount}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Full Rankings Table */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">{t('app.topSongs.fullRankings')}</h3>
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="space-y-0">
                  {songs.map((song, index) => {
                    const rank = index + 1;
                    return (
                      <div
                        key={`${song.youtubeId}-${rank}`}
                        className="flex items-center gap-4 p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleSongClick(song)}
                      >
                        {/* Rank */}
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getRankingBadgeColor(rank)}`}>
                          {rank}
                        </div>

                        {/* Thumbnail */}
                        <img
                          src={song.thumbnail}
                          alt={song.title}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />

                        {/* Song Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1 truncate">{song.title}</h4>
                          <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                          <p className="text-xs text-muted-foreground">
                            {song.duration} • First played: {formatDate(song.firstPlayed)}
                          </p>
                        </div>

                        {/* Play Count */}
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-1 text-primary mb-1">
                            <Play className="w-4 h-4" />
                            <span className="font-bold">{song.playCount}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Last: {formatDate(song.lastPlayed)}
                          </p>
                        </div>

                        {/* External Link */}
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-8 h-8 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSongClick(song);
                          }}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopSongs;