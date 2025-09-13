/**
 * Telegram Bot Service for enhanced meme sharing
 * Integrates with backend API routes to provide native Telegram sharing
 * Includes enhanced client-side logging for Vercel integration
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

interface ClientLogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  operation: string;
  message: string;
  data?: any;
  userAgent?: string;
  platform?: string;
  isTelegram?: boolean;
  userId?: string;
  duration?: number;
}

/**
 * Send client log to backend for Vercel logging
 */
async function sendClientLog(logEntry: ClientLogEntry): Promise<void> {
  try {
    // Add environment information
    const env = getTelegramEnvironment();
    const user = getTelegramUser();
    
    const enhancedLog = {
      ...logEntry,
      userAgent: navigator.userAgent.substring(0, 100),
      platform: env.platform,
      isTelegram: env.isTelegram,
      userId: user?.id,
      vercelRegion: (globalThis as any).process?.env?.VERCEL_REGION || 'client',
      service: 'telegram-client'
    };

    // Send to backend logging endpoint
    const response = await fetch('/api/client-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enhancedLog),
    });

    if (!response.ok) {
      console.warn('Failed to send client log to backend:', await response.text());
    }
  } catch (error) {
    // Don't use console.error here to avoid infinite recursion
    console.warn('Client logging failed:', error);
  }
}

/**
 * Log client-side operations with Vercel-compatible format
 */
export async function logClientOperation(
  operation: string,
  message: string,
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' = 'INFO',
  data?: any
): Promise<void> {
  const logEntry: ClientLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    operation,
    message,
    data
  };

  // Always log to console for development
  const consoleMethod = level.toLowerCase() as keyof Console;
  if (console[consoleMethod]) {
    (console as any)[consoleMethod](`[Telegram Client] ${message}`, data);
  }

  // Send to backend for Vercel logging
  await sendClientLog(logEntry);
}

/**
 * Log performance metrics for client operations
 */
export async function logClientPerformance(
  operation: string,
  duration: number,
  data?: any
): Promise<void> {
  await logClientOperation('performance', `${operation} completed`, 'INFO', {
    operation,
    duration,
    ...data,
    category: 'client_performance'
  });
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
  const startTime = Date.now();
  
  await logClientOperation('upload_start', `Starting image upload: ${filename}`, 'INFO', {
    filename,
    size: blob.size,
    type: blob.type
  });
  
  try {
    const formData = new FormData();
    formData.append('image', blob, filename);
    
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      await logClientOperation('upload_error', `Image upload failed: ${errorData.error}`, 'ERROR', {
        filename,
        error: errorData.error,
        status: response.status,
        duration: Date.now() - startTime
      });
      throw new Error(errorData.error || 'Failed to upload image');
    }
    
    const result = await response.json();
    
    await logClientPerformance('image_upload', Date.now() - startTime, {
      filename,
      size: blob.size,
      result: {
        imageUrl: result.imageUrl,
        filename: result.filename,
        size: result.size
      }
    });
    
    return result;
  } catch (error) {
    await logClientOperation('upload_exception', `Image upload exception: ${error.message}`, 'ERROR', {
      filename,
      size: blob.size,
      error: (error as Error).message,
      duration: Date.now() - startTime
    });
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
  const startTime = Date.now();
  
  if (!user) {
    await logClientOperation('prepare_error', 'Telegram user not available', 'ERROR');
    throw new Error('Telegram user not available');
  }
  
  await logClientOperation('prepare_start', `Starting message preparation for user ${user.id}`, 'INFO', {
    userId: user.id,
    imageUrl,
    caption: options?.text || options?.title
  });
  
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
      await logClientOperation('prepare_error', `Message preparation failed: ${errorData.error}`, 'ERROR', {
        userId: user.id,
        imageUrl,
        error: errorData.error,
        status: response.status,
        duration: Date.now() - startTime
      });
      throw new Error(errorData.error || 'Failed to prepare message');
    }
    
    const result = await response.json();
    
    await logClientPerformance('message_preparation', Date.now() - startTime, {
      userId: user.id,
      imageUrl,
      msgId: result.msgId,
      fallback: result.fallback
    });
    
    return result;
  } catch (error) {
    await logClientOperation('prepare_exception', `Message preparation exception: ${error.message}`, 'ERROR', {
      userId: user?.id,
      imageUrl,
      error: (error as Error).message,
      duration: Date.now() - startTime
    });
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
  const startTime = Date.now();
  
  await logClientOperation('share_start', 'Starting bot-based meme share', 'INFO', {
    filename: options?.filename,
    size: blob.size,
    caption: options?.text || options?.title
  });
  
  try {
    if (!isTelegramWebAppAvailable()) {
      await logClientOperation('share_error', 'Telegram Web App not available', 'ERROR');
      throw new Error('Telegram Web App not available');
    }
    
    onProgress(10);
    
    // Step 1: Upload image to backend
    await logClientOperation('share_step', 'Starting image upload', 'DEBUG');
    const uploadResult = await uploadImageToBackend(blob, options);
    onProgress(50);
    
    // Step 2: Prepare message
    await logClientOperation('share_step', 'Starting message preparation', 'DEBUG');
    const prepareResult = await prepareMessageForBot(uploadResult.imageUrl, options);
    onProgress(80);
    
    // Step 3: Open native share dialog
    await logClientOperation('share_step', 'Opening native share dialog', 'DEBUG');
    return new Promise((resolve, reject) => {
      try {
        window.Telegram.WebApp.shareMessage(prepareResult.msgId, (success) => {
          onProgress(100);
          
          if (success) {
            logClientOperation('share_success', 'Meme shared successfully via Telegram bot', 'INFO', {
              msgId: prepareResult.msgId,
              totalDuration: Date.now() - startTime,
              imageUrl: uploadResult.imageUrl
            });
            resolve();
          } else {
            const error = 'Failed to share via Telegram bot';
            logClientOperation('share_failure', 'Native share dialog failed', 'WARN', {
              msgId: prepareResult.msgId,
              totalDuration: Date.now() - startTime
            });
            onError(error);
            reject(new Error(error));
          }
        });
      } catch (error) {
        logClientOperation('share_exception', 'Native share dialog exception', 'ERROR', {
          error: (error as Error).message,
          msgId: prepareResult.msgId,
          totalDuration: Date.now() - startTime
        });
        onError((error as Error).message);
        reject(error);
      }
    });
    
  } catch (error) {
    logClientOperation('share_exception', 'Bot share process failed', 'ERROR', {
      error: (error as Error).message,
      totalDuration: Date.now() - startTime
    });
    onError((error as Error).message);
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
  
  const env = {
    isTelegram,
    isAndroid,
    isIOS,
    isDesktop,
    isBrave,
    platform: isAndroid ? 'android' : isIOS ? 'ios' : isDesktop ? 'desktop' : 'unknown',
    userAgent: ua.substring(0, 100)
  };

  // Log environment detection for debugging
  if (env.isTelegram) {
    logClientOperation('environment', 'Telegram environment detected', 'DEBUG', env);
  }

  return env;
}