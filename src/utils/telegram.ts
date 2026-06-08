// Safe Telegram WebApp accessor — avoids importing @twa-dev/sdk at module
// evaluation time, which crashes with "Cannot access 'tW' before initialization"
// (a TDZ error caused by circular deps in the SDK when bundled with Next.js).
//
// Instead, it polls the window.Telegram.WebApp global object, which is
// injected by the Telegram client script, with a timeout to prevent hanging.
let _twaSDK: any = null;

export const getTWA = async () => {
  if (_twaSDK) return _twaSDK;
  
  if (typeof window === 'undefined') {
    return null;
  }
  
  const immediateWebApp = (window as any).Telegram?.WebApp;
  if (immediateWebApp) {
    _twaSDK = immediateWebApp;
    return immediateWebApp;
  }
  
  return new Promise((resolve) => {
    let attempts = 0;
    const interval = setInterval(() => {
      const WebApp = (window as any).Telegram?.WebApp;
      attempts++;
      if (WebApp) {
        clearInterval(interval);
        _twaSDK = WebApp;
        resolve(WebApp);
      } else if (attempts > 20) { // 20 * 10ms = 200ms max wait
        clearInterval(interval);
        resolve(null);
      }
    }, 10);
  });
};

export const showAlert = (message: string) => {
  if (typeof window !== 'undefined') {
    const WebApp = (window as any).Telegram?.WebApp;
    if (WebApp?.showAlert) {
      WebApp.showAlert(message);
      return;
    }
  }
  alert(message);
};

export const cleanProductId = (id: string | null): string | null => {
  if (!id) return null;
  if (id.startsWith('ref_')) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('paybio_referrer_tg_id', id.substring(4));
    }
    return null;
  }
  return id;
};

export const handleOpenLink = (url: string) => {
  if (typeof window !== 'undefined') {
    const WebApp = (window as any).Telegram?.WebApp;
    if (url.startsWith('tg://') || url.includes('t.me/')) {
      if (WebApp?.openTelegramLink) {
        WebApp.openTelegramLink(url);
        return;
      }
    } else {
      if (WebApp?.openLink) {
        WebApp.openLink(url);
        return;
      }
    }
  }
  window.open(url, '_blank');
};

