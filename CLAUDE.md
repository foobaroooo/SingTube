# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SingTube is a web-based **Karaoke Player** that uses YouTube videos as the media source, focusing on Chinese songs with karaoke/instrumental versions. Users can search, queue, and play karaoke tracks with gender preference filtering (male/female versions).

Built with:
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: TailwindCSS with CSS variables
- **State Management**: React hooks + TanStack React Query
- **Routing**: React Router DOM

## Development Commands

```bash
# Start development server (runs on port 8080)
npm run dev

# Start PHP API backend (runs on port 8082) - Required for queue functionality
cd api && php -S localhost:8082

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Architecture Overview

### Core Application Structure
- **App.tsx**: Root component with routing, query client, and UI providers
- **pages/Index.tsx**: Main karaoke player interface with search, queue, and playback
- **components/**: Modular React components for each UI section

### Key Components
- **SearchSection**: YouTube search with gender filtering
- **SongCard**: Individual song display with queue actions
- **CurrentSong**: Now playing display with playback controls
- **QueueSection**: Song queue management with reorder/remove

### Data Flow
- YouTube Data API v3 for video search and metadata
- PHP backend API (`api/`) for queue management and persistence
- State managed via React hooks in Index.tsx
- Toast notifications for user feedback

### Path Aliases
Uses `@/` alias for `src/` directory:
- `@/components` → `src/components`
- `@/hooks` → `src/hooks`
- `@/lib` → `src/lib`
- `@/data` → `src/data`

### shadcn/ui Integration
- Components in `src/components/ui/`
- Uses Radix UI primitives with custom styling
- TailwindCSS with CSS variables for theming
- Base color: slate, with CSS variables enabled

## Technical Notes

- **Vite Configuration**: Custom port 8080, SWC for React, path aliases configured
- **TypeScript**: Strict mode enabled with separate configs for app and build tools
- **Styling**: TailwindCSS with typography plugin, custom gradient utilities
- **API Integration**: Uses YouTube Data API v3 for real video search and metadata

## Environment Configuration

### Development
- Uses `.env.development` for development-specific settings
- API calls go to `http://localhost:8082` (PHP dev server)
- Requires both frontend and backend servers running

### Production
- Uses `.env` for production settings
- API calls go to `/api` (relative path)
- Expects PHP files to be served under `/api` path on web server

### Environment Variables
- `VITE_YOUTUBE_API_KEY`: YouTube Data API v3 key (required)
- `VITE_API_BASE_URL`: Base URL for backend API
  - Development: `http://localhost:8082`
  - Production: `/api`