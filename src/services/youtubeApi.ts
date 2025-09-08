import axios from 'axios';
import type { Song } from '@/components/SongCard';

// Use local PHP API instead of direct YouTube API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export interface YouTubeVideo {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      medium: {
        url: string;
      };
    };
    publishedAt: string;
  };
  contentDetails?: {
    duration: string;
  };
}

export interface YouTubeSearchResponse {
  items: YouTubeVideo[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

// Convert ISO 8601 duration to readable format (PT4M13S -> 4:13)
const formatDuration = (duration: string): string => {
  const match = duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  
  const minutes = parseInt(match[1] || '0');
  const seconds = parseInt(match[2] || '0');
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Enhanced search terms for Chinese karaoke content
const buildKaraokeQuery = (query: string, gender: string = 'all'): string => {
  // Base karaoke keywords in Chinese and English
  const karaokeTerms = [
    '伴奏', '卡拉OK', 'karaoke', 'instrumental', 
    '纯音乐', '纯伴奏', 'backing track'
  ];
  
  let searchQuery = query;
  
  // Add gender-specific terms
  if (gender === 'male') {
    searchQuery += ' 男声版 男生版 male version';
  } else if (gender === 'female') {
    searchQuery += ' 女声版 女生版 female version';
  }
  
  // Add one karaoke term to improve results
  searchQuery += ` ${karaokeTerms[0]}`;
  
  return searchQuery;
};

export const searchYouTubeVideos = async (
  query: string, 
  gender: string = 'all',
  maxResults: number = 25
): Promise<Song[]> => {
  if (!query.trim()) {
    return [];
  }

  try {
    const response = await axios.get<Song[]>(`${API_BASE_URL}/search`, {
      params: {
        q: query,
        gender,
        maxResults,
      },
    });

    return response.data;
  } catch (error) {
    console.error('YouTube Search API Error:', error);
    throw error;
  }
};

export const getVideoDetails = async (videoId: string) => {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key is not configured');
  }

  try {
    const response = await axios.get(
      `${YOUTUBE_API_BASE_URL}/videos`,
      {
        params: {
          key: YOUTUBE_API_KEY,
          id: videoId,
          part: 'snippet,contentDetails,statistics',
        },
      }
    );

    return response.data.items[0];
  } catch (error) {
    console.error('Error fetching video details:', error);
    throw error;
  }
};