import { io, Socket } from 'socket.io-client';
import type { Song } from '@/components/SongCard';

// Socket.IO server URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export interface QueueState {
  id: number;
  guid: string;
  name: string;
  songs: Song[];
  updatedAt: string;
}

export interface QueueUpdatePayload {
  songs: Song[];
  updatedBy: string;
  action: 'add' | 'remove' | 'reorder';
  song?: Song;
  songIndex?: number;
  removedSong?: Song;
  fromIndex?: number;
  toIndex?: number;
}

export interface UserJoinedPayload {
  userName: string;
  isHost: boolean;
  timestamp: string;
}

export interface UserLeftPayload {
  userName: string;
  isHost: boolean;
  timestamp: string;
}

export interface CurrentSongChangedPayload {
  currentIndex: number;
  updatedBy: string;
}

class SocketService {
  private socket: Socket | null = null;
  private currentRoom: string | null = null;

  /**
   * Initialize and connect to Socket.IO server
   */
  connect(): Socket {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to WebSocket server:', this.socket?.id);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from WebSocket server:', reason);
      });

      this.socket.on('error', (error) => {
        console.error('🔴 Socket error:', error);
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔴 Connection error:', error.message);
      });
    }

    return this.socket;
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentRoom = null;
      console.log('🔌 Disconnected from WebSocket server');
    }
  }

  /**
   * Join a karaoke room
   */
  joinRoom(guid: string, userName: string, isHost: boolean): void {
    if (!this.socket) {
      this.connect();
    }

    this.currentRoom = guid;
    this.socket?.emit('join-room', { guid, userName, isHost });
    console.log(`📡 Joining room: ${guid} as ${isHost ? 'HOST' : 'GUEST'}`);
  }

  /**
   * Leave the current room
   */
  leaveRoom(): void {
    if (this.socket && this.currentRoom) {
      this.socket.emit('leave-room', { guid: this.currentRoom });
      this.currentRoom = null;
      console.log('👋 Left room');
    }
  }

  /**
   * Add a song to the queue
   */
  addSong(guid: string, song: Song): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('add-song', { guid, song });
    console.log('🎵 Song added:', song.title);
  }

  /**
   * Remove a song from the queue (host only)
   */
  removeSong(guid: string, songIndex: number): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('remove-song', { guid, songIndex });
    console.log('🗑️ Song removed at index:', songIndex);
  }

  /**
   * Reorder queue (host only)
   */
  reorderQueue(guid: string, fromIndex: number, toIndex: number): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('reorder-queue', { guid, fromIndex, toIndex });
    console.log(`🔀 Queue reordered: ${fromIndex} -> ${toIndex}`);
  }

  /**
   * Update current playing song (host only)
   */
  updateCurrentSong(guid: string, currentIndex: number): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('update-current-song', { guid, currentIndex });
    console.log('▶️ Current song updated:', currentIndex);
  }

  /**
   * Listen for queue state (initial load)
   */
  onQueueState(callback: (state: QueueState) => void): void {
    this.socket?.on('queue-state', callback);
  }

  /**
   * Listen for queue updates
   */
  onQueueUpdated(callback: (payload: QueueUpdatePayload) => void): void {
    this.socket?.on('queue-updated', callback);
  }

  /**
   * Listen for current song changes
   */
  onCurrentSongChanged(callback: (payload: CurrentSongChangedPayload) => void): void {
    this.socket?.on('current-song-changed', callback);
  }

  /**
   * Listen for user joined events
   */
  onUserJoined(callback: (payload: UserJoinedPayload) => void): void {
    this.socket?.on('user-joined', callback);
  }

  /**
   * Listen for user left events
   */
  onUserLeft(callback: (payload: UserLeftPayload) => void): void {
    this.socket?.on('user-left', callback);
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }

  /**
   * Remove specific event listener
   */
  off(eventName: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(eventName, callback);
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get current room GUID
   */
  getCurrentRoom(): string | null {
    return this.currentRoom;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
