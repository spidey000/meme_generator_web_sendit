/**
 * Utility for debugging Telegram Web App detection
 * This can be used in browser console to verify detection logic
 */

export const debugTelegramDetection = () => {
  if (typeof window === 'undefined') {
    console.log('Window not available');
    return;
  }

  const results = {
    userAgent: navigator.userAgent,
    hasTelegramWebApp: !!window.Telegram?.WebApp,
    isInIframe: window.parent !== window,
    referrer: document.referrer,
    hasTelegramReferrer: document.referrer.includes('t.me') || document.referrer.includes('telegram'),
    platform: navigator.platform,
    isMobile: /android|iphone|ipad|ipod/.test(navigator.platform.toLowerCase()),
    telegramWebAppDetails: null as any,
    detectionResult: false
  };

  // Detailed WebApp check
  if (window.Telegram?.WebApp) {
    results.telegramWebAppDetails = {
      version: window.Telegram.WebApp.version,
      platform: window.Telegram.WebApp.platform,
      initDataUnsafe: window.Telegram.WebApp.initDataUnsafe,
      themeParams: window.Telegram.WebApp.themeParams
    };
  }

  // Detection logic (same as in useTelegram hook)
  const isTelegramUA = results.userAgent.toLowerCase().includes('telegram') || 
                       results.userAgent.toLowerCase().includes('tgweb') ||
                       results.userAgent.toLowerCase().includes('t.me');
  
  results.detectionResult = (isTelegramUA && results.isInIframe) || 
                           (results.hasTelegramReferrer && results.isInIframe) ||
                           (window.Telegram?.WebApp !== undefined);

  console.log('🔍 Telegram Detection Debug Results:', results);
  console.log('📱 Should show Telegram UI:', results.detectionResult);
  
  return results;
};

// Add to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).debugTelegramDetection = debugTelegramDetection;
}