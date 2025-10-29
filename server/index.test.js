import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test database path
const testDbPath = path.join(__dirname, '../api/singtube-test.db');

// Create a minimal test server with just the history endpoints
function createTestApp() {
  const app = express();
  app.use(express.json());

  const db = new Database(testDbPath);
  db.pragma('journal_mode = WAL');

  // Create test tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      gender TEXT DEFAULT 'all',
      search_count INTEGER DEFAULT 1,
      last_searched DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(query, gender)
    );
  `);

  // Track search endpoint
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

  // Get history endpoint
  app.get('/api/history/top', (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const history = db.prepare('SELECT query, gender, search_count, last_searched FROM search_history ORDER BY last_searched DESC LIMIT ?').all(limit);
      res.json(history);
    } catch (error) {
      console.error('Error fetching history:', error);
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  return { app, db };
}

describe('Search History API Tests', () => {
  let app;
  let db;
  let server;

  beforeAll(() => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testDbPath + '-shm')) {
      fs.unlinkSync(testDbPath + '-shm');
    }
    if (fs.existsSync(testDbPath + '-wal')) {
      fs.unlinkSync(testDbPath + '-wal');
    }

    const testApp = createTestApp();
    app = testApp.app;
    db = testApp.db;
    server = createServer(app);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
    if (server) {
      server.close();
    }

    // Clean up test database files
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testDbPath + '-shm')) {
      fs.unlinkSync(testDbPath + '-shm');
    }
    if (fs.existsSync(testDbPath + '-wal')) {
      fs.unlinkSync(testDbPath + '-wal');
    }
  });

  beforeEach(() => {
    // Clear search history before each test
    db.prepare('DELETE FROM search_history').run();
  });

  describe('POST /api/history/track', () => {
    it('should create a new search history entry', async () => {
      const response = await request(app)
        .post('/api/history/track')
        .send({ query: 'test song', gender: 'all' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const history = db.prepare('SELECT * FROM search_history WHERE query = ?').get('test song');
      expect(history).toBeDefined();
      expect(history.query).toBe('test song');
      expect(history.search_count).toBe(1);
    });

    it('should increment search_count for duplicate searches', async () => {
      // First search
      await request(app)
        .post('/api/history/track')
        .send({ query: 'popular song', gender: 'all' });

      // Second search
      await request(app)
        .post('/api/history/track')
        .send({ query: 'popular song', gender: 'all' });

      const history = db.prepare('SELECT * FROM search_history WHERE query = ?').get('popular song');
      expect(history.search_count).toBe(2);
    });

    it('should handle different gender preferences separately', async () => {
      await request(app)
        .post('/api/history/track')
        .send({ query: 'song', gender: 'male' });

      await request(app)
        .post('/api/history/track')
        .send({ query: 'song', gender: 'female' });

      const maleHistory = db.prepare('SELECT * FROM search_history WHERE query = ? AND gender = ?').get('song', 'male');
      const femaleHistory = db.prepare('SELECT * FROM search_history WHERE query = ? AND gender = ?').get('song', 'female');

      expect(maleHistory.search_count).toBe(1);
      expect(femaleHistory.search_count).toBe(1);
    });
  });

  describe('GET /api/history/top', () => {
    it('should return empty array when no history exists', async () => {
      const response = await request(app)
        .get('/api/history/top?limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return search history sorted by date (most recent first)', async () => {
      // Add searches with delays to ensure different timestamps
      // SQLite CURRENT_TIMESTAMP has second-level precision, so we need 1+ second delays
      await request(app)
        .post('/api/history/track')
        .send({ query: 'first search', gender: 'all' });

      // Delay to ensure different timestamp (1100ms to be safe)
      await new Promise(resolve => setTimeout(resolve, 1100));

      await request(app)
        .post('/api/history/track')
        .send({ query: 'second search', gender: 'all' });

      await new Promise(resolve => setTimeout(resolve, 1100));

      await request(app)
        .post('/api/history/track')
        .send({ query: 'third search', gender: 'all' });

      const response = await request(app)
        .get('/api/history/top?limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);

      // Most recent should be first
      expect(response.body[0].query).toBe('third search');
      expect(response.body[1].query).toBe('second search');
      expect(response.body[2].query).toBe('first search');
    }, 5000); // Increase timeout for delays

    it('CRITICAL: should prioritize recent searches over popular ones', async () => {
      // Create an old popular search
      await request(app)
        .post('/api/history/track')
        .send({ query: 'old popular', gender: 'all' });

      // Make it popular by searching multiple times
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/history/track')
          .send({ query: 'old popular', gender: 'all' });
      }

      // Wait to ensure different timestamp (1100ms for SQLite second precision)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Create a recent search with only 1 count
      await request(app)
        .post('/api/history/track')
        .send({ query: 'recent search', gender: 'all' });

      const response = await request(app)
        .get('/api/history/top?limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);

      // The recent search (1 count) should appear BEFORE the popular search (11 counts)
      expect(response.body[0].query).toBe('recent search');
      expect(response.body[0].search_count).toBe(1);

      expect(response.body[1].query).toBe('old popular');
      expect(response.body[1].search_count).toBe(11);

      // Verify timestamps are in descending order
      const timestamp1 = new Date(response.body[0].last_searched).getTime();
      const timestamp2 = new Date(response.body[1].last_searched).getTime();
      expect(timestamp1).toBeGreaterThan(timestamp2);
    }, 5000); // Increase timeout for delays

    it('should respect the limit parameter', async () => {
      // Add 5 searches with delays to ensure different timestamps
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post('/api/history/track')
          .send({ query: `search ${i}`, gender: 'all' });
        await new Promise(resolve => setTimeout(resolve, 1100));
      }

      const response = await request(app)
        .get('/api/history/top?limit=3');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);

      // Should return the 3 most recent
      expect(response.body[0].query).toBe('search 5');
      expect(response.body[1].query).toBe('search 4');
      expect(response.body[2].query).toBe('search 3');
    }, 10000); // Increase timeout to 10 seconds

    it('should include all required fields in response', async () => {
      await request(app)
        .post('/api/history/track')
        .send({ query: 'test', gender: 'male' });

      const response = await request(app)
        .get('/api/history/top?limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);

      const item = response.body[0];
      expect(item).toHaveProperty('query');
      expect(item).toHaveProperty('gender');
      expect(item).toHaveProperty('search_count');
      expect(item).toHaveProperty('last_searched');

      expect(item.query).toBe('test');
      expect(item.gender).toBe('male');
      expect(item.search_count).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive searches correctly', async () => {
      // Simulate rapid clicking (3 searches within milliseconds)
      const promises = [
        request(app).post('/api/history/track').send({ query: 'rapid', gender: 'all' }),
        request(app).post('/api/history/track').send({ query: 'rapid', gender: 'all' }),
        request(app).post('/api/history/track').send({ query: 'rapid', gender: 'all' })
      ];

      await Promise.all(promises);

      const history = db.prepare('SELECT * FROM search_history WHERE query = ?').get('rapid');
      expect(history.search_count).toBe(3);
    });

    it('should handle special characters in search queries', async () => {
      const specialQuery = '爱的供养 (纯伴奏) @#$%';

      await request(app)
        .post('/api/history/track')
        .send({ query: specialQuery, gender: 'all' });

      const response = await request(app)
        .get('/api/history/top?limit=10');

      expect(response.status).toBe(200);
      expect(response.body[0].query).toBe(specialQuery);
    });
  });
});
