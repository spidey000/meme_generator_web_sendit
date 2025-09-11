/**
 * Robust native share utilities with fallbacks for iOS/Safari and in-app browsers like Telegram.
 * No external dependencies. Fully typed.
 */

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
 * Helpers
 */

/**
 * Detects if running within Telegram in-app browser.
 */
export function isTelegramInApp(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  // Heuristic per requirements
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasProxy = (window as any).TelegramWebviewProxy;
  return /Telegram/i.test(ua) || !!hasProxy;
}

/**
 * Detects if the current platform is iOS (Safari or in-app webviews on iOS).
 */
export function isIOS(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  // Heuristic per requirements
  // Avoid MS streams (older IE)
  // iPadOS 13+ identifies as Mac, but still matches iPad in UA on many webviews; we use the provided heuristic
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
}

/**
 * Detects if the current platform is Android (including in-app webviews).
 */
export function isAndroid(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android/i.test(ua);
}

/**
 * Attempts to use Telegram's native sharing methods when available.
 */
function tryTelegramNativeShare(url: string, text?: string): boolean {
  if (typeof window === "undefined") return false;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const telegram = (window as any).Telegram?.WebApp;
  if (telegram && telegram.share) {
    try {
      telegram.share(url, text);
      return true;
    } catch {
      return false;
    }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webApp = (window as any).TelegramGameProxy || (window as any).TelegramWebviewProxy;
  if (webApp && webApp.postEvent) {
    try {
      webApp.postEvent('share_to_story', {
        media_url: url,
        text: text
      });
      return true;
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * Detects if current browser likely blocks blob operations (common in Telegram Android)
 */
function isLikelyBlockingBlobs(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  
  // Telegram Android browsers are known to block blob operations
  return (
    (ua.includes('telegram') && ua.includes('android')) ||
    (ua.includes('webview') && ua.includes('android'))
  );
}

/**
 * Forces a download on Android Telegram using data URL approach
 */
async function forceAndroidTelegramDownload(blob: Blob, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Convert blob to data URL
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        
        // Create a download link
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        link.style.display = 'none';
        
        // Force click with multiple strategies
        document.body.appendChild(link);
        
        // Try multiple click methods
        try {
          link.click();
        } catch (e) {
          // Fallback: create mouse event
          const event = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          link.dispatchEvent(event);
        }
        
        // Fallback: redirect to data URL
        setTimeout(() => {
          try {
            window.location.href = dataUrl;
          } catch (e) {
            // Final fallback: open new tab
            window.open(dataUrl, '_blank');
          }
        }, 100);
        
        setTimeout(() => {
          document.body.removeChild(link);
          resolve();
        }, 200);
      };
      
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
    } catch (error) {
      reject(error);
    }
  });
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
 * Internal fallback path for image blobs:
 * - Open Object URL in a new tab (best-effort)
 * - Also trigger a forced download
 * - Revoke the Object URL
 */
async function fallbackDownloadAndMaybeOpen(
  blob: Blob,
  filename: string,
  onFallback?: (reason: string) => void
): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    // Attempt to open in a new tab. If blocked, still proceed to download.
    const popup = tryOpenWindow(url);
    if (!popup) {
      // Popup may be blocked; continue with download anyway.
    }
    // Always force a download as well, to ensure user gets the file even if popup blocked.
    forceDownload(url, filename);
    onFallback?.("download");
  } finally {
    // Revoke after a short microtask to allow the download to start referencing the URL.
    // Using setTimeout 0 to give the browser a tick; not strictly required but safer across engines.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/**
 * shareImageBlob
 * Prefer native Web Share API when available; otherwise gracefully degrade.
 *
 * Behavior summary:
 * - Detect Telegram webview; if detected, skip native share attempts and go to download fallback.
 * - If navigator.share + canShare(files) supported, share with files (Web Share API Level 2).
 *   - AbortError is treated as user cancel and does not trigger fallback.
 * - Else, try navigator.share with text/url only (omit files).
 * - If navigator.share unavailable or fails, fallback to:
 *   - Open Object URL in new tab (best-effort) and also force download via <a download>.
 *   - If blob not available, force download (if possible with provided data); otherwise clipboard copy text/url.
 * - iOS quirks: avoid files array on older iOS; prefer text/url share if files rejected (TypeError).
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

  // Special handling for Android Telegram (most restrictive environment)
  if (isTelegramInApp() && isAndroid()) {
    try {
      // Try Telegram native share first
      const objectUrl = URL.createObjectURL(blob);
      try {
        if (tryTelegramNativeShare(objectUrl, text)) {
          return;
        }
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      
      // For Android Telegram, skip Web Share API (usually blocked) and go straight to download
      await forceAndroidTelegramDownload(blob, filename);
      onFallback?.("android-telegram-download");
      return;
    } catch (error) {
      console.warn('Android Telegram download failed:', error);
      // Fall through to general fallbacks
    }
  }

  // If in Telegram (iOS or other), try Telegram native methods first
  if (isTelegramInApp()) {
    // Create object URL for Telegram sharing
    const objectUrl = URL.createObjectURL(blob);
    try {
      if (tryTelegramNativeShare(objectUrl, text)) {
        return;
      }
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  // First preference: Web Share API with files (Level 2) when truly supported.
  // iOS Safari historically rejects files; guard with canShareFiles and handle TypeError.
  if (hasNavigatorShare) {
    try {
      // Construct File from blob as required.
      const file = new File([blob], filename, { type: blob.type || "image/png" });

      // Only attempt files path if environment claims to support it AND not on older iOS.
      if (canShareFiles([file])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const shareFn = (navigator as any).share?.bind(navigator);
        if (shareFn) {
          try {
            await shareFn({ files: [file], title, text, url });
            return;
          } catch (err: unknown) {
            if (isAbortError(err)) {
              // User cancelled; do not fallback.
              return;
            }
            // Some iOS versions throw TypeError for files; fall through to try text/url-only share.
            // No onFallback yet; we still might use native share without files.
          }
        }
      }

      // Second preference: text/url-only share (more compatible across iOS Safari).
      try {
        await (navigator as Navigator).share({ title, text, url });
        return;
      } catch (err: unknown) {
        if (isAbortError(err)) {
          // User cancelled; do not fallback.
          return;
        }
        // fall through to fallback
      }
    } catch {
      // Any unexpected error will fall through to fallback below.
    }
  }

  // Fallback path for Telegram: create downloadable link
  if (isTelegramInApp()) {
    const telegramUrl = await createTelegramShareUrl(blob, filename, text, url);
    if (telegramUrl) {
      try {
        window.location.href = telegramUrl;
        return;
      } catch {
        // fall through to standard fallback
      }
    }
  }

  // Standard fallback path:
  // - If we have a valid blob (image), open in new tab and force download.
  try {
    await fallbackDownloadAndMaybeOpen(blob, filename, onFallback);
  } catch {
    // If even that fails, try a plain forced download by constructing an object URL again
    try {
      const urlObj = URL.createObjectURL(blob);
      try {
        forceDownload(urlObj, filename);
        onFallback?.("download");
      } finally {
        URL.revokeObjectURL(urlObj);
      }
    } catch {
      // If download also fails, last resort: try clipboard text/url
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

  if (hasNavigatorShare) {
    try {
      await (navigator as Navigator).share({ title, text, url });
      return;
    } catch (err: unknown) {
      if (isAbortError(err)) {
        return;
      }
      // fall through to fallback
    }
  }

  // Fallbacks:
  if (url) {
    // Best-effort user-gesture-safe path
    tryOpenWindow(url);
  } else {
    const composed = [title, text, url].filter(Boolean).join(" ");
    await tryWriteClipboardText(composed);
  }
}

/**
 * Create a Telegram share URL with blob data
 */
async function createTelegramShareUrl(blob: Blob, filename: string, text?: string, url?: string): Promise<string | null> {
  try {
    // Convert blob to base64 for Telegram sharing
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const shareText = text ? encodeURIComponent(text) : '';
        const shareUrl = url ? encodeURIComponent(url) : '';
        resolve(`tg://share?text=${shareText}&url=${shareUrl}`);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
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