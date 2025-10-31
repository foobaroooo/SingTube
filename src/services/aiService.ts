import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Required for client-side usage
});

export interface SongRecommendation {
  title: string;
  artist: string;
}

/**
 * Get AI-powered song recommendations based on search history
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

    // Validate API key
    if (!import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY.includes('your-openai-api-key')) {
      throw new Error('OpenAI API key is not configured');
    }

    // Create optimized prompt
    const songList = searchHistory.join(', ');
    const prompt = `Based on these karaoke songs that a user has searched for: ${songList}

Recommend ${count} similar popular karaoke songs that they might enjoy singing.

IMPORTANT: Return ONLY the song recommendations in this exact format, one per line:
Title - Artist
Title - Artist
Title - Artist

No explanations, no numbering, no additional text. Just the song titles and artists separated by " - ".`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful karaoke song recommendation assistant. You provide accurate, popular karaoke song recommendations based on user preferences.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7, // Balanced creativity
      max_tokens: 200, // Enough for 5 song recommendations
    });

    // Parse response
    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse song recommendations
    const recommendations: SongRecommendation[] = [];
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      // Expected format: "Title - Artist"
      const parts = line.split(' - ');
      if (parts.length >= 2) {
        const title = parts[0].trim();
        const artist = parts.slice(1).join(' - ').trim(); // Handle artist names with dashes

        if (title && artist) {
          recommendations.push({ title, artist });
        }
      }
    }

    // Ensure we have at least some recommendations
    if (recommendations.length === 0) {
      throw new Error('Failed to parse song recommendations');
    }

    return recommendations.slice(0, count);
  } catch (error) {
    console.error('AI recommendation error:', error);

    // Rethrow with user-friendly message
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('AI recommendations are not available. Please configure your OpenAI API key.');
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      } else {
        throw new Error('Failed to get AI recommendations. Please try again later.');
      }
    }

    throw new Error('An unexpected error occurred while getting recommendations.');
  }
}
