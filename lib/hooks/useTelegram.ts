
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

  // Enhanced Telegram detection functions
  const isTelegramWebView = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    // Method 1: Check for Telegram WebApp API
    if (window.Telegram?.WebApp) {
      return true;
    }
    
    // Method 2: Check user agent for Telegram mobile browsers
    const userAgent = navigator.userAgent.toLowerCase();
    const isTelegramUA = userAgent.includes('telegram') || 
                         userAgent.includes('tgweb') ||
                         userAgent.includes('t.me');
    
    // Method 3: Check if running in iframe (Telegram web apps run in iframes)
    const isInIframe = window.parent !== window;
    
    // Method 4: Check for Telegram-specific referrer
    const hasTelegramReferrer = document.referrer.includes('t.me') || 
                              document.referrer.includes('telegram');
    
    // Method 5: Check for platform-specific indicators
    const platform = navigator.platform.toLowerCase();
    const isMobilePlatform = /android|iphone|ipad|ipod/.test(platform);
    
    // Only consider it Telegram if we have strong indicators
    // Mobile browsers accessing t.me directly should NOT be treated as Telegram Web App
    return (isTelegramUA && isInIframe) || 
           (hasTelegramReferrer && isInIframe) ||
           (window.Telegram?.WebApp !== undefined);
  }, []);

  useEffect(() => {
    const initTelegram = () => {
      const isTelegram = isTelegramWebView();
      
      if (isTelegram) {
        try {
          const tg = window.Telegram?.WebApp;
          
          if (tg) {
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
              user: tg.initDataUnsafe.user,
              detectionMethod: 'WebApp API'
            });
          } else {
            // If we detected Telegram context but no WebApp API,
            // this might be a mobile browser viewing t.me directly
            console.log('Telegram context detected but no WebApp API available');
            setIsTelegramWebApp(false);
          }
        } catch (error) {
          console.error('Error initializing Telegram Web App:', error);
          setIsTelegramWebApp(false);
        }
      } else {
        setIsTelegramWebApp(false);
      }
    };

    // Add a small delay to ensure proper initialization
    const timer = setTimeout(initTelegram, 100);
    
    return () => clearTimeout(timer);
  }, [isTelegramWebView]);

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
