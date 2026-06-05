// Singleton: resolved once at startup to prevent dynamic import latency on button taps
let _twaSDK: any = null;
export const getTWA = async () => {
  if (!_twaSDK) {
    _twaSDK = (await import('@twa-dev/sdk')).default;
  }
  return _twaSDK;
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

