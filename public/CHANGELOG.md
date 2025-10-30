# Changelog

All notable changes to SingTube will be documented in this file.

## [2.1.0] - 2025-01-30

### Bug Fixes

- **Search History Sorting**: Fixed search history to show most recent searches first (was incorrectly sorting by popularity)
- **Empty State Display**: Restored "no search" prompt that appears on initial page load
- **Default View**: Room/queue page now displays by default for hosts (instead of search page)
- **Add to Queue Button**: Fixed race condition where "Add to Queue" buttons were enabled before room initialization

### New Features

#### Testing Infrastructure
- Added comprehensive unit testing with Vitest
- Implemented automated pre-commit hooks with Husky
- Created 10 test cases for search history API
- Tests run automatically on file changes with watch mode
- Tests verify critical sorting behavior (recent searches appear first)

#### Internationalization Improvements
- Added Chinese translations for search section
- Translated button labels, tooltips, and UI text
- Complete bilingual support for search interface

#### Documentation
- Created comprehensive MANUAL-DEPLOYMENT.md guide
- Added step-by-step DigitalOcean deployment instructions
- Documented common deployment issues and solutions
- Added database backup strategies

### Technical Improvements

- **Database Testing**: Tests ensure SQLite timestamp precision works correctly
- **Git Hooks**: Pre-commit testing prevents broken code from being committed
- **Deployment Process**: Streamlined production deployment workflow
- **Server Organization**: Consolidated deployment paths to `/var/www/singtube/`

### Files Changed

#### New Files
- `server/index.test.js` - Comprehensive test suite for search history API
- `vitest.config.js` - Vitest testing configuration
- `.husky/pre-commit` - Git pre-commit hook for automated testing
- `MANUAL-DEPLOYMENT.md` - Production deployment guide
- `TESTING.md` - Testing documentation

#### Modified Files
- `server/index.js` - Fixed SQL query for search history sorting (line 223)
- `src/i18n/locales/en.json` - Added search section translations
- `src/i18n/locales/zh.json` - Added Chinese search translations
- `src/components/SearchSection.tsx` - Applied i18n translations
- `src/pages/Index.tsx` - Fixed empty state display, default view behavior
- `src/contexts/UserContext.tsx` - Changed default `isHost` to `true`

### Dependencies Added

```json
{
  "vitest": "^4.0.5",
  "supertest": "^7.1.4",
  "husky": "^9.1.7",
  "@types/supertest": "^6.0.3"
}
```

### Configuration Changes

- **Test Scripts**: Added `test`, `test:watch`, `test:ui`, `test:coverage`
- **Git Hooks**: Pre-commit hook runs test suite automatically
- **Production Path**: Standardized to `/var/www/singtube/`

### Running Tests

```bash
# Run tests once
npm test

# Run tests in watch mode (auto-run on file changes)
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

---

## [2.0.0] - 2025-01-26

### Major Features

#### Real-Time Collaboration with WebSocket
- Replaced polling-based sync with Socket.io for instant real-time updates
- Multiple users (up to 10) can now collaborate in the same karaoke room simultaneously
- Songs added by guests appear instantly in host's queue without page refresh
- Bi-directional communication for seamless multi-user experience

#### Guest View Simplification
- Guests can now only search and add songs (queue view removed)
- Reduces complexity and eliminates sync conflicts
- Cleaner, focused interface for guest users
- Host retains full control over queue management

### New Features

- **Auto-Room Creation**: Hosts automatically get a room on first page load
- **Priority Queue**: "Add to Front" button for urgent song requests
- **10-User Room Limit**: Prevents overcrowding with maximum 10 concurrent users per room
- **User Join/Leave Notifications**: Toast notifications when users join or leave rooms
- **Default Username Support**: Hosts can use the app without manually setting a username

### Technical Improvements

#### Backend Migration
- Migrated from PHP backend to Node.js/Express server
- Implemented Socket.io WebSocket server on port 3000
- Switched to SQLite with WAL (Write-Ahead Logging) mode for better concurrent access
- Created RESTful API endpoints for queue management

#### Frontend Enhancements
- Created `socketService.ts` - TypeScript Socket.io client wrapper with full type safety
- Updated `Index.tsx` (Host view) with WebSocket integration
- Updated `Room.tsx` (Guest view) with WebSocket integration
- Migrated all API endpoints from PHP to Node.js REST API

#### Database Optimization
- Enabled SQLite WAL mode for better performance with concurrent users
- Automatic room creation in database
- Improved transaction handling for queue operations

### Bug Fixes

- Fixed race condition when guests add songs simultaneously
- Fixed WebSocket connection issue for hosts without username
- Fixed "Not connected to a room" error on fresh start
- Fixed "Add to Front" feature not syncing to queue
- Fixed PHP endpoint 404 errors after migration

### Dependencies Added

```json
{
  "socket.io": "^4.8.1",
  "socket.io-client": "^4.8.1",
  "express": "^5.1.0",
  "better-sqlite3": "^12.4.1",
  "cors": "^2.8.5",
  "uuid": "^13.0.0"
}
```

### Files Changed

#### New Files
- `server/index.js` - Node.js/Express/Socket.io WebSocket server
- `src/services/socketService.ts` - Socket.io client service
- `src/pages/SocketTest.tsx` - WebSocket testing page

#### Modified Files
- `src/pages/Index.tsx` - Integrated WebSocket for host view
- `src/pages/Room.tsx` - Integrated WebSocket for guest view, removed queue section
- `src/services/apiService.ts` - Migrated from PHP to Node.js endpoints
- `.env.development` - Updated API URLs to point to Node.js server
- `package.json` - Added new dependencies and server scripts

### Configuration Changes

- **Development API**: `http://localhost:3000` (Node.js server)
- **WebSocket Server**: Port 3000
- **Frontend Dev Server**: Port 8080 (unchanged)

### Running the Application

```bash
# Terminal 1: Start WebSocket server
npm run server

# Terminal 2: Start frontend
npm run dev
```

Or run both together:
```bash
npm run dev:all
```

### Breaking Changes

- **PHP Backend Removed**: Application now requires Node.js server
- **Port Change**: Backend moved from port 8082 to 3000
- **Guest View Changed**: Guests can no longer view or manage the queue
- **WebSocket Required**: Real-time features require active WebSocket connection

App now has real-time collaboration with Socket.io! Here's what we accomplished:

  Features Implemented:

  1. Real-Time Queue Sync - Songs added by anyone appear instantly for all users
  2. 10-User Room Limit - Prevents overcrowding (max 10 concurrent users per room)
  3. Auto-Room Creation - Hosts get a room automatically on first load
  4. Priority Queue - "Add to Front" button works perfectly
  5. Guest View Simplified - Guests can only search and add songs (no queue visible)
  6. Host Controls - Only hosts can remove/reorder songs
  7. WebSocket WAL Mode - SQLite database optimized for concurrent access

  Architecture:

  Frontend (Port 8080)
    ├─ Index.tsx (Host view)
    └─ Room.tsx (Guest view)
            WebSocket
  WebSocket Server (Port 3000)
    ├─ Socket.io
    └─ SQLite Database (WAL mode)

   Files Changed:

  - server/index.js - New Node.js WebSocket server
  - src/services/socketService.ts - Socket.io client wrapper
  - src/services/apiService.ts - Migrated from PHP to Node.js API
  - src/pages/Index.tsx - Host view with WebSocket sync
  - src/pages/Room.tsx - Guest view with WebSocket sync
  - .env.development - Updated API URLs

### Future Enhancements

- Connection resilience and automatic reconnection
- Better error handling for WebSocket failures
- User presence indicators (who's online)
- Room capacity indicator
- Delete search history feature on backend

---

## [1.0.0] - Previous Version

### Initial Features
- YouTube karaoke video search and playback
- Queue management (add, remove, reorder)
- Gender-based filtering (male/female vocals)
- QR code sharing for easy room joining
- Search history tracking
- Top songs analytics
- Mobile-responsive design
- Internationalization (English/Chinese)
