# Production Deployment Guide

## YouTube Data API v3 Setup

This application now uses the YouTube Data API v3 directly for production deployment. Follow these steps to deploy:

### 1. Get YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key

### 2. Configure Environment Variables

For production deployment, set the following environment variable:

```bash
VITE_YOUTUBE_API_KEY=your_actual_youtube_api_key_here
```

### 3. API Key Security (Important!)

- **Restrict your API key** in Google Cloud Console:
  - Set HTTP referrers (websites) restrictions to your domain(s)
  - Only enable YouTube Data API v3 for this key
- **Monitor usage** to prevent quota exhaustion
- **Set up billing alerts** to track API costs

### 4. Build for Production

```bash
npm run build
```

### 5. Deploy

Deploy the `dist/` folder to your hosting service (Vercel, Netlify, etc.).

## Features

- **Real YouTube Search**: Searches actual YouTube videos using YouTube Data API v3
- **Smart Filtering**: Automatically adds karaoke-related terms to search queries
- **Gender Filtering**: Supports male/female voice filtering with Chinese and English terms
- **Pagination**: Full pagination support using YouTube's pageToken system
- **Duration Display**: Shows actual video durations
- **Error Handling**: Comprehensive error handling with user-friendly messages

## API Quota Management

- YouTube Data API v3 has a daily quota limit (10,000 units by default)
- Each search costs ~100 units (search + video details)
- Monitor usage in Google Cloud Console
- Consider implementing client-side caching for frequently searched terms

## Fallback Behavior

If the API key is not configured or invalid, the app will show a clear error message prompting users to configure the API key. The mock data fallback has been removed for production deployment.