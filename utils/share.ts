/**
 * Simple native share utilities focused on Web Share API + basic fallbacks.
 * OS-agnostic approach for maximum compatibility.
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
 * Uses Web Share API with file sharing when available, falls back to download.
 * OS-agnostic approach that works across Android, iOS, and desktop.
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

  // Try Web Share API with files first (Level 2)
  if (hasNavigatorShare) {
    try {
      const file = new File([blob], filename, { type: blob.type || "image/png" });

      // Try file sharing if supported
      if (canShareFiles([file])) {
        try {
          await (navigator as Navigator).share({ files: [file], title, text, url });
          return;
        } catch (err: unknown) {
          if (isAbortError(err)) return; // User cancelled
        }
      }

      // Fall back to text/url sharing (more compatible)
      try {
        await (navigator as Navigator).share({ title, text, url });
        return;
      } catch (err: unknown) {
        if (isAbortError(err)) return; // User cancelled
      }
    } catch {
      // Fall through to download fallback
    }
  }

  // Simple fallback: download the image
  try {
    await fallbackDownloadAndMaybeOpen(blob, filename, onFallback);
  } catch {
    // Final fallback: copy text to clipboard
    if (text || url) {
      const composed = [text, url].filter(Boolean).join(" ");
      await tryWriteClipboardText(composed);
      onFallback?.("clipboard");
    } else {
      onFallback?.("none");
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
 * Utility: detect AbortError
 */
function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = err as any;
  return anyErr.name === "AbortError";
}