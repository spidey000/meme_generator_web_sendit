

import React, { useCallback, useRef } from 'react';
import { useTelegram } from '@/lib/hooks/useTelegram';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';

interface TelegramActionsProps {
  memeCanvasRef: React.RefObject<HTMLDivElement>;
  hasLayers: boolean;
  className?: string;
}

export const TelegramActions: React.FC<TelegramActionsProps> = ({
  memeCanvasRef,
  hasLayers,
  className = ''
}) => {
  const {
    isTelegramWebApp,
    showAlert,
    openTelegramShare,
    sendData,
    getUserDisplayName
  } = useTelegram();

  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  const handleDownload = useCallback(async () => {
    if (!hasLayers || !memeCanvasRef.current) {
      showAlert('Please create a meme first!');
      return;
    }

    try {
      // Use html2canvas (your existing export logic)
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(memeCanvasRef.current, {
        useCORS: true,
        backgroundColor: '#0F0F0F', // Your brand primary bg
        scale: 2, // Higher quality for mobile
      });

      const image = canvas.toDataURL('image/jpeg', 0.9);
      
      // Create download link
      const link = downloadLinkRef.current;
      if (link) {
        link.href = image;
        link.download = `sendit-meme-${Date.now()}.jpg`;
        link.click();
      }
      
      showAlert('Meme downloaded! 📱');
    } catch (error) {
      console.error('Download failed:', error);
      showAlert('Download failed. Please try again.');
    }
  }, [hasLayers, memeCanvasRef, showAlert]);

  const handleTelegramShare = useCallback(async () => {
    if (!hasLayers || !memeCanvasRef.current) {
      showAlert('Please create a meme first!');
      return;
    }

    try {
      const userDisplayName = getUserDisplayName();
      const shareText = `🎨 Check out this awesome meme I created!\n\nMade by ${userDisplayName} with Sendit Meme Generator`;
      
      // For now, share the app URL - in Phase 3 we'll add image upload
      const appUrl = window.location.origin;
      openTelegramShare(shareText, appUrl);
      
    } catch (error) {
      console.error('Share failed:', error);
      showAlert('Share failed. Please try again.');
    }
  }, [hasLayers, memeCanvasRef, showAlert, getUserDisplayName, openTelegramShare]);

  const handleSendToBot = useCallback(async () => {
    if (!hasLayers || !memeCanvasRef.current) {
      showAlert('Please create a meme first!');
      return;
    }

    try {
      // Use html2canvas to generate image data
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(memeCanvasRef.current, {
        useCORS: true,
        backgroundColor: '#0F0F0F',
        scale: 1, // Smaller for data transmission
      });

      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      const memeData = {
        type: 'send_to_channel',
        imageData: imageData,
        user: useTelegram().user,
        timestamp: Date.now(),
        appVersion: '1.0.0'
      };

      sendData(memeData);
      showAlert('🎉 Meme sent to channel!');
      
    } catch (error) {
      console.error('Send to bot failed:', error);
      showAlert('Failed to send meme. Please try again.');
    }
  }, [hasLayers, memeCanvasRef, showAlert, sendData]);

  // Don't render if not in Telegram
  if (!isTelegramWebApp) {
    return null;
  }

  return (
    <div className={`telegram-actions space-y-4 ${className}`}>
      {/* Hidden download link for programmatic downloads */}
      <a ref={downloadLinkRef} style={{ display: 'none' }} />
      
      {/* User Info Display */}
      <div className="bg-gray-800 rounded-lg p-3 flex items-center space-x-3">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
          {getUserDisplayName().charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-white font-medium">{getUserDisplayName()}</div>
          <div className="text-gray-400 text-sm">Creating awesome memes 🎨</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleDownload}
          disabled={!hasLayers}
          className="w-full flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700"
        >
          <Icon path="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          <span>Download Meme</span>
        </Button>

        <Button
          onClick={handleTelegramShare}
          disabled={!hasLayers}
          className="w-full flex items-center justify-center space-x-3 bg-green-600 hover:bg-green-700"
        >
          <Icon path="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" />
          <span>Share in Telegram</span>
        </Button>

        <Button
          onClick={handleSendToBot}
          disabled={!hasLayers}
          className="w-full flex items-center justify-center space-x-3 bg-purple-600 hover:bg-purple-700"
        >
          <Icon path="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
          <span>Send to Channel</span>
        </Button>
      </div>
    </div>
  );
};