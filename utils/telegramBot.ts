/**
 * Telegram Bot Service for enhanced meme sharing
 * Integrates with backend API routes to provide native Telegram sharing
 */

export interface UploadResult {
  imageUrl: string;
  filename: string;
  size: number;
}

export interface PrepareMessageResult {
  msgId: string;
  imageUrl: string;
  fallback?: boolean;
}

export interface TelegramShareOptions {
  filename?: string;
  title?: string;
  text?: string;
  url?: string;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
}

/**
 * Check if Telegram Web App is available
 */
export function isTelegramWebAppAvailable(): boolean {
  return typeof window !== 'undefined' && 
         window.Telegram && 
         window.Telegram.WebApp;
}

/**
 * Get current Telegram user information
 */
export function getTelegramUser() {
  if (!isTelegramWebAppAvailable()) {
    return null;
  }
  
  return window.Telegram.WebApp.initDataUnsafe.user;
}

/**
 * Initialize Telegram Web App
 */
export function initializeTelegramWebApp() {
  if (!isTelegramWebAppAvailable()) {
    console.warn('Telegram Web App not available');
    return false;
  }

  try {
    const webApp = window.Telegram.WebApp;
    
    // Initialize the Web App
    webApp.ready();
    
    // Enable closing confirmation
    webApp.enableClosingConfirmation();
    
    // Set theme colors if needed
    if (webApp.themeParams.bg_color) {
      document.body.style.backgroundColor = webApp.themeParams.bg_color;
    }
    
    console.log('Telegram Web App initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Telegram Web App:', error);
    return false;
  }
}

/**
 * Upload image blob to backend
 */
export async function uploadImageToBackend(
  blob: Blob, 
  options?: TelegramShareOptions
): Promise<UploadResult> {
  const filename = options?.filename || 'meme.png';
  
  try {
    const formData = new FormData();
    formData.append('image', blob, filename);
    
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload image');
    }
    
    const result = await response.json();
    console.log('Image uploaded successfully:', result);
    
    return result;
  } catch (error) {
    console.error('Image upload failed:', error);
    throw error;
  }
}

/**
 * Prepare message for sharing via Telegram bot
 */
export async function prepareMessageForBot(
  imageUrl: string, 
  options?: TelegramShareOptions
): Promise<PrepareMessageResult> {
  const user = getTelegramUser();
  
  if (!user) {
    throw new Error('Telegram user not available');
  }
  
  try {
    const response = await fetch('/api/prepare-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl,
        userId: user.id,
        caption: options?.text || options?.title || 'Check out this meme!',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to prepare message');
    }
    
    const result = await response.json();
    console.log('Message prepared successfully:', result);
    
    return result;
  } catch (error) {
    console.error('Message preparation failed:', error);
    throw error;
  }
}

/**
 * Share meme using Telegram bot backend
 */
export async function shareMemeWithBot(
  blob: Blob, 
  options?: TelegramShareOptions
): Promise<void> {
  const onProgress = options?.onProgress || (() => {});
  const onError = options?.onError || ((error) => console.error(error));
  
  try {
    if (!isTelegramWebAppAvailable()) {
      throw new Error('Telegram Web App not available');
    }
    
    onProgress(10);
    
    // Step 1: Upload image to backend
    const uploadResult = await uploadImageToBackend(blob, options);
    onProgress(50);
    
    // Step 2: Prepare message
    const prepareResult = await prepareMessageForBot(uploadResult.imageUrl, options);
    onProgress(80);
    
    // Step 3: Open native share dialog
    return new Promise((resolve, reject) => {
      try {
        window.Telegram.WebApp.shareMessage(prepareResult.msgId, (success) => {
          onProgress(100);
          
          if (success) {
            console.log('Meme shared successfully via Telegram bot');
            resolve();
          } else {
            const error = 'Failed to share via Telegram bot';
            onError(error);
            reject(new Error(error));
          }
        });
      } catch (error) {
        onError(error.message);
        reject(error);
      }
    });
    
  } catch (error) {
    onError(error.message);
    throw error;
  }
}

/**
 * Check if we should use bot-based sharing
 */
export function shouldUseBotSharing(): boolean {
  const env = getTelegramEnvironment(); // Import from share.ts
  
  // Use bot sharing if we're in Telegram and the Web App is available
  return env.isTelegram && isTelegramWebAppAvailable();
}

/**
 * Get Telegram environment (import from share.ts)
 */
function getTelegramEnvironment() {
  if (typeof navigator === "undefined") {
    return { 
      isTelegram: false, 
      isAndroid: false, 
      isIOS: false, 
      isDesktop: false, 
      platform: "unknown",
      isBrave: false,
      userAgent: "unknown"
    };
  }
  
  const ua = navigator.userAgent.toLowerCase();
  const isTelegram = ua.includes('telegram') || ua.includes('tgweb');
  const isAndroid = ua.includes('android');
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isDesktop = !isAndroid && !isIOS;
  const isBrave = ua.includes('brave');
  
  return {
    isTelegram,
    isAndroid,
    isIOS,
    isDesktop,
    isBrave,
    platform: isAndroid ? 'android' : isIOS ? 'ios' : isDesktop ? 'desktop' : 'unknown',
    userAgent: ua.substring(0, 100)
  };
}