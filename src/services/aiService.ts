export interface SongRecommendation {
  title: string;
  artist: string;
}

/**
 * Get AI-powered song recommendations based on search history
 * Calls the secure backend API endpoint instead of OpenAI directly
 * @param searchHistory Array of song titles/artists the user has searched for
 * @param count Number of recommendations to return (default: 5)
 * @returns Promise<SongRecommendation[]> Array of recommended songs
 */
export async function getAIRecommendations(
  searchHistory: string[],
  count: number = 5
): Promise<SongRecommendation[]> {
  try {
    // Validate input
    if (!searchHistory || searchHistory.length === 0) {
      throw new Error('Search history is empty');
    }

    // Get API base URL from environment
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

    // Call secure backend endpoint
    const response = await fetch(`${apiBaseUrl}/api/ai/recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchHistory,
        count,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const recommendations: SongRecommendation[] = await response.json();

    // Ensure we have at least some recommendations
    if (!recommendations || recommendations.length === 0) {
      throw new Error('No recommendations received');
    }

    return recommendations;
  } catch (error) {
    console.error('AI recommendation error:', error);

    // Rethrow with user-friendly message
    if (error instanceof Error) {
      if (error.message.includes('not configured')) {
        throw new Error('AI recommendations are currently unavailable. Please try again later.');
      } else if (error.message.includes('rate limit')) {
        throw new Error('AI service is busy. Please try again in a moment.');
      } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      } else if (error.message.includes('HTTP error')) {
        throw new Error('Failed to get AI recommendations. Please try again later.');
      } else {
        throw new Error('Failed to get AI recommendations. Please try again later.');
      }
    }

    throw new Error('An unexpected error occurred while getting recommendations.');
  }
}
