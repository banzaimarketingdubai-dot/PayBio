import { useEffect, useState } from 'react';

const DASHBOARD_TRANSLATIONS = {
  en: {
    title: 'Partner Dashboard',
    back: 'Back to Catalog',
    earningsCard: 'Total Earnings',
    paidCard: 'Paid Out',
    availableCard: 'Available to Withdraw',
    referredCount: 'Active Referrals',
    tierInfo: 'Commission Tier',
    tier1Name: 'Tier 1 (20% Recurring)',
    tier2Name: 'Tier 2 (30% Recurring)',
    progressText: '{count}/50 active referrals to unlock Tier 2 (30%)',
    tonInputLabel: 'TON Wallet Address',
    tonInputPlaceholder: 'Enter your TON address (e.g. UQ...)',
    amountLabel: 'Amount in USD',
    minWithdrawMessage: 'Minimum withdrawal amount is $50 USD',
    withdrawBtn: 'Withdraw Funds',
    withdrawSuccess: '🎉 Withdrawal request submitted successfully! Admin will process your TON payout shortly.',
    withdrawFailed: '❌ Payout request failed: ',
    loading: 'Loading partner statistics...',
    copyBtn: 'Copy Link',
    copiedText: 'Copied!',
    inviteText: 'Your Referral Link',
    shareBtn: 'Share Link',
  },
  ru: {
    title: 'Кабинет партнера',
    back: 'Назад в каталог',
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
    withdrawSuccess: '🎉 Запрос на выплату успешно отправлен! Администратор произведет выплату в TON в ближайшее время.',
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
          // If available balance is less than $50, default withdraw input to 50 anyway (but validation block handles it)
          if (data.available_balance >= 50) {
            setWithdrawAmount(Number(data.available_balance.toFixed(2)));
          }
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
        // Update stats locally
        setStats((prev: any) => ({
          ...prev,
          total_paid: prev.total_paid + withdrawAmount,
          available_balance: Math.max(0, prev.available_balance - withdrawAmount)
        }));
        // Update creator object in parent state
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

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '80vh', gap: '16px', color: 'var(--tg-text)'
      }}>
        <div className="spinner" />
        <p style={{ fontSize: '14px', fontWeight: 500 }}>{dt.loading}</p>
      </div>
    );
  }

  const isTier2 = stats?.partner_tier === 2;
  const activeCount = stats?.active_referrals_count || 0;
  const progressPercent = Math.min(100, (activeCount / 50) * 100);

  const canWithdraw = stats && stats.available_balance >= 50 && tonAddress.trim().length > 0;

  return (
    <div style={{ padding: '16px', color: 'var(--tg-text)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>{dt.title}</h2>
        <button 
          onClick={() => setCurrentScreen('CATALOG')}
          style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '12px',
            padding: '8px 12px', color: 'var(--tg-text)', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {dt.back}
        </button>
      </div>

      {/* TIER LEVEL AND PROGRESS */}
      <div className="tg-card" style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--tg-border)',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--tg-hint)' }}>{dt.tierInfo}</span>
          <span style={{
            fontSize: '13px', fontWeight: 700,
            background: isTier2 ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 'rgba(255,255,255,0.08)',
            color: isTier2 ? '#000' : 'var(--tg-text)',
            padding: '4px 10px', borderRadius: '20px'
          }}>
            {isTier2 ? dt.tier2Name : dt.tier1Name}
          </span>
        </div>

        {/* PROGRESS BAR (Only if Tier 1) */}
        {!isTier2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--tg-hint)' }}>
              <span>{dt.progressText.replace('{count}', String(activeCount))}</span>
              <span>{activeCount}/50</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${progressPercent}%`, height: '100%',
                background: 'linear-gradient(90deg, var(--tg-accent) 0%, #38ef7d 100%)',
                borderRadius: '4px', transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        )}

        {isTier2 && (
          <div style={{
            padding: '8px 12px', background: 'rgba(255, 215, 0, 0.05)', border: '1px dashed #FFD700',
            borderRadius: '8px', fontSize: '12px', color: '#FFD700', display: 'flex', gap: '8px', alignItems: 'center'
          }}>
            🎉 <span>You have unlocked permanent maximum referral commission (30%)!</span>
          </div>
        )}
      </div>

      {/* METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="tg-card" style={{
          background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--tg-border)',
          borderRadius: '16px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px'
        }}>
          <span style={{ fontSize: '11.5px', color: 'var(--tg-hint)' }}>{dt.earningsCard}</span>
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#38ef7d' }}>${stats?.total_earnings.toFixed(2)}</span>
        </div>

        <div className="tg-card" style={{
          background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--tg-border)',
          borderRadius: '16px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px'
        }}>
          <span style={{ fontSize: '11.5px', color: 'var(--tg-hint)' }}>{dt.referredCount}</span>
          <span style={{ fontSize: '20px', fontWeight: 800 }}>{activeCount} 👥</span>
        </div>

        <div className="tg-card" style={{
          gridColumn: 'span 2',
          background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(8px)',
          borderRadius: '16px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--tg-hint)' }}>{dt.availableCard}</span>
            <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--tg-accent)' }}>${stats?.available_balance.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
            <span style={{ fontSize: '12px', color: 'var(--tg-hint)' }}>{dt.paidCard}</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--tg-hint)' }}>${stats?.total_paid.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* REFERRAL LINK CARD */}
      <div className="tg-card" style={{
        background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--tg-border)',
        borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px'
      }}>
        <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tg-text)' }}>{dt.inviteText}</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            readOnly 
            value={affiliateLink}
            style={{
              flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--tg-border)',
              borderRadius: '10px', padding: '10px', color: 'var(--tg-hint)', fontSize: '12px',
              outline: 'none'
            }}
          />
          <button 
            onClick={handleCopyLink}
            style={{
              background: copied ? '#38ef7d' : 'var(--tg-accent)', color: '#fff',
              border: 'none', borderRadius: '10px', padding: '0 14px', fontSize: '12px',
              fontWeight: 700, cursor: 'pointer', transition: 'background-color 0.2s'
            }}
          >
            {copied ? dt.copiedText : dt.copyBtn}
          </button>
          <button 
            onClick={handleShareLink}
            style={{
              background: 'rgba(255,255,255,0.08)', color: 'var(--tg-text)',
              border: 'none', borderRadius: '10px', padding: '0 12px', fontSize: '12px',
              fontWeight: 700, cursor: 'pointer'
            }}
          >
            {dt.shareBtn}
          </button>
        </div>
      </div>

      {/* WITHDRAWAL FORM */}
      <form onSubmit={handleWithdraw} className="tg-card" style={{
        background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--tg-border)',
        borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 700 }}>{dt.tonInputLabel}</label>
          <input 
            type="text" 
            required
            placeholder={dt.tonInputPlaceholder}
            value={tonAddress}
            onChange={(e) => setTonAddress(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.15)', border: '1px solid var(--tg-border)',
              borderRadius: '10px', padding: '12px', color: 'var(--tg-text)', fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', fontWeight: 700 }}>{dt.amountLabel}</label>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--tg-accent)' }}>${withdrawAmount.toFixed(0)}</span>
          </div>
          
          {/* Slider input */}
          <input 
            type="range"
            min={50}
            max={stats ? Math.max(50, Math.ceil(stats.available_balance)) : 100}
            step={1}
            disabled={!stats || stats.available_balance < 50}
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(Number(e.target.value))}
            style={{
              width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)',
              borderRadius: '3px', outline: 'none', cursor: 'pointer', accentColor: 'var(--tg-accent)'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--tg-hint)' }}>
            <span>$50 Min</span>
            <span>Max: ${stats ? stats.available_balance.toFixed(2) : '$0'}</span>
          </div>
        </div>

        {/* STATUS MESSAGE */}
        {statusMsg && (
          <div style={{
            padding: '10px 12px', borderRadius: '10px', fontSize: '12px', lineHeight: '1.4',
            background: statusMsg.type === 'success' ? 'rgba(56, 239, 125, 0.06)' : 'rgba(255, 94, 98, 0.06)',
            border: statusMsg.type === 'success' ? '1px solid #38ef7d' : '1px solid #ff5e62',
            color: statusMsg.type === 'success' ? '#38ef7d' : '#ff5e62'
          }}>
            {statusMsg.text}
          </div>
        )}

        {/* Withdrawal warning */}
        {stats && stats.available_balance < 50 && (
          <span style={{ fontSize: '11px', color: '#ff5e62', alignSelf: 'center', marginTop: '-4px' }}>
            ⚠️ {dt.minWithdrawMessage}
          </span>
        )}

        <button 
          type="submit"
          disabled={withdrawing || !canWithdraw}
          style={{
            background: canWithdraw ? 'var(--tg-accent)' : 'rgba(255,255,255,0.04)',
            color: canWithdraw ? '#fff' : 'var(--tg-hint)',
            border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px',
            fontWeight: 700, cursor: canWithdraw ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'background-color 0.2s'
          }}
        >
          {withdrawing && <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />}
          <span>{dt.withdrawBtn}</span>
        </button>
      </form>
    </div>
  );
}
