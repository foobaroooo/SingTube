import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { X, GripVertical, Music, Save, FolderOpen, Maximize2, Minimize2, Play, Pause, SkipBack, SkipForward, Share2, Copy } from "lucide-react";
import { Song } from "./SongCard";
import { saveQueue, getSavedQueues, deleteQueue, type SavedQueue } from "@/services/apiService";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface QueueSectionProps {
  queue: Song[];
  onRemove: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSelect: (index: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onDoubleClickPlay?: (index: number) => void;
  currentIndex: number;
  isPlaying?: boolean;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  onLoadQueue?: (songs: Song[], queueName: string, queueId?: number) => void;
  onQueueSaved?: (queueName: string, queueId?: number) => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  queueName?: string;
  queueId?: number | null;
}

export const QueueSection = ({ queue, onRemove, onReorder, onSelect, onPlay, onPause, onNext, onPrevious, onDoubleClickPlay, currentIndex, isPlaying = false, canGoNext = false, canGoPrevious = false, onLoadQueue, onQueueSaved, isMaximized = false, onToggleMaximize, queueName, queueId }: QueueSectionProps) => {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [saveQueueName, setSaveQueueName] = useState("");
  const [savedQueues, setSavedQueues] = useState<SavedQueue[]>([]);
  const [loading, setLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [fadingOutItems, setFadingOutItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const loadSavedQueues = async () => {
    try {
      setLoading(true);
      const queues = await getSavedQueues();
      setSavedQueues(queues);
    } catch (error) {
      console.error('Failed to load saved queues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQueue = async () => {
    if (!saveQueueName.trim()) {
      toast({
        title: "Invalid Name",
        description: "Please enter a queue name",
        variant: "destructive"
      });
      return;
    }

    if (!Array.isArray(queue) || queue.length === 0) {
      toast({
        title: "Empty Queue",
        description: "Cannot save an empty queue",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const success = await saveQueue(saveQueueName.trim(), queue);
      if (success) {
        const newQueueName = saveQueueName.trim();
        toast({
          title: "Queue Saved",
          description: `"${newQueueName}" has been saved successfully`,
        });
        setSaveDialogOpen(false);
        setSaveQueueName("");
        
        // Update the queue name in the parent component
        if (onQueueSaved) {
          onQueueSaved(newQueueName);
        }
        
        await loadSavedQueues(); // Refresh the list
      } else {
        toast({
          title: "Save Failed",
          description: "Could not save the queue",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save the queue",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadQueue = (songs: Song[], savedQueueName: string, savedQueueId: number) => {
    if (onLoadQueue) {
      onLoadQueue(songs, savedQueueName, savedQueueId);
      setLoadDialogOpen(false);
      toast({
        title: "Queue Loaded",
        description: `Loaded "${savedQueueName}" with ${Array.isArray(songs) ? songs.length : 0} songs`,
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorder(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleRemoveWithFadeOut = (index: number) => {
    const song = queue[index];
    const itemKey = `${song.id}-${index}`;
    
    // Start fade-out animation
    setFadingOutItems(prev => new Set(prev).add(itemKey));
    
    // Remove item after animation completes
    setTimeout(() => {
      onRemove(index);
      setFadingOutItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }, 300);
  };



  return (
    <>
      {isMaximized && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onToggleMaximize} />
      )}
      <Card className={`bg-card border-border shadow-card ${isMaximized ? 'fixed inset-4 z-50 flex flex-col max-w-4xl mx-auto' : 'flex flex-col max-h-screen'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            <div className="flex flex-col">
              <span>{queueName || 'Song Queue'} ({Array.isArray(queue) ? queue.length : 0})</span>
            </div>
          </CardTitle>
          
          {/* Playback Controls */}
          {(onPlay || onPause || onNext || onPrevious) && (
            <div className="flex items-center gap-2">
              {/* Previous Button */}
              {onPrevious && (
                <Button
                  onClick={onPrevious}
                  disabled={!canGoPrevious}
                  variant="outline"
                  size="icon"
                  className="rounded-full w-10 h-10"
                  title="Previous song"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
              )}
              
              {/* Play/Pause Button */}
              {(onPlay || onPause) && (
                <Button
                  onClick={isPlaying ? onPause : onPlay}
                  disabled={currentIndex < 0 || !Array.isArray(queue) || queue.length === 0}
                  size="icon"
                  className="rounded-full bg-gradient-primary hover:shadow-neon transition-bounce w-12 h-12"
                  title={
                    currentIndex < 0 || !Array.isArray(queue) || queue.length === 0
                      ? "No song selected"
                      : isPlaying
                      ? `Pause: ${queue[currentIndex]?.title}`
                      : `Play: ${queue[currentIndex]?.title}`
                  }
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current" />
                  )}
                </Button>
              )}
              
              {/* Next Button */}
              {onNext && (
                <Button
                  onClick={onNext}
                  disabled={!canGoNext}
                  variant="outline"
                  size="icon"
                  className="rounded-full w-10 h-10"
                  title="Next song"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
          
          <div className="flex gap-2">
            <Dialog open={loadDialogOpen} onOpenChange={(open) => {
              setLoadDialogOpen(open);
              if (open) loadSavedQueues();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" title="Load saved queue">
                  <FolderOpen className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Load Saved Queue</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {loading ? (
                    <p className="text-muted-foreground">Loading saved queues...</p>
                  ) : !Array.isArray(savedQueues) || savedQueues.length === 0 ? (
                    <p className="text-muted-foreground">No saved queues found</p>
                  ) : (
                    (Array.isArray(savedQueues) ? savedQueues : []).map((savedQueue) => (
                      <div key={savedQueue.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <h4 className="font-medium">{savedQueue.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {Array.isArray(savedQueue.songs) ? savedQueue.songs.length : 0} songs • {new Date(savedQueue.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                              try {
                                await deleteQueue(savedQueue.id);
                                await loadSavedQueues();
                                toast({
                                  title: "Queue Deleted",
                                  description: `"${savedQueue.name}" has been deleted`,
                                });
                              } catch (error) {
                                toast({
                                  title: "Delete Failed",
                                  description: "Could not delete the queue",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            Delete
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                              const shareUrl = `${window.location.origin}/?share=${savedQueue.guid}`;
                              try {
                                await navigator.clipboard.writeText(shareUrl);
                                toast({
                                  title: "Share Link Copied",
                                  description: "The shareable link has been copied to your clipboard",
                                });
                              } catch (error) {
                                // Fallback for older browsers
                                const textArea = document.createElement('textarea');
                                textArea.value = shareUrl;
                                document.body.appendChild(textArea);
                                textArea.select();
                                document.execCommand('copy');
                                document.body.removeChild(textArea);
                                toast({
                                  title: "Share Link Copied",
                                  description: "The shareable link has been copied to your clipboard",
                                });
                              }
                            }}
                            title="Copy share link"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <Button onClick={() => handleLoadQueue(savedQueue.songs, savedQueue.name, savedQueue.id)}>
                            Load
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!Array.isArray(queue) || queue.length === 0}
              onClick={async () => {
                if (!Array.isArray(queue) || queue.length === 0) {
                  toast({
                    title: "Empty Queue",
                    description: "Cannot share an empty queue",
                    variant: "destructive"
                  });
                  return;
                }
                
                // Create a temporary queue object with current queue data
                const tempQueue = {
                  name: queueName || "Shared Queue",
                  songs: queue
                };
                
                try {
                  // Save the queue temporarily to get a GUID for sharing
                  const saveResponse = await saveQueue(tempQueue.name, tempQueue.songs);
                  if (saveResponse) {
                    // Get the GUID from the latest saved queues
                    const savedQueues = await getSavedQueues();
                    // Find the most recently created queue (should be ours)
                    const newQueue = savedQueues.sort((a, b) => 
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )[0];
                    
                    if (newQueue && newQueue.guid) {
                      const shareUrl = `${window.location.origin}/?share=${newQueue.guid}`;
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        toast({
                          title: "Queue Shared Successfully",
                          description: `"${tempQueue.name}" share link copied to clipboard`,
                        });
                      } catch (error) {
                        // Fallback for older browsers
                        const textArea = document.createElement('textarea');
                        textArea.value = shareUrl;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        toast({
                          title: "Queue Shared Successfully", 
                          description: `"${tempQueue.name}" share link copied to clipboard`,
                        });
                      }
                    } else {
                      throw new Error("Failed to get GUID for sharing");
                    }
                  } else {
                    throw new Error("Failed to save queue for sharing");
                  }
                } catch (error) {
                  console.error('Share current queue error:', error);
                  toast({
                    title: "Share Failed",
                    description: "Could not create share link for current queue",
                    variant: "destructive"
                  });
                }
              }}
              title="Share current queue"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!Array.isArray(queue) || queue.length === 0} title="Save current queue">
                  <Save className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Current Queue</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Enter queue name..."
                    value={saveQueueName}
                    onChange={(e) => setSaveQueueName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveQueue()}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveQueue}>
                      Save Queue
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {onToggleMaximize && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onToggleMaximize}
                title={isMaximized ? "Restore queue" : "Maximize queue"}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={`p-4 space-y-3 overflow-y-scroll flex-1 min-h-0 ${isMaximized ? '' : ''}`}>
        {!Array.isArray(queue) || queue.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Your queue is empty</p>
            <p className="text-sm">Search and add songs to get started!</p>
          </div>
        ) : (
          (Array.isArray(queue) ? queue : []).map((song, index) => {
            const itemKey = `${song.id}-${index}`;
            const isFadingOut = fadingOutItems.has(itemKey);
            
            return (
              <div 
                key={itemKey}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`group flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-300 ease-in-out
                  ${index === currentIndex 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-secondary/50 border-border hover:bg-secondary'
                  }
                  ${draggedIndex === index ? 'opacity-50' : ''}
                  ${dragOverIndex === index && draggedIndex !== index ? 'border-primary border-2' : ''}
                  ${isFadingOut ? 'opacity-0 scale-95 translate-x-4' : ''}
                `}
                onClick={() => onSelect(index)}
                onDoubleClick={() => onDoubleClickPlay && onDoubleClickPlay(index)}
              >
                <div className="flex items-center gap-3 mr-3">
                  <span className={`text-lg font-mono font-bold w-8 text-center ${
                    index === currentIndex ? 'text-primary' : 'text-foreground'
                  }`}>
                    {index + 1}
                  </span>
                  <GripVertical className="w-4 h-4 text-muted-foreground opacity-60 group-hover:opacity-100 transition-smooth cursor-grab active:cursor-grabbing" title="Drag to reorder" />
                </div>
                
                <img 
                  src={song.thumbnail} 
                  alt={song.title}
                  className="w-12 h-12 object-cover rounded bg-muted flex-shrink-0"
                />
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-2xl truncate text-card-foreground leading-tight">
                    {song.title}
                  </h4>
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {song.artist}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {song.duration}
                  </span>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveWithFadeOut(index);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-smooth hover:bg-destructive hover:text-destructive-foreground"
                  title="Remove song from queue"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
    </>
  );
};