interface InactiveStoreViewProps {
  lang: 'en' | 'ru';
}

export default function InactiveStoreView({ lang }: InactiveStoreViewProps) {
  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--tg-bg)',
      color: 'var(--tg-text)',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center'
    }} className="animate-scale-in">
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%',
        background: 'rgba(239,92,92,0.1)', border: '2px solid var(--tg-red, #e95c5c)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '40px', marginBottom: '24px', color: 'var(--tg-red, #e95c5c)'
      }}>
        🔒
      </div>
      <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 12px 0' }}>
        {lang === 'ru' ? 'Магазин временно приостановлен' : 'Store Temporarily Inactive'}
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--tg-hint)', marginBottom: '32px', lineHeight: 1.5, maxWidth: '300px' }}>
        {lang === 'ru' 
          ? 'Этот магазин временно недоступен, так как срок действия подписки владельца истек.'
          : 'This store is temporarily unavailable because the owner\'s subscription has expired.'}
      </p>
      <button
        className="btn-primary"
        onClick={() => {
          if (typeof window !== 'undefined') {
            const WebApp = (window as any).Telegram?.WebApp;
            if (WebApp?.openTelegramLink) {
              WebApp.openTelegramLink('https://t.me/PaybioBot');
            } else {
              window.open('https://t.me/PaybioBot', '_blank');
            }
          }
        }}
        style={{ width: '100%', maxWidth: '240px', background: 'var(--tg-accent)' }}
      >
        {lang === 'ru' ? 'Создать свой ИИ-магазин ⚡️' : 'Create Your AI Store ⚡️'}
      </button>
    </div>
  );
}
