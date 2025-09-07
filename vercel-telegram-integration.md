# Telegram Web App Integration for Sendit Meme Generator
## Integrating with Your Existing Vercel Deployment

This guide provides step-by-step instructions to add Telegram Web App functionality to your existing React TypeScript meme generator while maintaining your current Vercel deployment.

---

## 🎯 Integration Overview

**Goal**: Add Telegram Web App features to your existing app without breaking current functionality.

**Approach**: 
- Feature detection - show Telegram options only when running inside Telegram
- Leverage your existing layer system and export functionality
- Enhance sharing capabilities with Telegram-specific features

---

## 📋 Phase 1: Telegram Bot Setup

### Step 1.1: Create Your Telegram Bot

```bash
# 1. Open Telegram and find @BotFather
# 2. Send: /newbot
# 3. Follow prompts to create "Sendit Meme Generator Bot"
# 4. Save the bot token for later use
```

### Step 1.2: Configure Web App Button

```bash
# In BotFather chat:
/mybots -> Select your bot -> Bot Settings -> Menu Button -> Configure Menu Button

# Set:
# Button Text: "Create Meme 🎨"
# Web App URL: https://your-vercel-app.vercel.app
```

---

## 🔧 Phase 2: Code Integration

### Step 2.1: Install Telegram Web App Types

```bash
# In your project root
npm install --save-dev @types/telegram-web-app
```

### Step 2.2: Update index.html

Add the Telegram SDK script to your `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sendit Meme Generator</title>
    
    <!-- Add Telegram Web App SDK -->
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Your existing Tailwind config -->
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
```

### Step 2.3: Create Telegram Types

Create `src/types/telegram.d.ts`:

```typescript
// Extend existing types.ts or create new file
export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    receiver?: TelegramUser;
    chat?: TelegramChat;
    chat_type?: string;
    chat_instance?: string;
    start_param?: string;
    can_send_after?: number;
    auth_date: number;
    hash: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  
  // Methods
  ready(): void;
  expand(): void;
  close(): void;
  sendData(data: string): void;
  openTelegramLink(url: string): void;
  showAlert(message: string): void;
  showConfirm(message: string): Promise<boolean>;
  
  // Main Button
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show(): any;
    hide(): any;
    setText(text: string): any;
    onClick(callback: () => void): any;
    offClick(callback: () => void): any;
  };
  
  // Events
  onEvent(eventType: string, callback: Function): void;
  offEvent(eventType: string, callback: Function): void;
}

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramChat {
  id: number;
  type: 'group' | 'supergroup' | 'channel';
  title: string;
  username?: string;
}

// Extend Window interface
declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}
```

### Step 2.4: Create Telegram Utility Hook

Create `src/hooks/useTelegram.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { TelegramWebApp, TelegramUser } from '../types/telegram';

interface UseTelegramReturn {
  webApp: TelegramWebApp | null;
  user: TelegramUser | null;
  isTelegramWebApp: boolean;
  showAlert: (message: string) => void;
  showConfirm: (message: string) => Promise<boolean>;
  close: () => void;
  openTelegramShare: (text: string, url?: string) => void;
  sendData: (data: any) => void;
  getUserDisplayName: () => string;
  setupMainButton: (text: string, onClick: () => void) => void;
  hideMainButton: () => void;
}

export const useTelegram = (): UseTelegramReturn => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false);

  useEffect(() => {
    const initTelegram = () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        setWebApp(tg);
        setUser(tg.initDataUnsafe.user || null);
        setIsTelegramWebApp(true);
        
        // Apply Telegram theme
        applyTelegramTheme(tg);
        
        console.log('Telegram Web App initialized:', {
          version: tg.version,
          platform: tg.platform,
          user: tg.initDataUnsafe.user
        });
      }
    };

    initTelegram();
  }, []);

  const applyTelegramTheme = useCallback((tg: TelegramWebApp) => {
    const theme = tg.themeParams;
    const root = document.documentElement;

    // Apply Telegram theme colors to CSS variables
    if (theme.bg_color) {
      root.style.setProperty('--tg-bg-color', theme.bg_color);
    }
    if (theme.text_color) {
      root.style.setProperty('--tg-text-color', theme.text_color);
    }
    if (theme.button_color) {
      root.style.setProperty('--tg-button-color', theme.button_color);
    }
    if (theme.button_text_color) {
      root.style.setProperty('--tg-button-text-color', theme.button_text_color);
    }

    // Add Telegram class to body
    document.body.classList.add('telegram-webapp');
  }, []);

  const showAlert = useCallback((message: string) => {
    if (webApp) {
      webApp.showAlert(message);
    } else {
      alert(message);
    }
  }, [webApp]);

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    if (webApp) {
      return webApp.showConfirm(message);
    } else {
      return Promise.resolve(confirm(message));
    }
  }, [webApp]);

  const close = useCallback(() => {
    if (webApp) {
      webApp.close();
    }
  }, [webApp]);

  const openTelegramShare = useCallback((text: string, url?: string) => {
    const shareText = encodeURIComponent(text);
    const shareUrl = url ? encodeURIComponent(url) : '';
    const telegramUrl = `https://t.me/share/url?text=${shareText}${url ? `&url=${shareUrl}` : ''}`;
    
    if (webApp) {
      webApp.openTelegramLink(telegramUrl);
    } else {
      window.open(telegramUrl, '_blank');
    }
  }, [webApp]);

  const sendData = useCallback((data: any) => {
    if (webApp) {
      webApp.sendData(JSON.stringify(data));
    } else {
      console.log('Would send to Telegram:', data);
    }
  }, [webApp]);

  const getUserDisplayName = useCallback((): string => {
    if (!user) return 'Anonymous';
    if (user.username) return `@${user.username}`;
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    if (user.first_name) return user.first_name;
    return 'User';
  }, [user]);

  const setupMainButton = useCallback((text: string, onClick: () => void) => {
    if (!webApp) return;
    webApp.MainButton
      .setText(text)
      .onClick(onClick)
      .show();
  }, [webApp]);

  const hideMainButton = useCallback(() => {
    if (!webApp) return;
    webApp.MainButton.hide();
  }, [webApp]);

  return {
    webApp,
    user,
    isTelegramWebApp,
    showAlert,
    showConfirm,
    close,
    openTelegramShare,
    sendData,
    getUserDisplayName,
    setupMainButton,
    hideMainButton,
  };
};
```

### Step 2.5: Create Telegram Actions Component

Create `src/components/TelegramActions.tsx`:

```typescript
import React, { useCallback, useRef } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { Button } from './common/Button';
import { Icon } from './common/Icon';

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
```

### Step 2.6: Update App.tsx

Modify your main `App.tsx` to integrate Telegram functionality:

```typescript
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTelegram } from './hooks/useTelegram';
import { TelegramActions } from './components/TelegramActions';
// ... your existing imports

const App: React.FC = () => {
  // Your existing state
  const [layers, setLayers] = useState<Layer[]>([]);
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  // ... other existing state

  // Add Telegram integration
  const {
    isTelegramWebApp,
    setupMainButton,
    hideMainButton,
    showAlert
  } = useTelegram();

  // Your existing refs
  const memeCanvasRef = useRef<HTMLDivElement>(null);

  // Computed values
  const hasLayers = layers.length > 0;
  const hasContent = baseImage || hasLayers;

  // Update Telegram Main Button based on content
  useEffect(() => {
    if (!isTelegramWebApp) return;

    if (hasContent) {
      setupMainButton('Share Meme 📤', () => {
        // Scroll to Telegram actions or trigger share
        const telegramActions = document.querySelector('.telegram-actions');
        if (telegramActions) {
          telegramActions.scrollIntoView({ behavior: 'smooth' });
        }
      });
    } else {
      setupMainButton('Get Started 🎨', () => {
        showAlert('Upload an image or choose a template to start creating!');
      });
    }

    return () => {
      hideMainButton();
    };
  }, [isTelegramWebApp, hasContent, setupMainButton, hideMainButton, showAlert]);

  // Your existing functions (handleImageUpload, addNewLayer, etc.)
  // ... keep all your existing code

  return (
    <div className={`min-h-screen bg-gray-900 text-white ${isTelegramWebApp ? 'telegram-webapp' : ''}`}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          <span className="text-green-400">Sendit</span> Meme Generator
          {isTelegramWebApp && <span className="ml-2 text-sm">📱 Telegram</span>}
        </h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Canvas Area */}
          <div className="flex-1">
            <MemeCanvas
              ref={memeCanvasRef}
              baseImage={baseImage}
              layers={layers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onUpdateLayer={updateLayer}
            />
            
            {/* Add Telegram Actions below canvas when in Telegram */}
            {isTelegramWebApp && (
              <div className="mt-6">
                <TelegramActions
                  memeCanvasRef={memeCanvasRef}
                  hasLayers={hasContent}
                  className="lg:hidden" // Show on mobile
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-6">
            <Toolbar
              onImageUpload={handleImageUpload}
              onAddLayer={addNewLayer}
              hasBaseImage={!!baseImage}
              onShowMemeTemplateGallery={() => setShowMemeTemplateGallery(true)}
            />

            {/* Layer Editor */}
            {selectedLayer && (
              <div>
                {selectedLayer.type === LayerType.TEXT && (
                  <TextLayerEditor
                    layer={selectedLayer as TextLayerProps}
                    onUpdateLayer={updateLayer}
                    onDeleteLayer={deleteLayer}
                    onBringToFront={() => bringToFront(selectedLayer.id)}
                    onSendToBack={() => sendToBack(selectedLayer.id)}
                  />
                )}
                {selectedLayer.type === LayerType.STICKER && (
                  <StickerLayerEditor
                    layer={selectedLayer as StickerLayerProps}
                    onUpdateLayer={updateLayer}
                    onDeleteLayer={deleteLayer}
                    onBringToFront={() => bringToFront(selectedLayer.id)}
                    onSendToBack={() => sendToBack(selectedLayer.id)}
                  />
                )}
              </div>
            )}

            {/* Export Section */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Export</h3>
              <Button
                onClick={handleExportMeme}
                disabled={!hasContent}
                className="w-full"
              >
                Export Meme
              </Button>
            </div>

            {/* Telegram Actions in Sidebar for Desktop */}
            {isTelegramWebApp && (
              <TelegramActions
                memeCanvasRef={memeCanvasRef}
                hasLayers={hasContent}
                className="hidden lg:block"
              />
            )}
          </div>
        </div>

        {/* Your existing modals */}
        {showMemeTemplateGallery && (
          <MemeTemplateGallery
            templates={DEFAULT_MEME_TEMPLATES}
            onSelectTemplate={handleSelectMemeTemplate}
            onClose={() => setShowMemeTemplateGallery(false)}
          />
        )}

        {/* ... other existing modals */}
      </div>
    </div>
  );
};

export default App;
```

### Step 2.7: Add Telegram-Specific Styles

Create `src/styles/telegram.css` or add to your existing CSS:

```css
/* Telegram Web App specific styles */
.telegram-webapp {
  /* Use Telegram theme colors when available */
  background-color: var(--tg-bg-color, #0F0F0F);
  color: var(--tg-text-color, #FFFFFF);
}

.telegram-webapp .bg-gray-900 {
  background-color: var(--tg-bg-color, #0F0F0F) !important;
}

.telegram-webapp .text-white {
  color: var(--tg-text-color, #FFFFFF) !important;
}

.telegram-webapp .bg-green-500 {
  background-color: var(--tg-button-color, #00FF7F) !important;
}

/* Enhanced mobile experience for Telegram */
@media (max-width: 768px) {
  .telegram-webapp .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }
  
  .telegram-webapp .flex-col.lg\\:flex-row {
    gap: 1rem;
  }
  
  /* Make buttons more touch-friendly */
  .telegram-webapp button {
    min-height: 44px;
  }
  
  /* Improve canvas area for mobile */
  .telegram-webapp [data-canvas-container] {
    max-width: 100%;
    overflow-x: auto;
  }
}

/* Telegram action buttons styling */
.telegram-actions button {
  transition: all 0.2s ease;
}

.telegram-actions button:hover {
  transform: translateY(-2px);
}

.telegram-actions button:active {
  transform: translateY(0);
}

/* Loading states */
.telegram-loading {
  opacity: 0.6;
  pointer-events: none;
}
```

Then import it in your `App.tsx`:

```typescript
import './styles/telegram.css'; // Add this import
```

---

## 🧪 Phase 3: Testing & Verification

### Step 3.1: Local Testing

1. **Test normal website functionality**:
   ```bash
   npm run dev
   # Verify everything works as before
   ```

2. **Test with mock Telegram environment** (add to dev tools console):
   ```javascript
   // Mock Telegram Web App for testing
   window.Telegram = {
     WebApp: {
       initDataUnsafe: { user: { id: 123, first_name: 'Test', username: 'testuser' } },
       ready: () => console.log('Mock ready'),
       expand: () => console.log('Mock expand'),
       showAlert: (msg) => alert(`Telegram: ${msg}`),
       showConfirm: (msg) => Promise.resolve(confirm(`Telegram: ${msg}`)),
       MainButton: {
         setText: (text) => console.log('MainButton:', text),
         onClick: (fn) => console.log('MainButton click set'),
         show: () => console.log('MainButton show'),
         hide: () => console.log('MainButton hide')
       },
       themeParams: {},
       colorScheme: 'dark',
       platform: 'web',
       version: '6.0'
     }
   };
   // Reload page to test Telegram features
   location.reload();
   ```

### Step 3.2: Telegram Bot Testing

1. **Deploy to Vercel**:
   ```bash
   # Your existing deployment process
   git add .
   git commit -m "Add Telegram Web App integration"
   git push origin main
   # Vercel will auto-deploy
   ```

2. **Test bot integration**:
   - Find your bot in Telegram
   - Click the menu button
   - Verify your app opens
   - Test creating a meme
   - Test download functionality
   - Test sharing features

### Step 3.3: Cross-Platform Testing

Test on:
- [ ] Android Telegram app
- [ ] iOS Telegram app  
- [ ] Desktop Telegram app
- [ ] Telegram Web (web.telegram.org)

---

## 🚀 Phase 4: Advanced Features (Optional)

### Step 4.1: Enhanced Sharing with Image Upload

Create `src/utils/imageUpload.ts`:

```typescript
export const uploadImageToTempStorage = async (canvas: HTMLCanvasElement): Promise<string | null> => {
  try {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });
    
    if (!blob) return null;

    // Option 1: Upload to your own Vercel API endpoint
    const formData = new FormData();
    formData.append('image', blob, `meme_${Date.now()}.jpg`);

    const response = await fetch('/api/upload-temp-image', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      return data.url;
    }

    return null;
  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
};
```

### Step 4.2: Create Vercel API Endpoint (Optional)

Create `api/upload-temp-image.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // This is a simplified example - you'd need proper multipart parsing
    const { searchParams } = new URL(req.url!, `http://${req.headers.host}`);
    const filename = searchParams.get('filename') || `meme_${Date.now()}.jpg`;

    // Upload to Vercel Blob (requires Vercel Blob add-on)
    const blob = await put(filename, req.body!, {
      access: 'public',
    });

    res.status(200).json({ url: blob.url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}
```

### Step 4.3: Bot Backend for Channel Posting

If you want automatic channel posting, create a simple Node.js backend:

```javascript
// bot-server/index.js (separate repository or service)
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const bot = new TelegramBot(process.env.BOT_TOKEN);

app.use(express.json({ limit: '10mb' }));

app.post('/webhook', async (req, res) => {
  try {
    const { message, web_app_data } = req.body;
    
    if (web_app_data) {
      const data = JSON.parse(web_app_data.data);
      
      if (data.type === 'send_to_channel') {
        await handleChannelPost(data, message.from);
      }
    }
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function handleChannelPost(data, user) {
  try {
    // Convert base64 image data to buffer
    const base64Data = data.imageData.replace(/^data:image\/jpeg;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Create caption with user info
    const userName = user.username ? `@${user.username}` : user.first_name;
    const caption = `🎨 Awesome meme created by ${userName}!\n\n#SenditMemeGenerator #Meme`;
    
    // Send to your channel
    await bot.sendPhoto(process.env.CHANNEL_ID, imageBuffer, {
      caption: caption,
      parse_mode: 'HTML'
    });
    
    console.log(`Meme posted to channel by user ${user.id}`);
  } catch (error) {
    console.error('Error posting to channel:', error);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
```

---

## 🎯 Phase 5: Production Optimizations

### Step 5.1: Performance Optimizations

Update your `TelegramActions.tsx` with better performance:

```typescript
import React, { useCallback, useRef, useState } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { Button } from './common/Button';
import { Icon } from './common/Icon';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    isTelegramWebApp,
    showAlert,
    openTelegramShare,
    sendData,
    getUserDisplayName,
    setupMainButton
  } = useTelegram();

  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  const captureCanvas = useCallback(async (quality: number = 0.9) => {
    if (!memeCanvasRef.current) throw new Error('Canvas not found');

    const html2canvas = (await import('html2canvas')).default;
    
    return await html2canvas(memeCanvasRef.current, {
      useCORS: true,
      backgroundColor: '#0F0F0F',
      scale: quality > 0.8 ? 2 : 1, // Higher scale for better quality
      logging: false, // Disable logging for performance
      onclone: (clonedDoc) => {
        // Remove any selection highlights from the clone
        const elements = clonedDoc.querySelectorAll('[style*="border"]');
        elements.forEach(el => {
          (el as HTMLElement).style.border = 'none';
        });
      }
    });
  }, [memeCanvasRef]);

  const handleDownload = useCallback(async () => {
    if (!hasLayers) {
      showAlert('Please create a meme first!');
      return;
    }

    setIsProcessing(true);
    setupMainButton('Processing...', () => {});

    try {
      const canvas = await captureCanvas(0.9);
      const image = canvas.toDataURL('image/jpeg', 0.9);
      
      const link = downloadLinkRef.current;
      if (link) {
        link.href = image;
        link.download = `sendit-meme-${Date.now()}.jpg`;
        link.click();
      }
      
      showAlert('📱 Meme downloaded successfully!');
    } catch (error) {
      console.error('Download failed:', error);
      showAlert('Download failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setupMainButton('Share Meme 📤', handleTelegramShare);
    }
  }, [hasLayers, showAlert, captureCanvas, setupMainButton]);

  const handleTelegramShare = useCallback(async () => {
    if (!hasLayers) {
      showAlert('Please create a meme first!');
      return;
    }

    setIsProcessing(true);
    setupMainButton('Sharing...', () => {});

    try {
      const userDisplayName = getUserDisplayName();
      const shareText = `🎨 Check out this awesome meme I just created!\n\nMade by ${userDisplayName} using Sendit Meme Generator ⚡`;
      
      // Enhanced sharing with app URL
      const appUrl = `${window.location.origin}?utm_source=telegram&utm_medium=share&utm_campaign=meme_share`;
      openTelegramShare(shareText, appUrl);
      
    } catch (error) {
      console.error('Share failed:', error);
      showAlert('Share failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setupMainButton('Share Meme 📤', handleTelegramShare);
    }
  }, [hasLayers, showAlert, getUserDisplayName, openTelegramShare, setupMainButton]);

  const handleSendToChannel = useCallback(async () => {
    if (!hasLayers) {
      showAlert('Please create a meme first!');
      return;
    }

    setIsProcessing(true);
    setupMainButton('Sending...', () => {});

    try {
      // Lower quality for faster transmission
      const canvas = await captureCanvas(0.7);
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      
      const memeData = {
        type: 'send_to_channel',
        imageData: imageData,
        user: useTelegram().user,
        timestamp: Date.now(),
        metadata: {
          width: canvas.width,
          height: canvas.height,
          layersCount: hasLayers ? 1 : 0, // You could pass actual layers count
        }
      };

      sendData(memeData);
      showAlert('🎉 Meme sent to channel successfully!');
      
      // Close app after successful send (optional)
      setTimeout(() => {
        useTelegram().close();
      }, 2000);
      
    } catch (error) {
      console.error('Send to channel failed:', error);
      showAlert('Failed to send meme. Please try again.');
    } finally {
      setIsProcessing(false);
      setupMainButton('Share Meme 📤', handleTelegramShare);
    }
  }, [hasLayers, showAlert, captureCanvas, sendData, setupMainButton]);

  if (!isTelegramWebApp) {
    return null;
  }

  return (
    <div className={`telegram-actions space-y-4 ${className}`}>
      <a ref={downloadLinkRef} style={{ display: 'none' }} />
      
      {/* Enhanced User Info Display */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-4 border border-gray-600">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
              {getUserDisplayName().charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800"></div>
          </div>
          <div className="flex-1">
            <div className="text-white font-medium">{getUserDisplayName()}</div>
            <div className="text-green-400 text-sm flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              Creating memes in Telegram
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleDownload}
          disabled={!hasLayers || isProcessing}
          className={`w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105'
          }`}
        >
          <Icon path="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          <span>Download to Device</span>
          <span className="text-xs opacity-75">📱</span>
        </Button>

        <Button
          onClick={handleTelegramShare}
          disabled={!hasLayers || isProcessing}
          className={`w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 transition-all duration-200 ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105'
          }`}
        >
          <Icon path="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
          <span>Share in Telegram</span>
          <span className="text-xs opacity-75">💬</span>
        </Button>

        <Button
          onClick={handleSendToChannel}
          disabled={!hasLayers || isProcessing}
          className={`w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 transition-all duration-200 ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105'
          }`}
        >
          <Icon path="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" />
          <span>Post to Channel</span>
          <span className="text-xs opacity-75">📢</span>
        </Button>
      </div>

      {/* Status Info */}
      <div className="text-xs text-gray-400 text-center space-y-1">
        <div>Powered by Sendit Meme Generator</div>
        {isProcessing && (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-400"></div>
            <span>Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
};
```

### Step 5.2: Enhanced Mobile Experience

Update your CSS with better mobile optimizations:

```css
/* Enhanced Telegram Web App Mobile Experience */
.telegram-webapp {
  /* Handle Telegram's viewport */
  height: 100vh;
  height: var(--tg-viewport-height, 100vh);
  overflow-x: hidden;
}

@media (max-width: 768px) {
  .telegram-webapp {
    padding-bottom: env(safe-area-inset-bottom);
  }

  /* Better canvas handling on mobile */
  .telegram-webapp .meme-canvas-container {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    max-height: 50vh;
    background: #1a1a1a;
    border-radius: 12px;
    margin: 1rem 0;
    overflow: hidden;
  }

  /* Improved touch targets */
  .telegram-webapp button,
  .telegram-webapp [role="button"] {
    min-height: 48px;
    min-width: 48px;
    touch-action: manipulation;
  }

  /* Better text input experience */
  .telegram-webapp input[type="text"],
  .telegram-webapp textarea {
    font-size: 16px; /* Prevent iOS zoom */
    background-color: #2a2a2a;
    border: 1px solid #444;
    border-radius: 8px;
    color: white;
  }

  /* Optimized layer controls */
  .telegram-webapp .layer-controls {
    position: sticky;
    bottom: 0;
    background: #0F0F0F;
    border-top: 1px solid #333;
    padding: 1rem;
    z-index: 1000;
  }

  /* Better modal handling */
  .telegram-webapp .modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
  }
}

/* Loading and transition improvements */
.telegram-webapp .transition-smooth {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.telegram-webapp .loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

/* Haptic feedback styles */
.telegram-webapp .haptic-button:active {
  transform: scale(0.98);
}
```

### Step 5.3: Analytics Integration (Optional)

Create `src/utils/analytics.ts`:

```typescript
interface AnalyticsEvent {
  event: string;
  userId?: number;
  platform: 'web' | 'telegram';
  timestamp: number;
  properties?: Record<string, any>;
}

class Analytics {
  private isProduction = process.env.NODE_ENV === 'production';
  private telegramUser: any = null;

  constructor() {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      this.telegramUser = window.Telegram.WebApp.initDataUnsafe.user;
    }
  }

  track(eventName: string, properties?: Record<string, any>) {
    if (!this.isProduction) {
      console.log('Analytics:', eventName, properties);
      return;
    }

    const event: AnalyticsEvent = {
      event: eventName,
      userId: this.telegramUser?.id,
      platform: this.telegramUser ? 'telegram' : 'web',
      timestamp: Date.now(),
      properties
    };

    // Send to your analytics endpoint
    this.sendEvent(event);
  }

  private async sendEvent(event: AnalyticsEvent) {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.warn('Analytics failed:', error);
    }
  }

  // Common event tracking methods
  trackMemeCreated(layers: number) {
    this.track('meme_created', { layerCount: layers });
  }

  trackMemeShared(method: 'download' | 'telegram_share' | 'channel_post') {
    this.track('meme_shared', { method });
  }

  trackAppOpened() {
    this.track('app_opened', {
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`
    });
  }

  trackTemplateSelected(templateId: string) {
    this.track('template_selected', { templateId });
  }

  trackLayerAdded(layerType: 'text' | 'sticker') {
    this.track('layer_added', { layerType });
  }
}

export const analytics = new Analytics();
```

Then integrate analytics in your components:

```typescript
// In App.tsx
import { analytics } from './utils/analytics';

useEffect(() => {
  analytics.trackAppOpened();
}, []);

// In your meme creation functions
const handleSelectMemeTemplate = (template: MemeTemplateOption) => {
  analytics.trackTemplateSelected(template.id);
  setBaseImage(template.src);
  // ... rest of existing code
};

const addNewLayer = useCallback((type: LayerType, props: Partial<Layer> = {}) => {
  analytics.trackLayerAdded(type === LayerType.TEXT ? 'text' : 'sticker');
  // ... rest of existing code
}, []);
```

---

## 🚀 Phase 6: Deployment & Final Steps

### Step 6.1: Environment Configuration

Create `.env.local` for development:

```env
# Development settings
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=@YourMemeGeneratorBot
NEXT_PUBLIC_ANALYTICS_ENABLED=false
```

Create environment variables in Vercel dashboard:

```env
# Production settings
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=@YourMemeGeneratorBot
NEXT_PUBLIC_ANALYTICS_ENABLED=true
```

### Step 6.2: Build Configuration

Update your `vite.config.ts` if needed:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          html2canvas: ['html2canvas'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
})
```

### Step 6.3: Final Deployment Checklist

- [ ] ✅ All TypeScript compilation errors resolved
- [ ] ✅ Telegram Web App SDK script added to HTML
- [ ] ✅ Bot created and configured in BotFather
- [ ] ✅ Web App URL set to Vercel deployment URL
- [ ] ✅ Mobile responsiveness tested
- [ ] ✅ Download functionality works on mobile
- [ ] ✅ Sharing opens Telegram correctly
- [ ] ✅ Error handling works gracefully
- [ ] ✅ Analytics tracking implemented (optional)
- [ ] ✅ Performance optimized for mobile

### Step 6.4: Testing Commands

```bash
# Build and test locally
npm run build
npm run preview

# Deploy to Vercel
git add .
git commit -m "Complete Telegram Web App integration"
git push origin main

# Test bot integration
# 1. Find your bot in Telegram
# 2. Click menu button
# 3. Create and share a meme
# 4. Verify all features work
```

---

## 📊 Success Metrics & Monitoring

### Key Metrics to Track:
- **User Engagement**: Memes created in Telegram vs. web
- **Sharing Activity**: Download vs. Telegram share usage
- **Platform Distribution**: Which platforms are most popular
- **Error Rates**: Failed exports, sharing errors
- **Performance**: Load times, canvas rendering speed

### Monitoring Recommendations:
1. **Vercel Analytics**: Built-in performance monitoring
2. **Error Tracking**: Implement Sentry or similar for error tracking
3. **User Feedback**: Add feedback mechanism in Telegram version
4. **A/B Testing**: Test different UI layouts for Telegram users

---

## 🎉 Conclusion

Your Sendit Meme Generator now has full Telegram Web App integration! Here's what you've accomplished:

✅ **Dual-Mode Operation**: Works perfectly as both standalone web app and Telegram Web App  
✅ **Native Telegram Features**: User info display, theme integration, main button  
✅ **Enhanced Sharing**: Download, Telegram sharing, and optional channel posting  
✅ **Mobile Optimized**: Touch-friendly interface optimized for mobile use  
✅ **Type Safety**: Full TypeScript support with proper type definitions  
✅ **Performance**: Optimized canvas rendering and image processing  
✅ **Error Handling**: Graceful fallbacks and user-friendly error messages  

### Next Steps:
1. **Monitor Usage**: Track how users interact with Telegram features
2. **Gather Feedback**: Ask Telegram users for feature requests
3. **Iterate**: Add new features based on user behavior
4. **Scale**: Consider adding bot backend for automatic channel posting

Your meme generator is now ready to provide an amazing experience for both web and Telegram users! 🚀