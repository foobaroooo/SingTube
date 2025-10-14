import axios from 'axios';
import type { Song } from '@/components/SongCard';
import { searchSongs } from '@/data/mockSongs';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface SavedQueue {
  id: number;
  guid: string;
  name: string;
  songs: Song[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchHistory {
  id: number;
  query: string;
  gender: string;
  searchCount: number;
  lastSearched: string;
}

// YouTube Data API v3 Response Types
interface YouTubeSearchResult {
  kind: string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeVideoItem[];
}

interface YouTubeVideoItem {
  kind: string;
  etag: string;
  id: {
    kind: string;
    videoId: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
    channelTitle: string;
    liveBroadcastContent: string;
    publishTime: string;
  };
}

interface YouTubeVideoDetails {
  kind: string;
  etag: string;
  items: Array<{
    kind: string;
    etag: string;
    id: string;
    contentDetails: {
      duration: string;
    };
  }>;
}

// Helper function to parse YouTube duration (PT4M13S -> 4:13)
const parseYouTubeDuration = (duration: string): string => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Helper function to build search query with gender filtering
const buildSearchQuery = (query: string, gender: string): string => {
  let searchTerms = [query];
  
  // Add karaoke-related terms to improve results
  const karaokeTerms = ['karaoke', '伴奏', 'instrumental', 'backing track'];
  const hasKaraokeTerms = karaokeTerms.some(term => 
    query.toLowerCase().includes(term) || query.includes(term)
  );
  
  if (!hasKaraokeTerms) {
    searchTerms.push('karaoke OR 伴奏 OR instrumental');
  }
  
  // Add gender filtering
  if (gender === 'male') {
    searchTerms.push('男声 OR male OR 男版');
  } else if (gender === 'female') {
    searchTerms.push('女声 OR female OR 女版');
  }
  
  return searchTerms.join(' ');
};

// Convert YouTube API response to Song format
const convertYouTubeItemToSong = (item: YouTubeVideoItem, duration: string = '0:00'): Song => {
  return {
    id: item.id.videoId,
    title: item.snippet.title,
    artist: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
    duration,
    youtubeId: item.id.videoId,
  };
};

// YouTube Search API with conditional mock fallback
export const searchYouTubeVideos = async (
  query: string,
  gender: string = 'all',
  maxResults: number = 25,
  pageToken?: string
): Promise<{ songs: Song[]; nextPageToken?: string }> => {
  console.log('🔍 searchYouTubeVideos called with:', { query, gender, maxResults, pageToken });
  
  if (!query.trim()) {
    return { songs: [] };
  }

  // Check if we're on production domain - use real YouTube API
  const isProduction = window.location.hostname === 'singtube.app';
  
  if (isProduction && YOUTUBE_API_KEY) {
    console.log('🌐 Using real YouTube API (production domain)');
    
    try {
      const searchQuery = buildSearchQuery(query, gender);
      console.log('📡 Searching YouTube with query:', searchQuery);
      
      // Search for videos
      const searchParams = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        q: searchQuery,
        maxResults: maxResults.toString(),
        order: 'relevance',
        videoDuration: 'any',
        videoEmbeddable: 'true',
        key: YOUTUBE_API_KEY,
      });

      if (pageToken) {
        searchParams.append('pageToken', pageToken);
      }

      const searchResponse = await axios.get<YouTubeSearchResult>(
        `${YOUTUBE_API_BASE}/search?${searchParams.toString()}`
      );

      console.log('✅ YouTube search response received:', {
        status: searchResponse.status,
        itemsCount: searchResponse.data.items?.length || 0,
        hasNextPageToken: !!searchResponse.data.nextPageToken
      });

      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        return { songs: [], nextPageToken: undefined };
      }

      // Get video IDs for duration lookup
      const videoIds = searchResponse.data.items.map(item => item.id.videoId);
      
      // Fetch video details for durations
      const detailsParams = new URLSearchParams({
        part: 'contentDetails',
        id: videoIds.join(','),
        key: YOUTUBE_API_KEY,
      });

      const detailsResponse = await axios.get<YouTubeVideoDetails>(
        `${YOUTUBE_API_BASE}/videos?${detailsParams.toString()}`
      );

      console.log('✅ YouTube details response received:', {
        status: detailsResponse.status,
        itemsCount: detailsResponse.data.items?.length || 0
      });

      // Create a map of video ID to duration
      const durationMap = new Map<string, string>();
      if (detailsResponse.data.items) {
        detailsResponse.data.items.forEach(item => {
          durationMap.set(item.id, parseYouTubeDuration(item.contentDetails.duration));
        });
      }

      // Convert to Song format
      const songs: Song[] = searchResponse.data.items.map(item => 
        convertYouTubeItemToSong(item, durationMap.get(item.id.videoId) || '0:00')
      );

      const result = {
        songs,
        nextPageToken: searchResponse.data.nextPageToken,
      };
      
      console.log('📤 Final YouTube API result:', { songsCount: result.songs.length, hasNext: !!result.nextPageToken });
      return result;
      
    } catch (error) {
      console.error('❌ YouTube Search API Error:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 403) {
          throw new Error('YouTube API quota exceeded or invalid API key. Please check your API key and quota limits.');
        } else if (status === 400) {
          throw new Error(`Invalid search request: ${data.error?.message || 'Bad request'}`);
        } else {
          throw new Error(`YouTube API error (${status}): ${data.error?.message || 'Unknown error'}`);
        }
      }
      
      throw new Error('Failed to connect to YouTube API. Please check your internet connection.');
    }
  } else {
    // Use mock data for development/testing
    console.log('🧪 Using mock data (development/local environment)');
    
    // Simulate API delay for realistic UX
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const result = searchSongs(query, gender, maxResults, pageToken);
      
      console.log('✅ Mock search response:', {
        query,
        gender,
        maxResults,
        pageToken,
        songsCount: result.songs.length,
        hasNext: !!result.nextPageToken
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Mock Search Error:', error);
      throw new Error('Search temporarily unavailable. Please try again.');
    }
  }
};

// Queue Management API
export const saveQueue = async (name: string, songs: Song[]): Promise<boolean> => {
  try {
    await axios.post(`${API_BASE_URL}/queues.php`, {
      name,
      songs,
    });
    return true;
  } catch (error) {
    console.error('Save queue error:', error);
    return false;
  }
};

export const updateQueue = async (id: number, name: string, songs: Song[]): Promise<boolean> => {
  try {
    await axios.put(`${API_BASE_URL}/queues.php`, {
      id,
      name,
      songs,
    });
    return true;
  } catch (error) {
    console.error('Update queue error:', error);
    return false;
  }
};

export const getSavedQueues = async (): Promise<SavedQueue[]> => {
  try {
    const response = await axios.get<SavedQueue[]>(`${API_BASE_URL}/queues.php`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Get saved queues error:', error);
    return [];
  }
};

export const getSharedQueue = async (guid: string): Promise<SavedQueue | null> => {
  try {
    const response = await axios.get<SavedQueue>(`${API_BASE_URL}/queues.php?guid=${guid}`);
    return response.data;
  } catch (error) {
    console.error('Get shared queue error:', error);
    return null;
  }
};

export const deleteQueue = async (id: number): Promise<boolean> => {
  try {
    await axios.delete(`${API_BASE_URL}/queues.php?id=${id}`);
    return true;
  } catch (error) {
    console.error('Delete queue error:', error);
    return false;
  }
};

// Search History API
export const saveSearchHistory = async (query: string, gender: string = 'all'): Promise<boolean> => {
  try {
    await axios.post(`${API_BASE_URL}/history.php`, {
      query,
      gender,
    });
    return true;
  } catch (error) {
    console.error('Save search history error:', error);
    return false;
  }
};

export const getSearchHistory = async (): Promise<SearchHistory[]> => {
  try {
    const response = await axios.get<SearchHistory[]>(`${API_BASE_URL}/history.php`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Get search history error:', error);
    return [];
  }
};

export const deleteSearchHistory = async (id: number): Promise<boolean> => {
  try {
    await axios.delete(`${API_BASE_URL}/history.php`, {
      data: { id }
    });
    return true;
  } catch (error) {
    console.error('Delete search history error:', error);
    return false;
  }
};

// Analytics API
export const trackSearch = async (query: string, gender: string = 'all'): Promise<boolean> => {
  // Import deduplication utility dynamically to avoid circular imports
  const { shouldTrackSearch } = await import('@/utils/trackingUtils');
  
  // Check if we should track this search (prevents React double-mount duplicates)
  if (!shouldTrackSearch(query, gender)) {
    return true; // Return true since it's not an error, just a duplicate
  }

  try {
    await axios.post(`${API_BASE_URL}/analytics.php?action=track_search`, {
      query,
      gender,
    });
    return true;
  } catch (error) {
    console.error('Track search error:', error);
    return false;
  }
};

export const trackSongPlay = async (song: Song): Promise<boolean> => {
  // Import deduplication utility dynamically to avoid circular imports
  const { shouldTrackSongPlay } = await import('@/utils/trackingUtils');
  
  // Check if we should track this song play (prevents React double-mount duplicates)
  if (!shouldTrackSongPlay(song)) {
    return true; // Return true since it's not an error, just a duplicate
  }

  try {
    await axios.post(`${API_BASE_URL}/analytics.php?action=track_play`, {
      youtube_id: song.id,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      thumbnail: song.thumbnail,
    });
    return true;
  } catch (error) {
    console.error('Track song play error:', error);
    return false;
  }
};

export interface TopSong {
  youtubeId: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
  playCount: number;
  firstPlayed: string;
  lastPlayed: string;
}

export interface TopKeyword {
  query: string;
  gender: string;
  searchCount: number;
  lastSearched: string;
}

export const getTopSongs = async (period: 'week' | 'month' | 'all' = 'week', limit: number = 100): Promise<TopSong[]> => {
  try {
    const response = await axios.get<TopSong[]>(`${API_BASE_URL}/analytics.php?type=top_songs&period=${period}&limit=${limit}`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Get top songs error:', error);
    return [];
  }
};

export const getTopKeywords = async (period: 'week' | 'month' | 'all' = 'week', limit: number = 100): Promise<TopKeyword[]> => {
  try {
    const response = await axios.get<TopKeyword[]>(`${API_BASE_URL}/analytics.php?type=top_keywords&period=${period}&limit=${limit}`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Get top keywords error:', error);
    return [];
  }
};

// Get search history from analytics (replaces the old getSearchHistory)
export const getSearchHistoryFromAnalytics = async (limit: number = 50): Promise<SearchHistory[]> => {
  try {
    const response = await axios.get<TopKeyword[]>(`${API_BASE_URL}/analytics.php?type=top_keywords&period=all&limit=${limit}`);
    
    if (!response.data || !Array.isArray(response.data)) {
      console.error('Invalid response data format:', response.data);
      return [];
    }
    
    // Convert TopKeyword format to SearchHistory format for compatibility
    const searchHistory: SearchHistory[] = response.data.map((keyword) => ({
      id: `${keyword.query}-${keyword.gender}`, // Create a unique ID
      query: keyword.query,
      gender: keyword.gender,
      searchCount: keyword.searchCount,
      lastSearched: keyword.lastSearched
    }));
    
    // Sort by lastSearched date in descending order (most recent first)
    const sortedHistory = searchHistory.sort((a, b) => {
      const dateA = new Date(a.lastSearched);
      const dateB = new Date(b.lastSearched);
      return dateB.getTime() - dateA.getTime();
    });
    
    return sortedHistory;
  } catch (error) {
    console.error('📡 Get search history from analytics error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (axios.isAxiosError(error)) {
      console.error('📡 Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
    }
    
    return [];
  }
};

// Fallback to localStorage for offline functionality
export const saveCurrentQueue = (songs: Song[], currentIndex: number = -1, queueName: string = ""): boolean => {
  try {
    const queueData = {
      songs,
      currentIndex,
      queueName,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('singtube_current_queue', JSON.stringify(queueData));
    return true;
  } catch (error) {
    console.error('Error saving current queue:', error);
    return false;
  }
};

export const loadCurrentQueue = (): { songs: Song[]; currentIndex: number; queueName: string } => {
  try {
    const data = localStorage.getItem('singtube_current_queue');
    if (data) {
      const parsed = JSON.parse(data);
      return {
        songs: parsed.songs || [],
        currentIndex: parsed.currentIndex || -1,
        queueName: parsed.queueName || "",
      };
    }
  } catch (error) {
    console.error('Error loading current queue:', error);
  }
  
  return { songs: [], currentIndex: -1, queueName: "" };
};