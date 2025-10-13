// Utility for preventing duplicate tracking calls in React development mode
import { debugLog } from './environment';

interface TrackingCall {
  type: 'search' | 'songPlay';
  key: string;
  timestamp: number;
}

class TrackingDeduplicator {
  private recentCalls: Map<string, number> = new Map();
  private readonly DEDUP_WINDOW = 1000; // 1 second window to prevent duplicates

  private generateKey(type: 'search' | 'songPlay', data: { query?: string; gender?: string; id?: string }): string {
    if (type === 'search') {
      return `search:${data.query}:${data.gender}`;
    } else if (type === 'songPlay') {
      return `play:${data.id}`;
    }
    return '';
  }

  public shouldTrack(type: 'search' | 'songPlay', data: { query?: string; gender?: string; id?: string }): boolean {
    const key = this.generateKey(type, data);
    const now = Date.now();
    const lastCall = this.recentCalls.get(key);

    // If no previous call or enough time has passed, allow tracking
    if (!lastCall || (now - lastCall) > this.DEDUP_WINDOW) {
      this.recentCalls.set(key, now);
      debugLog(`Allowing ${type} tracking:`, key);
      
      // Clean up old entries to prevent memory leaks
      this.cleanup(now);
      
      return true;
    }

    // Duplicate call within dedup window, skip tracking
    debugLog(`Skipping duplicate ${type} tracking for:`, key, `(${now - lastCall}ms ago)`);
    return false;
  }

  private cleanup(now: number): void {
    // Remove entries older than 5 minutes to prevent memory leaks
    const CLEANUP_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    
    for (const [key, timestamp] of this.recentCalls.entries()) {
      if (now - timestamp > CLEANUP_THRESHOLD) {
        this.recentCalls.delete(key);
      }
    }
  }

  public reset(): void {
    this.recentCalls.clear();
  }
}

// Global instance for the app
export const trackingDeduplicator = new TrackingDeduplicator();

// Helper functions for easy use
export const shouldTrackSearch = (query: string, gender: string): boolean => {
  return trackingDeduplicator.shouldTrack('search', { query, gender });
};

export const shouldTrackSongPlay = (song: { id: string }): boolean => {
  return trackingDeduplicator.shouldTrack('songPlay', song);
};