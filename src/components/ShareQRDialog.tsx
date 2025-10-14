import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, X } from "lucide-react";

interface ShareQRDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  queueName: string;
}

export const ShareQRDialog = ({ isOpen, onClose, shareUrl, queueName }: ShareQRDialogProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    if (isOpen && shareUrl) {
      // Generate QR code when dialog opens
      QRCode.toDataURL(shareUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
        .then((url) => {
          setQrCodeUrl(url);
        })
        .catch((err) => {
          console.error('Failed to generate QR code:', err);
        });
    }
  }, [isOpen, shareUrl]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied",
        description: "Share link copied to clipboard",
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
        title: "Link Copied",
        description: "Share link copied to clipboard",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Share "{queueName}"
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          {/* Instructions */}
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-foreground">
              Share this karaoke room with friends
            </p>
            <p className="text-xs text-muted-foreground">
              Scan with your phone or share the link to join the same queue
            </p>
          </div>

          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="QR Code for joining karaoke room"
                className="w-48 h-48"
              />
            ) : (
              <div className="w-48 h-48 bg-muted animate-pulse rounded" />
            )}
          </div>

          {/* Share URL with copy button */}
          <div className="w-full space-y-3">
            <div className="flex items-center space-x-2">
              <div className="flex-1 px-3 py-2 bg-muted rounded text-sm text-muted-foreground break-all">
                {shareUrl}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyUrl}
                className="flex-shrink-0"
                title="Copy link to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">
                📱 <strong>Mobile:</strong> Scan QR code with camera
              </p>
              <p className="text-xs text-muted-foreground">
                💻 <strong>Desktop:</strong> Copy and share the link above
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};