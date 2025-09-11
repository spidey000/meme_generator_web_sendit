/**
 * Debug component for testing share functionality across different platforms
 * This component can be temporarily added to test Telegram browser compatibility
 */

import React, { useEffect } from 'react';
import { Button } from './common/Button';
import { getTelegramEnvironment, testShareFunctionality } from '../utils/share';

interface ShareDebuggerProps {
  onTestComplete?: (results: any) => void;
}

const ShareDebugger: React.FC<ShareDebuggerProps> = ({ onTestComplete }) => {
  const env = getTelegramEnvironment();
  const [debugMode, setDebugMode] = React.useState(false);
  const isBrave = env.isBrave;

  useEffect(() => {
    // Enable debug mode
    (window as any).DEBUG_TELEGRAM_SHARE = debugMode;
    console.log('Debug mode:', debugMode);
  }, [debugMode]);

  const handleTest = () => {
    const results = testShareFunctionality();
    onTestComplete?.(results);
  };

  const handleCreateTestBlob = async () => {
    // Create a test image blob
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Draw a simple test image
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('TEST IMAGE', 100, 100);
      ctx.fillText('Share Me!', 100, 130);
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });
      
      return blob;
    }
    return null;
  };

  const handleTestShare = async () => {
    const blob = await handleCreateTestBlob();
    if (blob) {
      try {
        const { shareImageBlob } = await import('../utils/share');
        await shareImageBlob(blob, {
          filename: 'test-share.png',
          title: 'Test Share',
          text: 'This is a test share',
          url: window.location.href
        });
      } catch (error) {
        console.error('Test share failed:', error);
      }
    }
  };

  const handleTestDownload = async () => {
    const blob = await handleCreateTestBlob();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'test-download.png';
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-sm z-50 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">🔧 Share Debugger</h3>
        <Button
          variant="icon"
          size="sm"
          onClick={() => setDebugMode(!debugMode)}
          className="text-gray-400 hover:text-white"
        >
          <span className="text-xs">{debugMode ? '🐛' : '🔍'}</span>
        </Button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="bg-gray-800 p-2 rounded">
          <p><strong>Platform:</strong> {env.platform}</p>
          <p><strong>Telegram:</strong> {env.isTelegram ? '✅' : '❌'}</p>
          <p><strong>Brave:</strong> {env.isBrave ? '✅' : '❌'}</p>
          <p><strong>Debug Mode:</strong> {debugMode ? '✅' : '❌'}</p>
        </div>
        
        <div className="space-y-1">
          <Button
            onClick={handleTest}
            fullWidth
            size="sm"
            className="text-xs"
          >
            Run Tests
          </Button>
          <Button
            onClick={handleTestShare}
            fullWidth
            size="sm"
            variant="secondary"
            className="text-xs"
          >
            Test Share
          </Button>
          <Button
            onClick={handleTestDownload}
            fullWidth
            size="sm"
            variant="secondary"
            className="text-xs"
          >
            Test Download
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShareDebugger;