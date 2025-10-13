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
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg border">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="QR Code for sharing queue"
                className="w-48 h-48"
              />
            ) : (
              <div className="w-48 h-48 bg-muted animate-pulse rounded" />
            )}
          </div>

          {/* Share URL with copy button */}
          <div className="w-full space-y-2">
            <div className="flex items-center space-x-2">
              <div className="flex-1 px-3 py-2 bg-muted rounded text-sm text-muted-foreground break-all">
                {shareUrl}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyUrl}
                className="flex-shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Scan QR code or copy link to share this queue
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};