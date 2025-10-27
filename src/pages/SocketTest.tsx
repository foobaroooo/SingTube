import { useState, useEffect } from 'react';
import { socketService } from '@/services/socketService';
import type { Song } from '@/components/SongCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Wifi, WifiOff, Users, Music, Play, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

const SocketTest = () => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [roomGuid, setRoomGuid] = useState('test-room-123');
  const [userName, setUserName] = useState('Test User');
  const [isHost, setIsHost] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [logs, setLogs] = useState<string[]>([]);

  // Test song to add
  const testSong: Song = {
    id: `test-${Date.now()}`,
    title: 'Test Song ' + Math.floor(Math.random() * 1000),
    artist: 'Test Artist',
    duration: '3:45',
    thumbnail: 'https://via.placeholder.com/120x90',
    addedBy: userName
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    // Connect to socket
    const socket = socketService.connect();
    setIsConnected(socketService.isConnected());

    socket.on('connect', () => {
      setIsConnected(true);
      addLog('✅ Connected to WebSocket server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      addLog('❌ Disconnected from WebSocket server');
    });

    // Listen for queue state
    socketService.onQueueState((state) => {
      addLog(`📊 Received queue state: ${state.songs.length} songs`);
      setQueue(state.songs);
    });

    // Listen for queue updates
    socketService.onQueueUpdated((payload) => {
      addLog(`🔄 Queue updated by ${payload.updatedBy}: ${payload.action}`);
      setQueue(payload.songs);

      toast({
        title: 'Queue Updated',
        description: `${payload.updatedBy} ${payload.action === 'add' ? 'added' : payload.action === 'remove' ? 'removed' : 'reordered'} a song`,
      });
    });

    // Listen for user joined
    socketService.onUserJoined((payload) => {
      addLog(`👤 ${payload.userName} joined as ${payload.isHost ? 'HOST' : 'GUEST'}`);

      toast({
        title: 'User Joined',
        description: `${payload.userName} joined the room`,
      });
    });

    // Listen for user left
    socketService.onUserLeft((payload) => {
      addLog(`👋 ${payload.userName} left the room`);

      toast({
        title: 'User Left',
        description: `${payload.userName} left the room`,
      });
    });

    // Listen for current song changes
    socketService.onCurrentSongChanged((payload) => {
      addLog(`▶️ Current song changed to index ${payload.currentIndex} by ${payload.updatedBy}`);
      setCurrentIndex(payload.currentIndex);
    });

    return () => {
      if (isJoined) {
        socketService.leaveRoom();
      }
      socketService.removeAllListeners();
    };
  }, []);

  const handleJoinRoom = () => {
    if (!userName.trim() || !roomGuid.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter both username and room GUID',
        variant: 'destructive'
      });
      return;
    }

    socketService.joinRoom(roomGuid, userName, isHost);
    setIsJoined(true);
    addLog(`🚪 Joined room ${roomGuid} as ${isHost ? 'HOST' : 'GUEST'}`);
  };

  const handleLeaveRoom = () => {
    socketService.leaveRoom();
    setIsJoined(false);
    setQueue([]);
    setCurrentIndex(-1);
    addLog('🚪 Left room');
  };

  const handleAddSong = () => {
    if (!isJoined) {
      toast({
        title: 'Error',
        description: 'Please join a room first',
        variant: 'destructive'
      });
      return;
    }

    const newSong = {
      ...testSong,
      id: `test-${Date.now()}`,
      title: 'Test Song ' + Math.floor(Math.random() * 1000),
      addedBy: userName
    };

    socketService.addSong(roomGuid, newSong);
    addLog(`➕ Added song: ${newSong.title}`);
  };

  const handleRemoveSong = (index: number) => {
    if (!isHost) {
      toast({
        title: 'Error',
        description: 'Only host can remove songs',
        variant: 'destructive'
      });
      return;
    }

    socketService.removeSong(roomGuid, index);
    addLog(`➖ Removed song at index ${index}`);
  };

  const handleReorderSong = (fromIndex: number, direction: 'up' | 'down') => {
    if (!isHost) {
      toast({
        title: 'Error',
        description: 'Only host can reorder songs',
        variant: 'destructive'
      });
      return;
    }

    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= queue.length) return;

    socketService.reorderQueue(roomGuid, fromIndex, toIndex);
    addLog(`🔀 Reordered song from ${fromIndex} to ${toIndex}`);
  };

  const handleSetCurrentSong = (index: number) => {
    if (!isHost) {
      toast({
        title: 'Error',
        description: 'Only host can change current song',
        variant: 'destructive'
      });
      return;
    }

    socketService.updateCurrentSong(roomGuid, index);
    addLog(`▶️ Set current song to index ${index}`);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-6xl space-y-4">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-6 h-6" />
              WebSocket Test Page
              {isConnected ? (
                <Badge variant="default" className="ml-auto">
                  <Wifi className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive" className="ml-auto">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Disconnected
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={isJoined}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Room GUID</label>
                <Input
                  value={roomGuid}
                  onChange={(e) => setRoomGuid(e.target.value)}
                  placeholder="Enter room GUID"
                  disabled={isJoined}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isHost}
                  onChange={(e) => setIsHost(e.target.checked)}
                  disabled={isJoined}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Join as Host</span>
              </label>

              {!isJoined ? (
                <Button onClick={handleJoinRoom} disabled={!isConnected}>
                  <Users className="w-4 h-4 mr-2" />
                  Join Room
                </Button>
              ) : (
                <Button onClick={handleLeaveRoom} variant="destructive">
                  Leave Room
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Queue Display */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Queue ({queue.length} songs)</CardTitle>
                <Button onClick={handleAddSong} disabled={!isJoined} size="sm">
                  Add Test Song
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {queue.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No songs in queue. Add a test song to get started!
                  </p>
                ) : (
                  queue.map((song, index) => (
                    <div
                      key={song.id}
                      className={`p-3 border rounded-lg ${
                        index === currentIndex ? 'bg-primary/10 border-primary' : 'bg-card'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{song.title}</div>
                          <div className="text-xs text-muted-foreground">
                            by {song.artist} • Added by {song.addedBy}
                          </div>
                        </div>

                        {isHost && (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleSetCurrentSong(index)}
                              className="h-8 w-8"
                            >
                              <Play className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleReorderSong(index, 'up')}
                              disabled={index === 0}
                              className="h-8 w-8"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleReorderSong(index, 'down')}
                              disabled={index === queue.length - 1}
                              className="h-8 w-8"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveSong(index)}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Event Log */}
          <Card>
            <CardHeader>
              <CardTitle>Event Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No events yet. Join a room to see activity!
                  </p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="text-muted-foreground">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Test Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. Open this page in <strong>multiple browser windows/tabs</strong></p>
            <p>2. Use the <strong>same Room GUID</strong> in all windows</p>
            <p>3. Set one as <strong>Host</strong> and others as <strong>Guest</strong></p>
            <p>4. Try these actions:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Guest adds a song → Host should see it instantly</li>
              <li>Host removes a song → Guest should see it disappear</li>
              <li>Host reorders songs → Guest should see the new order</li>
              <li>Host changes current song → Guest should see the highlight</li>
            </ul>
            <p className="text-primary font-medium">
              ✨ All changes should appear in real-time across all windows!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SocketTest;
