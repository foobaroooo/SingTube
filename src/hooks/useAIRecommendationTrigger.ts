import { useState, useEffect } from 'react';

interface UseAIRecommendationTriggerProps {
  searchCount: number;
  roomGuid?: string;
}

interface UseAIRecommendationTriggerReturn {
  shouldShow: boolean;
  dismiss: () => void;
  reset: () => void;
}

const BROWSING_TIME_THRESHOLD = 30000; // 30 seconds in milliseconds
const STORAGE_KEY_PREFIX = 'ai_rec_dismissed_';
const TIMING_KEY = 'search_timing_start';

/**
 * Custom hook to determine when to show AI recommendation prompt
 *
 * Trigger conditions:
 * - User has 3+ searches, OR
 * - User has 2 searches + spent 30+ seconds browsing, OR
 * - User has 1 search + came back to search again (detected by time gap)
 *
 * @param searchCount Current number of searches performed
 * @param roomGuid Optional room identifier for session-specific dismissal
 * @returns shouldShow boolean and dismiss function
 */
export function useAIRecommendationTrigger({
  searchCount,
  roomGuid,
}: UseAIRecommendationTriggerProps): UseAIRecommendationTriggerReturn {
  const [shouldShow, setShouldShow] = useState(false);
  const [browsingStartTime] = useState(Date.now());
  const [browsingDuration, setBrowsingDuration] = useState(0);

  // Get storage key with room-specific namespace
  const getStorageKey = () => {
    return `${STORAGE_KEY_PREFIX}${roomGuid || 'default'}`;
  };

  // Check if user has dismissed the prompt this session
  const isDismissed = (): boolean => {
    const dismissed = localStorage.getItem(getStorageKey());
    return dismissed === 'true';
  };

  // Track browsing duration with interval
  useEffect(() => {
    const timer = setInterval(() => {
      setBrowsingDuration(Date.now() - browsingStartTime);
    }, 5000); // Update every 5 seconds

    return () => clearInterval(timer);
  }, [browsingStartTime]);

  // Get or set timing start for detecting return visits
  const getTimingStart = (): number | null => {
    const stored = localStorage.getItem(TIMING_KEY);
    if (!stored) {
      localStorage.setItem(TIMING_KEY, Date.now().toString());
      return null;
    }
    return parseInt(stored);
  };

  // Check if user came back after leaving (time gap > 5 minutes)
  const hasReturnedToSearch = (): boolean => {
    const startTime = getTimingStart();
    if (!startTime) return false;

    const timeGap = Date.now() - startTime;
    return timeGap > 300000; // 5 minutes
  };

  // Evaluate trigger conditions
  useEffect(() => {
    // Don't show if already dismissed
    if (isDismissed()) {
      setShouldShow(false);
      return;
    }

    // Condition 1: 3+ searches
    if (searchCount >= 3) {
      setShouldShow(true);
      return;
    }

    // Condition 2: 2 searches + 30+ seconds browsing
    if (searchCount >= 2 && browsingDuration >= BROWSING_TIME_THRESHOLD) {
      setShouldShow(true);
      return;
    }

    // Condition 3: 1 search + user returned to search again
    if (searchCount >= 1 && hasReturnedToSearch()) {
      setShouldShow(true);
      return;
    }

    setShouldShow(false);
  }, [searchCount, browsingDuration]);

  // Dismiss function - stores flag in localStorage
  const dismiss = () => {
    localStorage.setItem(getStorageKey(), 'true');
    setShouldShow(false);
  };

  // Reset function - clears dismissal flag (useful for testing)
  const reset = () => {
    localStorage.removeItem(getStorageKey());
    localStorage.removeItem(TIMING_KEY);
    setShouldShow(false);
  };

  return {
    shouldShow,
    dismiss,
    reset,
  };
}
