# SingTube Setup Guide

## Prerequisites

1. **Node.js** (v18 or later) - For frontend development
2. **PHP** (v7.4 or later) with SQLite support - For backend API
3. **Web Server** (Apache/Nginx) - For serving PHP API
4. **YouTube Data API v3 Key** - Get from [Google Cloud Console](https://console.developers.google.com/)

## Quick Start

### 1. Frontend Setup
```bash
# Install dependencies
npm install
```

### 2. Backend Setup (PHP)
```bash
# Copy environment configuration
cp .env.example .env

# Edit .env and add your YouTube API key:
YOUTUBE_API_KEY=your_actual_youtube_api_key_here
VITE_API_BASE_URL=http://localhost/singtube/api
```

### 3. Web Server Configuration

**Option A: Local PHP Server (Development)**
```bash
# Start PHP development server
cd api/
php -S localhost:8081
```

**Option B: Apache/Nginx (Production)**
- Place the entire project in your web server's document root
- Ensure PHP has SQLite extension enabled
- Configure your web server to serve the `api/` directory

### 4. Start Frontend Development Server
```bash
npm run dev
```

Open http://localhost:8080 in your browser.

## Getting YouTube Data API Key

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing one
3. Enable "YouTube Data API v3"
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy the API key to your `.env` file

## Features Implemented

### Core Functionality ✅
- **YouTube Search Integration**: Real-time search using YouTube Data API v3
- **Chinese Karaoke Focus**: Enhanced search with Chinese karaoke keywords (伴奏, 卡拉OK, etc.)
- **Gender Filtering**: Search for male/female versions of songs
- **Queue Management**: Add, remove, reorder songs in queue
- **External YouTube Playback**: Click to open songs in YouTube
- **Persistence**: Auto-save current queue and search history

### Advanced Features ✅
- **Search History**: Recent searches with quick replay
- **Save/Load Queues**: Save favorite playlists for later
- **Loading States**: Smooth UI feedback during API calls
- **Error Handling**: Graceful handling of API failures
- **Duration Filtering**: Automatically filter out very short/long videos
- **Regional Optimization**: Configured for Chinese content (Taiwan region)

## Usage

1. **Search**: Enter song name or artist (Chinese recommended)
2. **Filter**: Use gender dropdown for male/female versions
3. **Add to Queue**: Click "Add" button or "Priority" for front of queue
4. **Play**: Click any song card's play button or use "Open in YouTube"
5. **Navigate**: Use Previous/Next buttons in Now Playing section
6. **Save Queue**: Click save icon to preserve current playlist
7. **Load Queue**: Click folder icon to restore saved playlists

## File Structure

```
src/
├── components/          # React components
│   ├── SearchSection.tsx   # Search with history
│   ├── SongCard.tsx        # Individual song display
│   ├── CurrentSong.tsx     # Now playing section
│   ├── QueueSection.tsx    # Queue management
│   └── ui/                 # shadcn/ui components
├── services/
│   ├── youtubeApi.ts      # YouTube Data API integration
│   └── database.ts        # Browser persistence layer
├── pages/
│   └── Index.tsx          # Main application page
└── assets/               # Static assets
```

## Architecture

### Frontend (React)
- **Framework**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui components with TailwindCSS
- **State**: React hooks + localStorage for queue persistence
- **API Client**: Axios for HTTP requests to PHP backend

### Backend (PHP)
- **Language**: PHP 7.4+ with SQLite
- **Database**: SQLite for persistent storage
- **API**: RESTful endpoints for search, queues, and history
- **YouTube Integration**: Server-side YouTube Data API v3 calls

### Database Schema
```sql
-- Saved song queues
saved_queues (id, name, songs, created_at, updated_at)

-- Search history for quick access
search_history (id, query, gender, search_count, last_searched)

-- User preferences
user_preferences (key, value, updated_at)
```

## Deployment

1. **Build for Production**
   ```bash
   npm run build
   ```

2. **Preview Build**
   ```bash
   npm run preview
   ```

3. **Deploy** to any static hosting service (Vercel, Netlify, etc.)

## Environment Variables

### Backend (.env)
- `YOUTUBE_API_KEY`: Your YouTube Data API v3 key (required for PHP backend)

### Frontend (build time)
- `VITE_API_BASE_URL`: URL to your PHP API (default: http://localhost/singtube/api)

## API Endpoints

The PHP backend provides these REST endpoints:

### YouTube Search
- `GET /api/search?q={query}&gender={male|female|all}&maxResults={number}`
- Returns: Array of Song objects

### Queue Management
- `GET /api/queues` - Get all saved queues
- `POST /api/queues` - Save a new queue
- `DELETE /api/queues?id={id}` - Delete a queue

### Search History
- `GET /api/history` - Get search history
- `POST /api/history` - Save search to history

## Troubleshooting

**No search results?**
- Check PHP backend is running and accessible
- Verify YouTube API key is configured in backend `.env`
- Check browser console for CORS or network errors
- Try simpler search terms

**CORS errors?**
- Ensure PHP backend has proper CORS headers
- Check `.htaccess` configuration in `/api/` directory
- Verify `VITE_API_BASE_URL` points to correct PHP API URL

**Database errors?**
- Ensure PHP has SQLite extension enabled: `php -m | grep sqlite`
- Check file permissions for `api/singtube.db`
- Verify web server can write to `/api/` directory

## Future Enhancements

- Real-time lyrics synchronization
- Multi-user karaoke rooms
- Offline song caching
- Mobile app companion
- Advanced audio controls