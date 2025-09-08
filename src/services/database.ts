import type { Song } from '@/components/SongCard';

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

export const initDatabase = () => {
  // Browser-only storage using localStorage
  console.log('Using localStorage for browser persistence');
  return true;
};

// Browser-compatible storage functions using localStorage
export const saveQueueToBrowser = (name: string, songs: Song[]): boolean => {
  try {
    const savedQueues = JSON.parse(localStorage.getItem('singtube_saved_queues') || '[]');
    const newQueue = {
      id: Date.now(),
      name,
      songs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    savedQueues.push(newQueue);
    localStorage.setItem('singtube_saved_queues', JSON.stringify(savedQueues));
    return true;
  } catch (error) {
    console.error('Error saving queue to browser:', error);
    return false;
  }
};

export const getSavedQueuesFromBrowser = (): SavedQueue[] => {
  try {
    return JSON.parse(localStorage.getItem('singtube_saved_queues') || '[]');
  } catch (error) {
    console.error('Error loading saved queues:', error);
    return [];
  }
};

export const deleteQueueFromBrowser = (id: number): boolean => {
  try {
    const savedQueues = JSON.parse(localStorage.getItem('singtube_saved_queues') || '[]');
    const filtered = savedQueues.filter((queue: SavedQueue) => queue.id !== id);
    localStorage.setItem('singtube_saved_queues', JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting queue:', error);
    return false;
  }
};

export const saveSearchHistory = (query: string, gender: string = 'all'): boolean => {
  try {
    const history = JSON.parse(localStorage.getItem('singtube_search_history') || '[]');
    const existingIndex = history.findIndex((h: SearchHistory) => h.query === query && h.gender === gender);
    
    if (existingIndex >= 0) {
      history[existingIndex].searchCount++;
      history[existingIndex].lastSearched = new Date().toISOString();
    } else {
      history.push({
        id: Date.now(),
        query,
        gender,
        searchCount: 1,
        lastSearched: new Date().toISOString(),
      });
    }
    
    // Keep only last 50 searches
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    localStorage.setItem('singtube_search_history', JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Error saving search history:', error);
    return false;
  }
};

export const getSearchHistory = (): SearchHistory[] => {
  try {
    const history = JSON.parse(localStorage.getItem('singtube_search_history') || '[]');
    return history.sort((a: SearchHistory, b: SearchHistory) => 
      new Date(b.lastSearched).getTime() - new Date(a.lastSearched).getTime()
    );
  } catch (error) {
    console.error('Error loading search history:', error);
    return [];
  }
};

export const saveCurrentQueue = (songs: Song[], currentIndex: number = -1): boolean => {
  try {
    const queueData = {
      songs,
      currentIndex,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('singtube_current_queue', JSON.stringify(queueData));
    return true;
  } catch (error) {
    console.error('Error saving current queue:', error);
    return false;
  }
};

export const loadCurrentQueue = (): { songs: Song[]; currentIndex: number } => {
  try {
    const data = localStorage.getItem('singtube_current_queue');
    if (data) {
      const parsed = JSON.parse(data);
      return {
        songs: parsed.songs || [],
        currentIndex: parsed.currentIndex || -1,
      };
    }
  } catch (error) {
    console.error('Error loading current queue:', error);
  }
  
  return { songs: [], currentIndex: -1 };
};

// Main exports - use browser storage for now, PHP backend will handle server-side persistence
export const saveQueue = saveQueueToBrowser;
export const getSavedQueues = getSavedQueuesFromBrowser;

// Initialize database when module loads
initDatabase();