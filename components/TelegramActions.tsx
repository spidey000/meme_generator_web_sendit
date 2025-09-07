

import React, { useCallback, useRef, useState } from 'react';
import { useTelegram } from '@/lib/hooks/useTelegram';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';

interface TelegramActionsProps {
  memeCanvasRef: React.RefObject<HTMLDivElement>;
  hasLayers: boolean;
}

export const TelegramActions: React.FC<TelegramActionsProps> = ({
  memeCanvasRef,
  hasLayers,
}) => {
  const {
    isTelegramWebApp,
    showAlert,
    openTelegramShare,
    getUserDisplayName
  } = useTelegram();
  const [isSharing, setIsSharing] = useState(false);

  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  const handleDownload = useCallback(async () => {
    if (!hasLayers || !memeCanvasRef.current) {
      showAlert('Please create a meme first!');
      return;
    }

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(memeCanvasRef.current, {
        useCORS: true,
        backgroundColor: '#0F0F0F',
        scale: 2,
      });
      const image = canvas.toDataURL('image/jpeg', 0.9);
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
    setIsSharing(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(memeCanvasRef.current, {
        useCORS: true,
        backgroundColor: '#0F0F0F',
        scale: 2,
      });
      const imageData = canvas.toDataURL('image/jpeg', 0.9);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const { url } = await response.json();

      const userDisplayName = getUserDisplayName();
      const shareText = `🎨 Check out this awesome meme I created!\n\nMade by ${userDisplayName} with Sendit Meme Generator`;
      
      openTelegramShare(shareText, url);

    } catch (error) {
      console.error('Share failed:', error);
      showAlert('Share failed. Please try again.');
    } finally {
        setIsSharing(false);
    }
  }, [hasLayers, memeCanvasRef, showAlert, getUserDisplayName, openTelegramShare]);

  if (!isTelegramWebApp) {
    return null;
  }

  return (
    <div className="telegram-actions-banner">
      <a ref={downloadLinkRef} style={{ display: 'none' }} />
      <div className="telegram-actions-banner__content">
        <div className="user-info">
            <div className="user-avatar">
            {getUserDisplayName().charAt(0).toUpperCase()}
            </div>
            <div className="user-name">{getUserDisplayName()}</div>
        </div>
        <div className="actions">
            <Button
              onClick={handleDownload}
              disabled={!hasLayers || isSharing}
              className="action-button"
            >
              <Icon path="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              <span>Download</span>
            </Button>
            <Button
              onClick={handleTelegramShare}
              disabled={!hasLayers || isSharing}
              className="action-button action-button--primary"
            >
              {isSharing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Icon path="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" />
              )}
              <span>{isSharing ? 'Sharing...' : 'Share'}</span>
            </Button>
        </div>
      </div>
    </div>
  );
};
