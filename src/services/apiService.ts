import axios from 'axios';
import type { Song } from '@/components/SongCard';
import { searchSongs } from '@/data/mockSongs';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface SavedQueue {
  id: number;
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

// YouTube Search API
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

  // Handle pagination for APIs that don't support it natively
  if (pageToken && pageToken.startsWith('fake-token')) {
    console.log('🎭 Using mock data for pagination since API doesn\'t support it');
    const mockResults = searchSongs(query, gender, maxResults, pageToken);
    console.log('📤 Mock pagination result:', { songsCount: mockResults.songs.length, hasNext: !!mockResults.nextPageToken });
    return mockResults;
  }

  try {
    console.log('📡 Attempting API call to:', `${API_BASE_URL}/youtube.php`);
    
    const response = await axios.get<{ songs: Song[]; nextPageToken?: string }>(`${API_BASE_URL}/youtube.php`, {
      params: {
        q: query,
        gender,
        maxResults,
        pageToken,
      },
    });

    console.log('✅ API response received:', {
      status: response.status,
      dataType: typeof response.data,
      rawData: response.data,
      dataKeys: Object.keys(response.data || {}),
      songsCount: Array.isArray(response.data.songs) ? response.data.songs.length : 'not array',
      hasNextPageToken: !!response.data.nextPageToken
    });

    // Ensure we always return the expected format
    const data = response.data;
    let songs: Song[] = [];
    let nextPageToken: string | undefined = undefined;
    
    // Handle different response formats from PHP API
    if (Array.isArray(data)) {
      // Direct array response
      songs = data;
    } else if (data && Array.isArray(data.songs)) {
      // Wrapped in songs property
      songs = data.songs;
      nextPageToken = data.nextPageToken;
    } else if (data && typeof data === 'object') {
      // Check if data has song properties
      songs = Object.values(data).filter((item: any) => 
        item && typeof item === 'object' && item.id && item.title
      ) as Song[];
      nextPageToken = data.nextPageToken;
    }
    
    const result = {
      songs,
      nextPageToken,
    };
    
    console.log('📤 API result:', { songsCount: result.songs.length, hasNext: !!result.nextPageToken });
    
    // If API doesn't support pagination but we have results, add fake pagination for testing
    if (songs.length > 0 && !nextPageToken && !pageToken) {
      console.log('🔧 Adding fake pagination since API returned results but no nextPageToken');
      result.nextPageToken = 'fake-token-page-2'; // Add fake token for testing
    }
    
    return result;
  } catch (error) {
    console.error('❌ YouTube Search API Error, falling back to mock data:', error);
    console.log('🎭 Using mock data instead');
    
    // Fallback to mock data when API is not available
    const mockResults = searchSongs(query, gender, maxResults, pageToken);
    console.log('📤 Mock result:', { songsCount: mockResults.songs.length, hasNext: !!mockResults.nextPageToken });
    return mockResults;
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