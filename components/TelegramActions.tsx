

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
    getUserDisplayName
  } = useTelegram();
  const [isProcessing, setIsProcessing] = useState(false);

  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  const handleDownload = useCallback(async () => {
    if (!hasLayers || !memeCanvasRef.current) {
      showAlert('Please create a meme first!');
      return;
    }

    setIsProcessing(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(memeCanvasRef.current, {
        useCORS: true,
        backgroundColor: '#0F0F0F',
        scale: 2,
        onclone: (documentClone) => {
          // Hide interaction handles and outlines
          documentClone.querySelectorAll('.interaction-handle').forEach(el => (el as HTMLElement).style.display = 'none');
          documentClone.querySelectorAll('.layer-selected-outline').forEach(el => (el as HTMLElement).style.border = 'none');
          
          // Process sticker effects for html2canvas compatibility
          documentClone.querySelectorAll('img[data-is-sticker="true"]').forEach(img => {
            const imgElement = img as HTMLImageElement;
            const computedStyle = window.getComputedStyle(imgElement);
            const filter = computedStyle.filter;
            
            // If filter exists and contains drop-shadow, create a canvas version
            if (filter && filter.includes('drop-shadow')) {
              renderStickerWithEffects(imgElement, filter);
            }
          });
        }
      });
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));

      if (!blob) {
        showAlert('Could not generate meme image.');
        setIsProcessing(false);
        return;
      }

      const file = new File([blob], 'meme.jpg', { type: 'image/jpeg' });
      const shareData = {
        files: [file],
        title: 'Sendit Meme',
      };

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(shareData);
      } else {
        // Fallback for browsers that don't support file sharing via Web Share API
        // This will trigger a traditional download
        const image = canvas.toDataURL('image/jpeg', 0.9);
        const link = downloadLinkRef.current;
        if (link) {
          link.href = image;
          link.download = `sendit-meme-${Date.now()}.jpg`;
          link.click();
        }
        showAlert('Meme downloaded! 📱');
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Download failed:', error);
        showAlert('Download failed. Please try again.');
      }
    } finally {
        setIsProcessing(false);
    }
  }, [hasLayers, memeCanvasRef, showAlert]);

  // Helper function to render sticker effects on canvas for html2canvas compatibility
  const renderStickerWithEffects = (imgElement: HTMLImageElement, filter: string) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match image
    canvas.width = imgElement.naturalWidth || imgElement.width;
    canvas.height = imgElement.naturalHeight || imgElement.height;

    // Parse filter effects
    const dropShadows = parseDropShadows(filter);
    
    // Create temporary image for drawing
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply drop shadows (draw multiple times with offsets)
      dropShadows.forEach(shadow => {
        ctx.shadowColor = shadow.color;
        ctx.shadowBlur = shadow.blur;
        ctx.shadowOffsetX = shadow.offsetX;
        ctx.shadowOffsetY = shadow.offsetY;
        ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
      });
      
      // Draw final image without shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
      
      // Replace original image with canvas
      imgElement.parentNode?.replaceChild(canvas, imgElement);
    };
    tempImg.src = imgElement.src;
  };

  // Parse CSS drop-shadow filter into individual shadow objects
  const parseDropShadows = (filter: string) => {
    const shadows: Array<{offsetX: number, offsetY: number, blur: number, color: string}> = [];
    const dropShadowRegex = /drop-shadow\(([^)]+)\)/g;
    let match;
    
    while ((match = dropShadowRegex.exec(filter)) !== null) {
      const shadowParams = match[1].trim().split(/\s+/);
      if (shadowParams.length >= 3) {
        const offsetX = parseFloat(shadowParams[0]);
        const offsetY = parseFloat(shadowParams[1]);
        const blur = parseFloat(shadowParams[2]);
        const color = shadowParams.slice(3).join(' ') || '#000000';
        
        shadows.push({ offsetX, offsetY, blur, color });
      }
    }
    
    return shadows;
  };

  const handleTelegramShare = useCallback(async () => {
    if (!hasLayers || !memeCanvasRef.current) {
      showAlert('Please create a meme first!');
      return;
    }
    setIsProcessing(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(memeCanvasRef.current, {
        useCORS: true,
        backgroundColor: '#0F0F0F',
        scale: 2,
        onclone: (documentClone) => {
          // Hide interaction handles and outlines
          documentClone.querySelectorAll('.interaction-handle').forEach(el => (el as HTMLElement).style.display = 'none');
          documentClone.querySelectorAll('.layer-selected-outline').forEach(el => (el as HTMLElement).style.border = 'none');
          
          // Process sticker effects for html2canvas compatibility
          documentClone.querySelectorAll('img[data-is-sticker="true"]').forEach(img => {
            const imgElement = img as HTMLImageElement;
            const computedStyle = window.getComputedStyle(imgElement);
            const filter = computedStyle.filter;
            
            // If filter exists and contains drop-shadow, create a canvas version
            if (filter && filter.includes('drop-shadow')) {
              renderStickerWithEffects(imgElement, filter);
            }
          });
        }
      });
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));

      if (!blob) {
        showAlert('Could not generate meme image.');
        setIsProcessing(false);
        return;
      }

      const file = new File([blob], 'meme.jpg', { type: 'image/jpeg' });
      const userDisplayName = getUserDisplayName();
      const shareData = {
        files: [file],
        title: 'Sendit Meme',
        text: `Check out this meme I made with Sendit Meme Generator!\n\nCreated by: ${userDisplayName}`,
      };

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(shareData);
      } else {
        showAlert('Your browser does not support sharing files directly. Please download the image and share it manually.');
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        showAlert('Share failed. Please try again.');
      }
    } finally {
        setIsProcessing(false);
    }
  }, [hasLayers, memeCanvasRef, showAlert, getUserDisplayName]);

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
              disabled={!hasLayers || isProcessing}
              className="action-button"
            >
              <Icon path="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              <span>Download</span>
            </Button>
            <Button
              onClick={handleTelegramShare}
              disabled={!hasLayers || isProcessing}
              className="action-button action-button--primary"
            >
              {isProcessing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Icon path="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
              )}
              <span>{isProcessing ? 'Sharing...' : 'Share'}</span>
            </Button>
        </div>
      </div>
    </div>
  );
};