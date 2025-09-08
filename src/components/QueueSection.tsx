import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { X, GripVertical, Music, Save, FolderOpen } from "lucide-react";
import { Song } from "./SongCard";
import { saveQueue, getSavedQueues, deleteQueue, type SavedQueue } from "@/services/apiService";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface QueueSectionProps {
  queue: Song[];
  onRemove: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSelect: (index: number) => void;
  currentIndex: number;
  onLoadQueue?: (songs: Song[]) => void;
}

export const QueueSection = ({ queue, onRemove, onSelect, currentIndex, onLoadQueue }: QueueSectionProps) => {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [queueName, setQueueName] = useState("");
  const [savedQueues, setSavedQueues] = useState<SavedQueue[]>([]);
  const [loading, setLoading] = useState(false);
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
    if (!queueName.trim()) {
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
      const success = await saveQueue(queueName.trim(), queue);
      if (success) {
        toast({
          title: "Queue Saved",
          description: `"${queueName}" has been saved successfully`,
        });
        setSaveDialogOpen(false);
        setQueueName("");
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

  const handleLoadQueue = (songs: Song[]) => {
    if (onLoadQueue) {
      onLoadQueue(songs);
      setLoadDialogOpen(false);
      toast({
        title: "Queue Loaded",
        description: `Loaded ${Array.isArray(songs) ? songs.length : 0} songs`,
      });
    }
  };

  return (
    <Card className="bg-card border-border shadow-card h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            Queue ({Array.isArray(queue) ? queue.length : 0})
          </CardTitle>
          <div className="flex gap-2">
            <Dialog open={loadDialogOpen} onOpenChange={(open) => {
              setLoadDialogOpen(open);
              if (open) loadSavedQueues();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
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
                          <Button onClick={() => handleLoadQueue(savedQueue.songs)}>
                            Load
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!Array.isArray(queue) || queue.length === 0}>
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
                    value={queueName}
                    onChange={(e) => setQueueName(e.target.value)}
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
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {!Array.isArray(queue) || queue.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Your queue is empty</p>
            <p className="text-sm">Search and add songs to get started!</p>
          </div>
        ) : (
          (Array.isArray(queue) ? queue : []).map((song, index) => (
            <div 
              key={`${song.id}-${index}`}
              className={`group flex items-center gap-3 p-3 rounded-lg border transition-smooth cursor-pointer
                ${index === currentIndex 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-secondary/50 border-border hover:bg-secondary'
                }`}
              onClick={() => onSelect(index)}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-smooth" />
              
              <img 
                src={song.thumbnail} 
                alt={song.title}
                className="w-12 h-12 object-cover rounded bg-muted flex-shrink-0"
              />
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate text-card-foreground">
                  {song.title}
                </h4>
                <p className="text-xs text-muted-foreground truncate">
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
                  onRemove(index);
                }}
                className="opacity-0 group-hover:opacity-100 transition-smooth hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};