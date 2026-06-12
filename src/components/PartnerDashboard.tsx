import { useEffect, useState } from 'react';

const DASHBOARD_TRANSLATIONS = {
  en: {
    title: 'Partner Cabin',
    back: 'Back',
    earningsCard: 'Total Earnings',
    paidCard: 'Paid Out',
    availableCard: 'Available to Withdraw',
    referredCount: 'Active Referrals',
    tierInfo: 'Commission Tier',
    tier1Name: 'Tier 1 (20% Recurring)',
    tier2Name: 'Tier 2 (30% Recurring)',
    progressText: '{count}/50 active referrals to unlock Tier 2 (30%)',
    tonInputLabel: 'TON Payout Address',
    tonInputPlaceholder: 'Enter your TON address (e.g., UQ...)',
    amountLabel: 'Amount in USD',
    minWithdrawMessage: 'Minimum withdrawal is $50 USD',
    withdrawBtn: 'Withdraw Funds',
    withdrawSuccess: '🎉 Payout request submitted! Admin will process your TON transfer shortly.',
    withdrawFailed: '❌ Payout request failed: ',
    loading: 'Loading partner statistics...',
    copyBtn: 'Copy',
    copiedText: 'Copied!',
    inviteText: 'Your Referral Link',
    shareBtn: 'Share',
  },
  ru: {
    title: 'Кабинет партнера',
    back: 'Назад',
    earningsCard: 'Всего заработано',
    paidCard: 'Выплачено',
    availableCard: 'Доступно к выводу',
    referredCount: 'Активные рефералы',
    tierInfo: 'Ваш тариф комиссии',
    tier1Name: 'Тариф 1 (20% пожизненно)',
    tier2Name: 'Тариф 2 (30% пожизненно)',
    progressText: '{count}/50 активных рефералов для перехода на 30%',
    tonInputLabel: 'Адрес TON кошелька',
    tonInputPlaceholder: 'Введите TON адрес (например, UQ...)',
    amountLabel: 'Сумма в USD',
    minWithdrawMessage: 'Минимальная сумма вывода — $50 USD',
    withdrawBtn: 'Вывести средства',
    withdrawSuccess: '🎉 Запрос на выплату отправлен! Администратор произведет выплату в TON в ближайшее время.',
    withdrawFailed: '❌ Ошибка запроса выплаты: ',
    loading: 'Загрузка статистики...',
    copyBtn: 'Копировать',
    copiedText: 'Скопировано!',
    inviteText: 'Ваша реферальная ссылка',
    shareBtn: 'Поделиться',
  }
};

interface PartnerDashboardProps {
  creator: any;
  setCreator: (creator: any) => void;
  setCurrentScreen: (screen: 'CATALOG' | 'SETTINGS' | 'PARTNER') => void;
  lang: 'en' | 'ru';
  t: any;
}

export default function PartnerDashboard({
  creator,
  setCreator,
  setCurrentScreen,
  lang,
  t: parentTranslations
}: PartnerDashboardProps) {
  const dt = DASHBOARD_TRANSLATIONS[lang];
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tonAddress, setTonAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState<number>(50);
  const [withdrawing, setWithdrawing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Generate Referral deep link
  const affiliateLink = creator ? `https://t.me/PaybioBot/app?startapp=ref_${creator.id}` : '';

  useEffect(() => {
    if (!creator?.id) return;
    
    // Set initial wallet address from profile
    if (creator.ton_withdrawal_address) {
      setTonAddress(creator.ton_withdrawal_address);
    } else if (creator.payment_details?.ton) {
      setTonAddress(creator.payment_details.ton);
    }

    async function fetchStats() {
      try {
        const res = await fetch(`/api/partner/stats?partner_id=${creator.id}`);
        const data = await res.json();
        if (data.success) {
          setStats(data);
          setWithdrawAmount(Number(data.available_balance.toFixed(2)));
        }
      } catch (err) {
        console.error('Failed to load partner stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [creator?.id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = async () => {
    const shareText = lang === 'ru'
      ? '🚀 Создай свой ИИ-магазин цифровых товаров за 1 минуту в Telegram с помощью PayBio!'
      : '🚀 Build your AI-powered Telegram storefront for digital products in 1 minute with PayBio!';
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(affiliateLink)}&text=${encodeURIComponent(shareText)}`;
    
    try {
      const WebApp = (window as any).Telegram?.WebApp;
      if (WebApp) {
        WebApp.openTelegramLink(shareUrl);
      } else {
        window.open(shareUrl, '_blank');
      }
    } catch (err) {
      window.open(shareUrl, '_blank');
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tonAddress.trim()) return;
    if (withdrawAmount < 50) return;
    if (stats && withdrawAmount > stats.available_balance) return;

    setWithdrawing(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/partner/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: creator.id,
          ton_address: tonAddress.trim(),
          amount_to_withdraw_usd: withdrawAmount
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: dt.withdrawSuccess });
        setStats((prev: any) => ({
          ...prev,
          total_paid: prev.total_paid + withdrawAmount,
          available_balance: Math.max(0, prev.available_balance - withdrawAmount)
        }));
        setCreator((prev: any) => ({
          ...prev,
          ton_withdrawal_address: tonAddress.trim()
        }));
      } else {
        setStatusMsg({ type: 'error', text: `${dt.withdrawFailed}${data.error || 'Server error'}` });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `${dt.withdrawFailed}${err.message || 'Network error'}` });
    } finally {
      setWithdrawing(false);
    }
  };

  const isTier2 = stats?.partner_tier === 2;
  const activeCount = stats?.active_referrals_count || 0;
  const progressPercent = Math.min(100, (activeCount / 50) * 100);
  const canWithdraw = stats && stats.available_balance >= 50 && tonAddress.trim().length > 0;

  return (
    <div style={{
      padding: 'calc(var(--tg-safe-area-inset-top, env(safe-area-inset-top, 50px)) + 12px) 20px 40px',
      color: 'var(--tg-text)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button 
          onClick={() => setCurrentScreen('CATALOG')}
          style={{
            alignSelf: 'flex-start',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '8px 16px',
            color: 'var(--tg-text)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          {dt.back}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>{dt.title}</h2>
          <span style={{ fontSize: '11px', color: 'var(--tg-hint)', opacity: 0.8 }}>PayBio Affiliate Program</span>
        </div>
      </div>

      {loading ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          flexGrow: 1, gap: '20px', color: 'var(--tg-text)', minHeight: '50vh'
        }}>
          <div style={{
            width: '36px', height: '36px',
            border: '3.5px solid rgba(255,255,255,0.08)',
            borderTopColor: 'var(--tg-accent, #2b8cf3)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ fontSize: '14px', fontWeight: 600, opacity: 0.7, letterSpacing: '0.2px' }}>{dt.loading}</p>
        </div>
      ) : (
        <>
          {/* TIER LEVEL AND PROGRESS */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>👑</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--tg-hint)' }}>{dt.tierInfo}</span>
          </div>
          <span style={{
            fontSize: '12px',
            fontWeight: 800,
            background: isTier2 
              ? 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)' 
              : 'linear-gradient(135deg, #2b8cf3 0%, #0056b3 100%)',
            color: isTier2 ? '#000' : '#fff',
            padding: '6px 14px',
            borderRadius: '24px',
            boxShadow: isTier2 
              ? '0 2px 10px rgba(255,215,0,0.2)' 
              : '0 2px 10px rgba(43,140,243,0.2)',
            textTransform: 'uppercase',
            letterSpacing: '0.3px'
          }}>
            {isTier2 ? 'Tier 2 (30%)' : 'Tier 1 (20%)'}
          </span>
        </div>

        {/* PROGRESS BAR (Only if Tier 1) */}
        {!isTier2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--tg-hint)', fontWeight: 500 }}>
              <span style={{ opacity: 0.9 }}>{dt.progressText.replace('{count}', String(activeCount))}</span>
              <span style={{ color: 'var(--tg-text)', fontWeight: 700 }}>{activeCount} / 50</span>
            </div>
            <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #2b8cf3 0%, #38ef7d 100%)',
                borderRadius: '6px',
                transition: 'width 0.6s cubic-bezier(0.1, 0.8, 0.2, 1)'
              }} />
            </div>
          </div>
        )}

        {isTier2 && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(255, 215, 0, 0.05)',
            border: '1px dashed rgba(255, 215, 0, 0.2)',
            borderRadius: '12px',
            fontSize: '12.5px',
            color: '#ffd700',
            fontWeight: 500,
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            lineHeight: 1.4
          }}>
            <span>✨</span>
            <span>You have unlocked permanent maximum referral commission (30%)!</span>
          </div>
        )}
      </div>

      {/* METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        
        {/* Total Earnings */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(56, 239, 125, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
          border: '1px solid rgba(56, 239, 125, 0.15)',
          borderRadius: '20px',
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--tg-hint)', fontWeight: 600 }}>{dt.earningsCard}</span>
          <span style={{ fontSize: '24px', fontWeight: 900, color: '#38ef7d', letterSpacing: '-0.5px' }}>
            ${stats?.total_earnings.toFixed(2)}
          </span>
        </div>

        {/* Referrals Count */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--tg-hint)', fontWeight: 600 }}>{dt.referredCount}</span>
          <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--tg-text)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {activeCount} <span style={{ fontSize: '18px', opacity: 0.7 }}>👥</span>
          </span>
        </div>

        {/* Large Available to Withdraw Card */}
        <div style={{
          gridColumn: 'span 2',
          background: 'linear-gradient(135deg, rgba(43, 140, 243, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
          border: '1px solid rgba(43, 140, 243, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(12px)',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--tg-hint)', fontWeight: 600 }}>{dt.availableCard}</span>
            <span style={{ fontSize: '32px', fontWeight: 900, color: '#2b8cf3', letterSpacing: '-1px' }}>
              ${stats?.available_balance.toFixed(2)}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--tg-hint)', fontWeight: 600 }}>{dt.paidCard}</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--tg-hint)', opacity: 0.9 }}>
              ${stats?.total_paid.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* REFERRAL LINK CARD */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--tg-border)',
        borderRadius: '20px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--tg-text)', letterSpacing: '-0.2px' }}>{dt.inviteText}</label>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            readOnly 
            value={affiliateLink}
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid var(--tg-border)',
              borderRadius: '12px',
              padding: '12px',
              color: 'var(--tg-hint)',
              fontSize: '12.5px',
              outline: 'none',
              fontFamily: 'monospace'
            }}
          />
          <button 
            onClick={handleCopyLink}
            style={{
              background: copied ? '#38ef7d' : '#2b8cf3',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '0 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '90px'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {copied ? dt.copiedText : dt.copyBtn}
          </button>
          
          <button 
            onClick={handleShareLink}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.05)',
              color: 'var(--tg-text)',
              borderWidth: '1px',
              borderRadius: '12px',
              padding: '0 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <svg style={{ width: '13px', height: '13px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            {dt.shareBtn}
          </button>
        </div>
      </div>

      {/* WITHDRAWAL FORM */}
      <form onSubmit={handleWithdraw} style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--tg-border)',
        borderRadius: '20px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--tg-text)' }}>{dt.tonInputLabel}</label>
          <input 
            type="text" 
            required
            placeholder={dt.tonInputPlaceholder}
            value={tonAddress}
            onChange={(e) => setTonAddress(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--tg-border)',
              borderRadius: '12px',
              padding: '14px',
              color: 'var(--tg-text)',
              fontSize: '13px',
              outline: 'none',
              transition: 'border-color 0.2s',
              fontFamily: 'monospace'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', fontWeight: 700 }}>{dt.amountLabel}</label>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#2b8cf3' }}>${withdrawAmount.toFixed(2)}</span>
          </div>
          
          {/* Progress bar towards $50 threshold */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, ((stats?.available_balance || 0) / 50) * 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #2b8cf3 0%, #38ef7d 100%)',
                borderRadius: '4px',
                transition: 'width 0.4s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--tg-hint)', fontWeight: 700 }}>
              <span>0</span>
              <span>50</span>
            </div>
          </div>
        </div>

        {/* STATUS MESSAGE */}
        {statusMsg && (
          <div style={{
            padding: '12px 14px',
            borderRadius: '12px',
            fontSize: '12.5px',
            lineHeight: '1.45',
            background: statusMsg.type === 'success' ? 'rgba(56, 239, 125, 0.05)' : 'rgba(255, 94, 98, 0.05)',
            border: statusMsg.type === 'success' ? '1px solid rgba(56, 239, 125, 0.2)' : '1px solid rgba(255, 94, 98, 0.2)',
            color: statusMsg.type === 'success' ? '#38ef7d' : '#ff5e62',
            display: 'flex',
            gap: '8px'
          }}>
            <span>{statusMsg.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Withdrawal warning */}
        {stats && stats.available_balance < 50 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: '#ff5e62',
            fontSize: '11.5px',
            fontWeight: 600,
            background: 'rgba(255, 94, 98, 0.03)',
            padding: '8px',
            borderRadius: '10px',
            border: '1px dashed rgba(255, 94, 98, 0.15)'
          }}>
            <span>⚠️</span>
            <span>{dt.minWithdrawMessage}</span>
          </div>
        )}

        <button 
          type="submit"
          disabled={withdrawing || !canWithdraw}
          style={{
            background: canWithdraw 
              ? 'linear-gradient(135deg, #2b8cf3 0%, #0056b3 100%)' 
              : 'rgba(255,255,255,0.03)',
            color: canWithdraw ? '#fff' : 'var(--tg-hint)',
            border: 'none',
            borderRadius: '14px',
            padding: '16px',
            fontSize: '14.5px',
            fontWeight: 700,
            cursor: canWithdraw ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.2s ease',
            boxShadow: canWithdraw ? '0 4px 15px rgba(43, 140, 243, 0.25)' : 'none'
          }}
          onMouseDown={(e) => { if (canWithdraw) e.currentTarget.style.transform = 'scale(0.97)'; }}
          onMouseUp={(e) => { if (canWithdraw) e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {withdrawing && (
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255,255,255,0.2)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          )}
          <span>{dt.withdrawBtn}</span>
        </button>
      </form>
        </>
      )}
    </div>
  );
}
