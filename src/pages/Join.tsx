import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Music, User } from "lucide-react";
import { getSharedQueue, type SavedQueue } from "@/services/apiService";
import { useToast } from "@/hooks/use-toast";

const Join = () => {
  const { guid } = useParams<{ guid: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [userName, setUserName] = useState("");
  const [queueData, setQueueData] = useState<SavedQueue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const loadQueueData = async () => {
      if (!guid) {
        navigate("/", { replace: true });
        return;
      }

      try {
        const queue = await getSharedQueue(guid);
        if (queue) {
          setQueueData(queue);
        } else {
          toast({
            title: "Room Not Found",
            description: "The karaoke room you're trying to join doesn't exist or has expired.",
            variant: "destructive"
          });
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error('Error loading queue data:', error);
        toast({
          title: "Error",
          description: "Failed to load room information. Please try again.",
          variant: "destructive"
        });
        navigate("/", { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    loadQueueData();
  }, [guid, navigate, toast]);

  const handleJoinRoom = () => {
    if (userName.trim().length < 2) {
      toast({
        title: "Invalid Name",
        description: "Please enter a name with at least 2 characters.",
        variant: "destructive"
      });
      return;
    }

    if (userName.trim().length > 16) {
      toast({
        title: "Name Too Long",
        description: "Please enter a name with 16 characters or less.",
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);
    
    // Store user name in localStorage
    localStorage.setItem('singtube_user_name', userName.trim());
    
    // Navigate to room
    navigate(`/room/${guid}`, { replace: true });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoinRoom();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!queueData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Music className="w-6 h-6 text-primary" />
            {queueData.name}
          </CardTitle>
          <p className="text-muted-foreground">
            Enter your name to join this karaoke room
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="userName" className="text-sm font-medium">
              Your Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="userName"
                type="text"
                placeholder="Enter your name..."
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
                maxLength={16}
                disabled={isJoining}
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              2-16 characters
            </p>
          </div>
          
          <Button 
            onClick={handleJoinRoom}
            disabled={userName.trim().length < 2 || userName.trim().length > 16 || isJoining}
            className="w-full"
          >
            {isJoining ? "Joining..." : "Enter Room"}
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {queueData.songs?.length || 0} songs in queue
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Join;