import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { X, GripVertical, Music, Maximize2, Minimize2, Play, Pause, SkipBack, SkipForward, Share2, Copy, TrendingUp, Edit, Check, Users } from "lucide-react";
import { Song } from "./SongCard";
import { ShareQRDialog } from "./ShareQRDialog";
import { saveQueue, getSavedQueues, deleteQueue, updateQueue, type SavedQueue } from "@/services/apiService";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";

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
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  queueName?: string;
  queueId?: number | null;
  onUpdateQueueName?: (newName: string) => void;
  onOpenShareDialog?: () => void;
  onBecomeHost?: () => void;
}

export const QueueSection = ({ queue, onRemove, onReorder, onSelect, onPlay, onPause, onNext, onPrevious, onDoubleClickPlay, currentIndex, isPlaying = false, canGoNext = false, canGoPrevious = false, isMaximized = false, onToggleMaximize, queueName, queueId, onUpdateQueueName, onOpenShareDialog, onBecomeHost }: QueueSectionProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userName } = useUser();
  const [shareQRDialogOpen, setShareQRDialogOpen] = useState(false);
  const [shareData, setShareData] = useState<{ url: string; name: string }>({ url: "", name: "" });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [fadingOutItems, setFadingOutItems] = useState<Set<string>>(new Set());
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(queueName || "");
  const { toast } = useToast();




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

  const handleEditTitle = () => {
    setEditTitleValue(queueName || "");
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!editTitleValue.trim()) {
      setIsEditingTitle(false);
      return;
    }

    try {
      // If we have a queueId, update the queue in the database
      if (queueId && queueId > 0) {
        const success = await updateQueue(queueId, editTitleValue.trim(), queue);
        if (success) {
          toast({
            title: "Queue name updated",
            description: `Queue renamed to "${editTitleValue.trim()}"`,
          });
        } else {
          toast({
            title: "Update failed",
            description: "Could not update queue name",
            variant: "destructive"
          });
          setEditTitleValue(queueName || "");
          setIsEditingTitle(false);
          return;
        }
      }

      // Call the parent callback to update the local state
      if (onUpdateQueueName) {
        onUpdateQueueName(editTitleValue.trim());
      }
      
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Update queue name error:', error);
      toast({
        title: "Update failed",
        description: "Could not update queue name",
        variant: "destructive"
      });
      setEditTitleValue(queueName || "");
      setIsEditingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitleValue(queueName || "");
    setIsEditingTitle(false);
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };



  return (
    <>
      {isMaximized && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onToggleMaximize} />
      )}
      <Card className={`bg-card border-border shadow-card ${isMaximized ? 'fixed inset-4 z-50 flex flex-col max-w-4xl mx-auto' : 'flex flex-col max-h-screen'}`} data-tutorial="queue-section">
        <CardHeader>
          {/* Mobile Layout: Title on top row, controls below */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-0">
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              <div className="flex items-center gap-2 flex-1">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onKeyPress={handleTitleKeyPress}
                      onBlur={handleCancelEdit}
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSaveTitle}
                      className="h-6 w-6"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 flex-1">
                    <h3 className="flex items-center gap-2">
                      {queueName || t('app.queue.title')} ({Array.isArray(queue) ? queue.length : 0})
                      {onUpdateQueueName && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleEditTitle}
                          className="h-6 w-6 opacity-60 hover:opacity-100"
                          title={t('app.queue.editQueueName')}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </h3>
                    {onOpenShareDialog && (
                      <Button
                        variant="link"
                        onClick={onOpenShareDialog}
                        className="text-primary hover:text-primary/80 p-0 h-auto font-normal text-lg"
                      >
                        ({t('app.queue.howToJoin')})
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardTitle>
            
            {/* Queue Actions */}
            <div className="flex gap-2" data-tutorial="queue-actions">
                {/* Top Songs Link */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/top-songs')}
                  title={t('app.topSongs.viewTopSongs')}
                  className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 hover:border-primary/40"
                >
                  <TrendingUp className="w-4 h-4" />
                </Button>
                
                
                
                
                
                {onToggleMaximize && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onToggleMaximize}
                    title={isMaximized ? t('app.queue.tooltips.restoreQueue') : t('app.queue.tooltips.maximizeQueue')}
                    data-tutorial="maximize-button"
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
              <p>{t('app.queue.emptyMessage')}</p>
              <p className="text-sm">{t('app.queue.getStarted')}</p>
            </div>
          ) : (
            (Array.isArray(queue) ? queue : []).map((song, index) => {
              const itemKey = `${song.id}-${index}`;
              const isFadingOut = fadingOutItems.has(itemKey);
              const isAddedByOther = song.addedBy && song.addedBy !== userName && song.addedBy !== "Unknown";
              
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
                  <div className="flex items-center gap-2 md:gap-3 mr-2 md:mr-3">
                    <span className={`text-sm md:text-lg font-mono font-bold w-6 md:w-8 text-center ${
                      index === currentIndex ? 'text-primary' : 'text-foreground'
                    }`}>
                      {index + 1}
                    </span>
                    <GripVertical className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground opacity-60 group-hover:opacity-100 transition-smooth cursor-grab active:cursor-grabbing" />
                  </div>
                  
                  <img 
                    src={song.thumbnail} 
                    alt={song.title}
                    className="w-12 h-12 md:w-16 md:h-16 object-cover rounded bg-muted flex-shrink-0"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-lg md:text-2xl truncate text-card-foreground leading-tight">
                      {song.title}
                    </h4>
                    <p className="text-xs md:text-sm text-muted-foreground truncate mt-1">
                      {song.artist}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {song.duration}
                      </span>
                      {song.addedBy && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <div className="flex items-center gap-1">
                            {isAddedByOther && <Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                            <span className={`text-xs font-medium ${
                              isAddedByOther 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-primary'
                            }`}>
                              Added by {song.addedBy}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveWithFadeOut(index);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-smooth hover:bg-destructive hover:text-destructive-foreground"
                    title={t('app.queue.tooltips.removeFromQueue')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Share QR Dialog */}
      <ShareQRDialog
        isOpen={shareQRDialogOpen}
        onClose={() => setShareQRDialogOpen(false)}
        shareUrl={shareData.url}
        queueName={shareData.name}
      />
    </>
  );
};