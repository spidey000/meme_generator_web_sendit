/**
 * System-wide share utilities with data URL fallbacks for restrictive environments like Telegram.
 * Works across Android, iOS, and desktop using native share mechanisms.
 * Now includes enhanced Telegram bot integration for native sharing.
 */

// Import Telegram bot utilities
import {
  shareMemeWithBot,
  shouldUseBotSharing,
  initializeTelegramWebApp,
  logClientOperation,
  logClientPerformance
} from './telegramBot';

export type ShareImageOptions = {
  filename?: string;
  title?: string;
  text?: string;
  url?: string;
  onFallback?: (reason: string) => void;
};

type ShareDataLite = {
  title?: string;
  text?: string;
  url?: string;
};

const DEFAULT_FILENAME = "meme.png";

/**
 * Enhanced Telegram browser detection with platform identification
 */
export function getTelegramEnvironment(): {
  isTelegram: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isDesktop: boolean;
  platform: string;
  isBrave: boolean;
  userAgent: string;
} {
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
    userAgent: ua.substring(0, 100) // Truncate for privacy
  };
}

/**
 * Enhanced restrictive environment detection - more conservative to avoid false positives
 */
function isRestrictiveEnvironment(): boolean {
  const env = getTelegramEnvironment();
  const ua = navigator.userAgent.toLowerCase();

  // Only detect truly restrictive environments
  return env.isTelegram ||
    ua.includes('webview') ||
    ua.includes('instagram') ||
    ua.includes('facebook') ||
    ua.includes('twitter');
}

/**
 * Checks if the browser can share files (Web Share API Level 2).
 */
export function canShareFiles(files: File[]): boolean {
  if (typeof navigator === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const n = navigator as any;
  return !!n && !!n.canShare && n.canShare({ files });
}

/**
 * Internal: safely attempt clipboard write (best-effort, swallow errors).
 */
async function tryWriteClipboardText(text: string | undefined): Promise<void> {
  if (!text) return;
  try {
    // Optional chaining as per requirement
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (navigator as any)?.clipboard?.writeText?.(text);
  } catch {
    // Ignore clipboard permission errors
  }
}

/**
 * Internal: open a URL in a new tab/window (best-effort)
 */
function tryOpenWindow(url: string): Window | null {
  try {
    return window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    return null;
  }
}

/**
 * Internal: force a programmatic download via <a download>.
 */
function forceDownload(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    a.remove();
  }
}

/**
 * Enhanced system-wide share using data URL for restrictive environments
 */
async function systemWideShareWithDataURL(blob: Blob, options: ShareImageOptions): Promise<void> {
  const filename = options?.filename ?? DEFAULT_FILENAME;
  const title = options?.title;
  const text = options?.text;
  const url = options?.url;
  const onFallback = options?.onFallback;
  const env = getTelegramEnvironment();
  const startTime = Date.now();

  await logShareOperation('system_wide_share_start', env, {
    filename,
    hasTitle: !!title,
    hasText: !!text,
    hasUrl: !!url,
    platform: env.platform
  });

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataURL = reader.result as string;

      // Try different system-wide approaches based on platform
      const strategies = [
        // 1. Telegram-specific strategies
        () => {
          if (env.isTelegram) {
          },

        // 3. Universal share link
        () => {
          const shareData = {
            title: title || '',
            text: text || '',
            url: url || '',
            image: dataURL
          };

          // Create a shareable data URL that includes all share info
          const shareDataURL = `data:text/json;base64,${btoa(JSON.stringify(shareData))}`;
          window.open(shareDataURL, '_blank');
          return true;
        },

        // 4. Direct image open with share instructions
        () => {
          // Open image in new tab with instructions
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(`
              <html>
                <head><title>${title || 'Share Image'}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body { margin:0; padding:20px; text-align:center; font-family:-apple-system,BlinkMacSystemFont,sans-serif; background:#f5f5f5; }
                  .container { max-width:600px; margin:0 auto; background:white; padding:30px; border-radius:12px; box-shadow:0 4px6px rgba(0,0,0,0.1); }
                  h2 { color:#333; margin-bottom:10px; }
                  .instructions { color:#666; margin-bottom:20px; font-size:16px; }
                  .image-container { margin:20px 0; }
                  img { max-width:100%; max-height:60vh; border:2px solid #e0e0e0; border-radius:8px; }
                  .save-hint { background:#2196F3; color:white; padding:15px; border-radius:8px; margin-top:20px; font-size:14px; }
                </style>
                </head>
                <body>
                  <div class="container">
                    <h2>${title || 'Share this image'}</h2>
                    <p class="instructions">${text || 'Long press to save and share'}</p>
                    <div class="image-container">
                      <img src="${dataURL}" alt="Generated meme" />
                    </div>
                    <div class="save-hint">
                      <strong>💾 How to save:</strong><br>
                      Long press the image and select "Save Image" or take a screenshot
                    </div>
                    ${url ? `<p style="margin-top:20px;color:#999;font-size:12px;">Original: ${url}</p>` : ''}
                  </div>
                </body>
              </html>
            `);
            return true;
          }
          return false;
        },

        // 5. Fallback to download
        () => {
          forceDownload(dataURL, filename);
          onFallback?.("download");
          return true;
        }
      ];

      // Try each strategy until one works
      for (let i = 0; i < strategies.length; i++) {
        const strategy = strategies[i];
        try {
          console.log(`Attempting share strategy ${i + 1}/${strategies.length}`);
          logShareOperation('strategy_attempt', env, {
            strategyIndex: i + 1,
            totalStrategies: strategies.length
          });

          if (strategy()) {
            console.log(`Share strategy ${i + 1} succeeded`);
            await logShareOperation('strategy_success', env, {
              strategyIndex: i + 1,
              duration: Date.now() - startTime
            });
            setTimeout(resolve, 500); // Give it time to work
            return;
          }
        } catch (e) {
          console.warn(`Share strategy ${i + 1} failed:`, e);
          await logShareOperation('strategy_failed', env, {
            strategyIndex: i + 1,
            error: (e as Error).message
          });
          // Continue to next strategy
        }
      }

      await logShareOperation('all_strategies_failed', env, {
        duration: Date.now() - startTime
      });
      reject(new Error('All share strategies failed'));
    };

    reader.onerror = () => {
      logShareOperation('blob_read_failed', env, { error: 'Failed to read blob' });
      reject(new Error('Failed to read blob'));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Simple fallback: download the image file
 */
async function fallbackDownloadAndMaybeOpen(
  blob: Blob,
  filename: string,
  onFallback?: (reason: string) => void
): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    forceDownload(url, filename);
    onFallback?.("download");
  } finally {
    // Clean up the object URL
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/**
 * shareImageBlob
 * Uses system-wide sharing strategies for restrictive environments (Telegram), 
 * Web Share API when available, and multiple fallback mechanisms.
 * Works across Android, iOS, and desktop even when Web APIs are blocked.
 */
export async function shareImageBlob(
  blob: Blob,
  options?: ShareImageOptions
): Promise<void> {
  const filename = options?.filename ?? DEFAULT_FILENAME;
  const title = options?.title;
  const text = options?.text;
  const url = options?.url;
  const onFallback = options?.onFallback;

  const hasNavigatorShare = typeof navigator !== "undefined" && !!(navigator as Navigator).share;
  const env = getTelegramEnvironment();
  const startTime = Date.now();

  // Log the initial share attempt
  await logShareOperation('shareImageBlob started', env, {
    hasNavigatorShare,
    isBrave: env.isBrave,
    blobSize: blob.size,
    blobType: blob.type,
    options: { filename, title, text: !!text, url: !!url }
  });

  // Initialize Telegram Web App if available
  if (env.isTelegram) {
    initializeTelegramWebApp();
  }

  // For Telegram environments with bot support, use native bot sharing
  if (env.isTelegram && shouldUseBotSharing()) {
    logShareOperation('Telegram detected with bot support, using native sharing', env);
    try {
      await shareMemeWithBot(blob, {
        filename,
        title,
        text,
        url,
        onProgress: (progress) => {
          console.log(`Bot sharing progress: ${progress}%`);
        },
        onError: (error) => {
          console.error('Bot sharing error:', error);
        }
      });
      await logShareOperation('Telegram bot share completed', env, {
        duration: Date.now() - startTime
      });
      return;
    } catch (error) {
      await logShareOperation('Telegram bot share failed, falling back to enhanced strategies', env, {
        error: (error as Error).message,
        duration: Date.now() - startTime
      });
      console.warn('Telegram bot share failed, falling back:', error);
      // Fall through to enhanced strategies
    }
  }

  // For restrictive environments like Telegram without bot support, use system-wide share
  if (env.isTelegram) {
    logShareOperation('Telegram detected, using enhanced strategies', env);
    try {
      await systemWideShareWithDataURL(blob, { filename, title, text, url, onFallback });
      onFallback?.("system-wide");
      await logShareOperation('System-wide share completed', env, {
        duration: Date.now() - startTime
      });
      return;
    } catch (error) {
      await logShareOperation('System-wide share failed, falling back', env, {
        error: (error as Error).message,
        duration: Date.now() - startTime
      });
      console.warn('System-wide share failed, falling back:', error);
      // Fall through to standard methods
    }
  }

  // Try Web Share API -优先处理标准浏览器
  if (hasNavigatorShare) {
    await logShareOperation('Web Share API available, attempting share', env, { isBrave: env.isBrave });

    try {
      // 对于Brave浏览器，直接尝试text/url分享，因为文件分享可能不稳定
      if (env.isBrave) {
        await logShareOperation('Brave detected, using text/url sharing', env);
        try {
          await (navigator as Navigator).share({ title, text, url });
          await logShareOperation('Brave share completed successfully', env, {
            duration: Date.now() - startTime
          });
          return;
        } catch (err: unknown) {
          if (isAbortError(err)) return; // User cancelled
          await logShareOperation('Brave share failed, trying fallbacks', env, { error: err });
        }
      } else {
        // 标准浏览器的完整流程
        const file = new File([blob], filename, { type: blob.type || "image/png" });

        // 尝试文件分享 (Level 2)
        if (canShareFiles([file])) {
          try {
            await (navigator as Navigator).share({ files: [file], title, text, url });
            await logShareOperation('File share completed successfully', env, {
              duration: Date.now() - startTime
            });
            return;
          } catch (err: unknown) {
            if (isAbortError(err)) return; // User cancelled
            await logShareOperation('File share failed, trying text/url', env, { error: err });
          }
        }

        // 回退到text/url分享 (更兼容)
        try {
          await (navigator as Navigator).share({ title, text, url });
          await logShareOperation('Text/url share completed successfully', env, {
            duration: Date.now() - startTime
          });
          return;
        } catch (err: unknown) {
          if (isAbortError(err)) return; // User cancelled
          await logShareOperation('Text/url share failed, trying fallbacks', env, { error: err });
        }
      }
    } catch (err) {
      await logShareOperation('Web Share API completely failed, using fallbacks', env, { error: err });
      // 继续到后备方案
    }
  }

  // 最终后备方案：处理剩余情况
  logShareOperation('Using final fallback strategies', env, { isBrave: env.isBrave });

  try {
    // 对于Brave浏览器，跳过系统级分享，直接下载
    if (env.isBrave) {
      await logShareOperation('Brave detected, skipping system-wide share, using download', env);
      await fallbackDownloadAndMaybeOpen(blob, filename, onFallback);
      onFallback?.("brave-download");
    } else {
      // 其他浏览器尝试系统级分享
      await systemWideShareWithDataURL(blob, { filename, title, text, url, onFallback });
      onFallback?.("system-wide-fallback");
    }
    await logShareOperation('Final fallback completed successfully', env, {
      duration: Date.now() - startTime
    });

    // Log performance metrics for completed share operation
    await logClientPerformance('share_image_blob', Date.now() - startTime, {
      filename,
      blobSize: blob.size,
      platform: env.platform,
      isBrave: env.isBrave,
      fallbackUsed: true
    });

  } catch (error) {
    await logShareOperation('Final fallback failed, using ultimate fallback', env, {
      error: (error as Error)?.message,
      duration: Date.now() - startTime
    });

    // 终极后备方案：直接下载
    try {
      await fallbackDownloadAndMaybeOpen(blob, filename, onFallback);
      onFallback?.("download");
      await logShareOperation('Ultimate download fallback completed', env, {
        duration: Date.now() - startTime
      });
    } catch (downloadError) {
      await logShareOperation('Download failed, using clipboard fallback', env, {
        error: (downloadError as Error)?.message,
        duration: Date.now() - startTime
      });

      // 最后的手段：复制到剪贴板
      if (text || url) {
        const composed = [text, url].filter(Boolean).join(" ");
        await tryWriteClipboardText(composed);
        onFallback?.("clipboard");
      } else {
        onFallback?.("none");
      }
    }
  }
}

/**
 * shareData
 * Try navigator.share first (text/url only). If unavailable or fails:
 *  - Open url in a new tab if provided, else copy composed text to clipboard.
 */
export async function shareData(options: ShareDataLite): Promise<void> {
  const { title, text, url } = options || {};
  const hasNavigatorShare = typeof navigator !== "undefined" && !!(navigator as Navigator).share;

  // Try Web Share API first
  if (hasNavigatorShare) {
    try {
      await (navigator as Navigator).share({ title, text, url });
      return;
    } catch (err: unknown) {
      if (isAbortError(err)) return; // User cancelled
    }
  }

  // Simple fallbacks
  if (url) {
    tryOpenWindow(url); // Open URL in new tab
  } else {
    const composed = [title, text].filter(Boolean).join(" ");
    await tryWriteClipboardText(composed); // Copy to clipboard
  }
}

/**
 * Enhanced debugging utility for share operations with Vercel logging
 */
async function logShareOperation(operation: string, env: any, details?: any) {
  const isDebugMode = typeof window !== 'undefined' && (window as any).DEBUG_TELEGRAM_SHARE;
  const logData = {
    platform: env.platform,
    isTelegram: env.isTelegram,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'unknown',
    timestamp: new Date().toISOString(),
    ...details,
    category: 'share_operation'
  };

  // Always log to console for development
  if (isDebugMode) {
    console.log(`[Share Debug] ${operation}:`, logData);
  }

  // Send to Vercel logging system
  try {
    const level = details?.error ? 'ERROR' :
      operation.includes('failed') ? 'WARN' :
        operation.includes('completed') ? 'INFO' : 'DEBUG';

    await logClientOperation(operation, `Share operation: ${operation}`, level, logData);
  } catch (error) {
    // Fallback to console if client logging fails
    console.warn('Failed to send share log to backend:', error);
  }

  // Always log critical errors to console
  if (details?.error) {
    console.error(`[Share Error] ${operation}:`, details.error);
  }
}

/**
 * Utility: detect AbortError
 */
function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = err as any;
  return anyErr.name === "AbortError";
}