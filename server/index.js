import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:8080", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new Database(path.join(__dirname, '../api/singtube.db'));
db.pragma('journal_mode = WAL');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS saved_queues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guid TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    songs TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    gender TEXT DEFAULT 'all',
    search_count INTEGER DEFAULT 1,
    last_searched DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(query, gender)
  );

  CREATE TABLE IF NOT EXISTS played_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    youtube_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    duration TEXT,
    thumbnail TEXT,
    play_count INTEGER DEFAULT 1,
    first_played DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_played DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(youtube_id)
  );

  CREATE INDEX IF NOT EXISTS idx_saved_queues_guid ON saved_queues(guid);
`);

// Store active rooms and their Socket.io room names
const activeRooms = new Map(); // guid -> { hostSocketId, clients: Set }

// Helper function to generate GUID
function generateGUID() {
  return uuidv4();
}

// REST API Endpoints (for backwards compatibility and initial data loading)

// Get all saved queues
app.get('/api/queues', (req, res) => {
  try {
    const queues = db.prepare('SELECT * FROM saved_queues ORDER BY updated_at DESC').all();
    const result = queues.map(queue => ({
      id: queue.id,
      guid: queue.guid,
      name: queue.name,
      songs: JSON.parse(queue.songs),
      createdAt: queue.created_at,
      updatedAt: queue.updated_at
    }));
    res.json(result);
  } catch (error) {
    console.error('Error fetching queues:', error);
    res.status(500).json({ error: 'Failed to fetch queues' });
  }
});

// Get specific queue by GUID
app.get('/api/queues/:guid', (req, res) => {
  try {
    const { guid } = req.params;
    const queue = db.prepare('SELECT * FROM saved_queues WHERE guid = ?').get(guid);

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    const result = {
      id: queue.id,
      guid: queue.guid,
      name: queue.name,
      songs: JSON.parse(queue.songs),
      createdAt: queue.created_at,
      updatedAt: queue.updated_at
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// Save new queue
app.post('/api/queues', (req, res) => {
  try {
    const { name, songs } = req.body;

    if (!name || !songs) {
      return res.status(400).json({ error: 'Name and songs are required' });
    }

    const guid = generateGUID();
    const stmt = db.prepare('INSERT INTO saved_queues (guid, name, songs) VALUES (?, ?, ?)');
    const result = stmt.run(guid, name, JSON.stringify(songs));

    res.json({
      id: result.lastInsertRowid,
      guid,
      message: 'Queue saved successfully'
    });
  } catch (error) {
    console.error('Error saving queue:', error);
    res.status(500).json({ error: 'Failed to save queue' });
  }
});

// Update queue
app.put('/api/queues/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, songs } = req.body;

    if (!name || !songs) {
      return res.status(400).json({ error: 'Name and songs are required' });
    }

    const stmt = db.prepare('UPDATE saved_queues SET name = ?, songs = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const result = stmt.run(name, JSON.stringify(songs), id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    // Get the guid to notify connected clients
    const queue = db.prepare('SELECT guid FROM saved_queues WHERE id = ?').get(id);
    if (queue && activeRooms.has(queue.guid)) {
      io.to(queue.guid).emit('queue-updated', {
        songs: songs,
        updatedBy: 'host'
      });
    }

    res.json({
      id,
      message: 'Queue updated successfully'
    });
  } catch (error) {
    console.error('Error updating queue:', error);
    res.status(500).json({ error: 'Failed to update queue' });
  }
});

// Delete queue
app.delete('/api/queues/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM saved_queues WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    res.json({ message: 'Queue deleted successfully' });
  } catch (error) {
    console.error('Error deleting queue:', error);
    res.status(500).json({ error: 'Failed to delete queue' });
  }
});

// Search history endpoints
app.post('/api/history/track', (req, res) => {
  try {
    const { query, gender } = req.body;

    const existing = db.prepare('SELECT * FROM search_history WHERE query = ? AND gender = ?').get(query, gender || 'all');

    if (existing) {
      db.prepare('UPDATE search_history SET search_count = search_count + 1, last_searched = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
    } else {
      db.prepare('INSERT INTO search_history (query, gender) VALUES (?, ?)').run(query, gender || 'all');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking search:', error);
    res.status(500).json({ error: 'Failed to track search' });
  }
});

app.get('/api/history/top', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = db.prepare('SELECT query, gender, search_count, last_searched FROM search_history ORDER BY search_count DESC, last_searched DESC LIMIT ?').all(limit);
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Played songs endpoints
app.post('/api/analytics/track-play', (req, res) => {
  try {
    const { youtubeId, title, artist, duration, thumbnail } = req.body;

    const existing = db.prepare('SELECT * FROM played_songs WHERE youtube_id = ?').get(youtubeId);

    if (existing) {
      db.prepare('UPDATE played_songs SET play_count = play_count + 1, last_played = CURRENT_TIMESTAMP WHERE youtube_id = ?').run(youtubeId);
    } else {
      db.prepare('INSERT INTO played_songs (youtube_id, title, artist, duration, thumbnail) VALUES (?, ?, ?, ?, ?)').run(youtubeId, title, artist, duration, thumbnail);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking play:', error);
    res.status(500).json({ error: 'Failed to track play' });
  }
});

app.get('/api/analytics/top-songs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const songs = db.prepare('SELECT * FROM played_songs ORDER BY play_count DESC, last_played DESC LIMIT ?').all(limit);
    res.json(songs);
  } catch (error) {
    console.error('Error fetching top songs:', error);
    res.status(500).json({ error: 'Failed to fetch top songs' });
  }
});

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join a room (both host and guests)
  socket.on('join-room', ({ guid, userName, isHost }) => {
    console.log(`${userName} (${isHost ? 'HOST' : 'GUEST'}) joining room: ${guid}`);

    // Track room members
    if (!activeRooms.has(guid)) {
      activeRooms.set(guid, {
        hostSocketId: isHost ? socket.id : null,
        clients: new Set()
      });
    }

    const room = activeRooms.get(guid);

    // Check room capacity (max 10 users)
    if (room.clients.size >= 10) {
      console.log(`❌ Room ${guid} is full (10/10 users)`);
      socket.emit('error', {
        message: 'Room is full. Maximum 10 users allowed.'
      });
      return;
    }

    socket.join(guid);
    socket.userData = { guid, userName, isHost };

    room.clients.add(socket.id);

    if (isHost) {
      room.hostSocketId = socket.id;
    }

    // Send current queue state to the joining client
    try {
      let queue = db.prepare('SELECT * FROM saved_queues WHERE guid = ?').get(guid);

      // Auto-create queue if it doesn't exist
      if (!queue) {
        console.log(`Creating new queue for room: ${guid}`);
        const queueName = `Room ${guid.substring(0, 8)}`;
        const insertStmt = db.prepare('INSERT INTO saved_queues (guid, name, songs) VALUES (?, ?, ?)');
        insertStmt.run(guid, queueName, JSON.stringify([]));

        // Fetch the newly created queue
        queue = db.prepare('SELECT * FROM saved_queues WHERE guid = ?').get(guid);
      }

      if (queue) {
        socket.emit('queue-state', {
          id: queue.id,
          guid: queue.guid,
          name: queue.name,
          songs: JSON.parse(queue.songs),
          updatedAt: queue.updated_at
        });
      }
    } catch (error) {
      console.error('Error fetching/creating queue state:', error);
    }

    // Notify room members
    socket.to(guid).emit('user-joined', {
      userName,
      isHost,
      timestamp: new Date().toISOString()
    });

    console.log(`Room ${guid} now has ${room.clients.size} clients`);
  });

  // Add song to queue
  socket.on('add-song', ({ guid, song }) => {
    console.log(`Song added to ${guid} by ${socket.userData?.userName}:`, song.title);

    try {
      const queue = db.prepare('SELECT * FROM saved_queues WHERE guid = ?').get(guid);
      if (!queue) {
        socket.emit('error', { message: 'Queue not found' });
        return;
      }

      const songs = JSON.parse(queue.songs);
      songs.push(song);

      db.prepare('UPDATE saved_queues SET songs = ?, updated_at = CURRENT_TIMESTAMP WHERE guid = ?')
        .run(JSON.stringify(songs), guid);

      // Broadcast to all clients in the room
      io.to(guid).emit('queue-updated', {
        songs,
        updatedBy: socket.userData?.userName || 'Unknown',
        action: 'add',
        song
      });
    } catch (error) {
      console.error('Error adding song:', error);
      socket.emit('error', { message: 'Failed to add song' });
    }
  });

  // Remove song from queue (host only)
  socket.on('remove-song', ({ guid, songIndex }) => {
    if (!socket.userData?.isHost) {
      socket.emit('error', { message: 'Only host can remove songs' });
      return;
    }

    console.log(`Song removed from ${guid} at index ${songIndex}`);

    try {
      const queue = db.prepare('SELECT * FROM saved_queues WHERE guid = ?').get(guid);
      if (!queue) {
        socket.emit('error', { message: 'Queue not found' });
        return;
      }

      const songs = JSON.parse(queue.songs);
      const removed = songs.splice(songIndex, 1)[0];

      db.prepare('UPDATE saved_queues SET songs = ?, updated_at = CURRENT_TIMESTAMP WHERE guid = ?')
        .run(JSON.stringify(songs), guid);

      io.to(guid).emit('queue-updated', {
        songs,
        updatedBy: socket.userData?.userName || 'Host',
        action: 'remove',
        songIndex,
        removedSong: removed
      });
    } catch (error) {
      console.error('Error removing song:', error);
      socket.emit('error', { message: 'Failed to remove song' });
    }
  });

  // Reorder queue (host only)
  socket.on('reorder-queue', ({ guid, fromIndex, toIndex }) => {
    if (!socket.userData?.isHost) {
      socket.emit('error', { message: 'Only host can reorder songs' });
      return;
    }

    console.log(`Queue reordered in ${guid}: ${fromIndex} -> ${toIndex}`);

    try {
      const queue = db.prepare('SELECT * FROM saved_queues WHERE guid = ?').get(guid);
      if (!queue) {
        socket.emit('error', { message: 'Queue not found' });
        return;
      }

      const songs = JSON.parse(queue.songs);
      const [movedSong] = songs.splice(fromIndex, 1);
      songs.splice(toIndex, 0, movedSong);

      db.prepare('UPDATE saved_queues SET songs = ?, updated_at = CURRENT_TIMESTAMP WHERE guid = ?')
        .run(JSON.stringify(songs), guid);

      io.to(guid).emit('queue-updated', {
        songs,
        updatedBy: socket.userData?.userName || 'Host',
        action: 'reorder',
        fromIndex,
        toIndex
      });
    } catch (error) {
      console.error('Error reordering queue:', error);
      socket.emit('error', { message: 'Failed to reorder queue' });
    }
  });

  // Update current playing song (host only)
  socket.on('update-current-song', ({ guid, currentIndex }) => {
    if (!socket.userData?.isHost) {
      return;
    }

    console.log(`Current song updated in ${guid}: index ${currentIndex}`);

    io.to(guid).emit('current-song-changed', {
      currentIndex,
      updatedBy: socket.userData?.userName || 'Host'
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    if (socket.userData) {
      const { guid, userName, isHost } = socket.userData;

      const room = activeRooms.get(guid);
      if (room) {
        room.clients.delete(socket.id);

        if (room.clients.size === 0) {
          activeRooms.delete(guid);
          console.log(`Room ${guid} is now empty and removed`);
        } else {
          socket.to(guid).emit('user-left', {
            userName,
            isHost,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 SingTube WebSocket Server running on port ${PORT}`);
  console.log(`📡 Socket.IO endpoint: http://localhost:${PORT}`);
  console.log(`🎤 Ready for real-time karaoke collaboration!\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close();
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
