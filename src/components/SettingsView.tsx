'use client';

import React, { useState, useEffect, useMemo } from 'react';
import BookingCalendar from '@/components/BookingCalendar';
import { Creator, Product } from '@/types/store';
import { showAlert } from '@/utils/telegram';

interface SettingsViewProps {
  creator: Creator | null;
  lang: 'en' | 'ru';
  t: any;
  currentScreen: 'CATALOG' | 'SETTINGS' | 'PARTNER' | 'CALENDAR';
  setCurrentScreen: (screen: 'CATALOG' | 'SETTINGS' | 'PARTNER' | 'CALENDAR') => void;
  storeName: string;
  storeDescription: string;
  storeAvatar: string;
  storeBanner: string;
  setStoreAvatar: (avatar: string) => void;
  setStoreBanner: (banner: string) => void;
  socialLinks: { youtube?: string; instagram?: string; tiktok?: string; vk?: string; max?: string; };
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveSettings: (name: string, description: string, avatar: string, banner: string, socials: any, ton: string, p2p: string, p2pList: any[], calendarProvider: string, icsUrl: string, usdtTrc20?: string, usdtBep20?: string, other?: string, adminPaymentDetails?: any) => Promise<void>;
  bookingProductsList: Product[];
  busySlots: { start: string; end: string }[];
  dbBookings: any[];
  fetchBusySlotsForProduct: (prodId: string) => Promise<void>;
  buyerTgId: number;
  onOpenPremium: () => void;
  isCreatorPremium: boolean;
  onTriggerOnboarding?: () => void;
}

export default function SettingsView({
  creator,
  lang,
  t,
  currentScreen,
  setCurrentScreen,
  storeName,
  storeDescription,
  storeAvatar,
  storeBanner,
  setStoreAvatar,
  setStoreBanner,
  socialLinks,
  onAvatarUpload,
  onBannerUpload,
  onSaveSettings,
  bookingProductsList,
  busySlots,
  dbBookings,
  fetchBusySlotsForProduct,
  buyerTgId,
  onOpenPremium,
  isCreatorPremium,
  onTriggerOnboarding,
}: SettingsViewProps) {
  // Unified Settings Panel form states
  const [tempStoreName, setTempStoreName] = useState(storeName);
  const [tempStoreDesc, setTempStoreDesc] = useState(storeDescription);
  const [tempStoreAvatar, setTempStoreAvatar] = useState(storeAvatar);
  const [tempStoreBanner, setTempStoreBanner] = useState(storeBanner);
  
  const [tempYoutube, setTempYoutube] = useState(socialLinks.youtube || '');
  const [tempInsta, setTempInsta] = useState(socialLinks.instagram || '');
  const [tempTiktok, setTempTiktok] = useState(socialLinks.tiktok || '');
  const [tempVk, setTempVk] = useState(socialLinks.vk || '');
  const [tempMax, setTempMax] = useState(socialLinks.max || '');
  
  const [tempTonVal, setTempTonVal] = useState('');
  const [tempCards, setTempCards] = useState<{ id: string; label: string; card: string; qr?: string }[]>([]);
  const [tempUsdtTrc20, setTempUsdtTrc20] = useState('');
  const [tempUsdtBep20, setTempUsdtBep20] = useState('');
  const [tempCalProvider, setTempCalProvider] = useState('none');
  const [tempCalIcsUrl, setTempCalIcsUrl] = useState('');
  const [tempOther, setTempOther] = useState('');
  const [paymentSettingsTab, setPaymentSettingsTab] = useState<'card' | 'crypto' | 'other'>('card');

  // Admin Payment States
  const [adminTonVal, setAdminTonVal] = useState('');
  const [adminCards, setAdminCards] = useState<{ id: string; label: string; card: string; qr?: string }[]>([]);
  const [adminUsdtTrc20, setAdminUsdtTrc20] = useState('');
  const [adminUsdtBep20, setAdminUsdtBep20] = useState('');
  const [adminOther, setAdminOther] = useState('');
  const [adminPaymentTab, setAdminPaymentTab] = useState<'card' | 'crypto' | 'other'>('card');

  // Shipping Orders states
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isShippingActionLoading, setIsShippingActionLoading] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchOrders = async () => {
    if (!creator?.id) return;
    setIsLoadingOrders(true);
    try {
      const res = await fetch(`/api/store/orders?creator_id=${creator.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setOrdersList(data.orders);
      }
    } catch (e) {
      console.error('Error fetching orders:', e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (currentScreen === 'SETTINGS') {
      fetchOrders();
    }
  }, [currentScreen, creator?.id]);

  // Sync state values when settings screen opens or creator changes
  useEffect(() => {
    if (creator) {
      setTempStoreName(storeName);
      setTempStoreDesc(storeDescription);
      setTempStoreAvatar(storeAvatar);
      setTempStoreBanner(storeBanner);
      
      setTempYoutube(socialLinks.youtube || '');
      setTempInsta(socialLinks.instagram || '');
      setTempTiktok(socialLinks.tiktok || '');
      setTempVk(socialLinks.vk || '');
      setTempMax(socialLinks.max || '');
      
      const pd = creator.payment_details || {};
      setTempTonVal(pd.ton || '');
      
      // Initialize cards from p2p_list, or fall back to p2p if list is empty
      let cards = pd.p2p_list || [];
      if (cards.length === 0 && pd.p2p) {
        cards = [{ id: 'card_default', label: lang === 'ru' ? 'Основная' : 'Primary', card: pd.p2p }];
      }
      setTempCards(cards);

      setTempUsdtTrc20(pd.usdt_trc20 || '');
      setTempUsdtBep20(pd.usdt_bep20 || '');
      setTempCalProvider(pd.calendar_provider || 'none');
      setTempCalIcsUrl(pd.ics_url || '');
      setTempOther(pd.other || '');
    }
  }, [creator, currentScreen, storeName, storeDescription, storeAvatar, storeBanner, socialLinks, lang]);

  const isAdmin = useMemo(() => {
    if (!creator) return false;
    const username = creator.username?.toLowerCase() || '';
    const tgId = Number(creator.telegram_id);
    return username.includes('sher') || username === 'shertyonok' || tgId === 7999888 || tgId === 123456789 || tgId === 999999999 || tgId === 1780771122;
  }, [creator]);

  // Load admin wallets if user is admin
  useEffect(() => {
    if (currentScreen === 'SETTINGS' && isAdmin) {
      fetch('/api/admin/wallets')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.wallets) {
            const w = data.wallets;
            setAdminTonVal(w.ton || '');
            setAdminUsdtTrc20(w.usdt_trc20 || '');
            setAdminUsdtBep20(w.usdt_bep20 || '');
            setAdminOther(w.other || '');
            
            let cards = w.p2p_list || [];
            if (cards.length === 0 && w.p2p) {
              cards = [{ id: 'admin_card_default', label: lang === 'ru' ? 'Основная' : 'Primary', card: w.p2p }];
            }
            setAdminCards(cards);
          }
        })
        .catch(err => console.error('Failed to load admin wallets:', err));
    }
  }, [currentScreen, isAdmin, lang]);

  const [selectedSettingsBookingProdId, setSelectedSettingsBookingProdId] = useState(() => {
    return bookingProductsList[0]?.id || '';
  });
  
  useEffect(() => {
    if (bookingProductsList.length > 0 && !selectedSettingsBookingProdId) {
      setSelectedSettingsBookingProdId(bookingProductsList[0].id);
    }
  }, [bookingProductsList, selectedSettingsBookingProdId]);

  // Load slots for selected settings product
  useEffect(() => {
    if (selectedSettingsBookingProdId && currentScreen === 'SETTINGS') {
      fetchBusySlotsForProduct(selectedSettingsBookingProdId);
    }
  }, [selectedSettingsBookingProdId, currentScreen]);

  const [settingsBookingDate, setSettingsBookingDate] = useState('');
  const [settingsBookingTime, setSettingsBookingTime] = useState('');

  const [tonConnectUI, setTonConnectUI] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Load TON Connect UI SDK from CDN dynamically
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@tonconnect/ui@2.0.9/dist/tonconnect-ui.min.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).TON_CONNECT_UI) {
        const tc = new (window as any).TON_CONNECT_UI.TonConnectUI({
          manifestUrl: `${window.location.origin}/tonconnect-manifest.json`,
        });
        setTonConnectUI(tc);
      }
    };
    document.body.appendChild(script);
    
    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {
        // Ignore
      }
    };
  }, []);

  const handleConnectWallet = async () => {
    if (!tonConnectUI) {
      showAlert(lang === 'ru' ? 'Загрузка TON SDK...' : 'Loading TON SDK...');
      return;
    }
    try {
      if (tonConnectUI.connected) {
        await tonConnectUI.disconnect();
      }
      
      await tonConnectUI.openModal();
      
      const unsubscribe = tonConnectUI.onStatusChange((wallet: any) => {
        if (wallet && wallet.account) {
          const rawAddress = wallet.account.address;
          const friendlyAddr = (window as any).TON_CONNECT_UI.toUserFriendlyAddress(rawAddress);
          setTempTonVal(friendlyAddr);
          showAlert(lang === 'ru' ? '✓ Кошелек успешно подключен!' : '✓ Wallet connected successfully!');
          unsubscribe();
        }
      });
    } catch (e) {
      console.error('Wallet connection error:', e);
      showAlert(lang === 'ru' ? 'Ошибка подключения кошелька' : 'Wallet connection error');
    }
  };

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const filteredCards = tempCards.filter(c => c.card.trim() !== '');
      const defaultP2p = filteredCards[0]?.card || '';

      let adminPaymentDetails = undefined;
      if (isAdmin) {
        const filteredAdminCards = adminCards.filter(c => c.card.trim() !== '');
        const defaultAdminP2p = filteredAdminCards[0]?.card || '';
        adminPaymentDetails = {
          ton: adminTonVal,
          p2p: defaultAdminP2p,
          p2p_list: filteredAdminCards,
          usdt_trc20: adminUsdtTrc20,
          usdt_bep20: adminUsdtBep20,
          other: adminOther
        };
      }

      await onSaveSettings(
        tempStoreName,
        tempStoreDesc,
        tempStoreAvatar,
        tempStoreBanner,
        {
          youtube: tempYoutube,
          instagram: tempInsta,
          tiktok: tempTiktok,
          vk: tempVk,
          max: tempMax
        },
        tempTonVal,
        defaultP2p,
        filteredCards,
        tempCalProvider,
        tempCalIcsUrl,
        tempUsdtTrc20,
        tempUsdtBep20,
        tempOther,
        adminPaymentDetails
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatPremiumDate = (dateStr?: string | null) => {
    if (!dateStr) return lang === 'ru' ? '♾️ Пожизненная' : '♾️ Lifetime';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  return (
    <div style={{ minHeight: '100svh', background: 'var(--tg-bg)', padding: 'calc(var(--tg-safe-area-inset-top, env(safe-area-inset-top, 50px)) + 20px) 16px 80px', color: 'var(--tg-text)' }} className="animate-fade-in">
      {/* Settings Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button 
          onClick={() => setCurrentScreen('CATALOG')}
          style={{ background: 'none', border: 'none', color: 'var(--tg-link)', fontSize: '16px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          ← {lang === 'ru' ? 'Назад' : 'Back'}
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
          {lang === 'ru' ? 'Настройки' : 'Settings'}
        </h1>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSettingsSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Section 1: Profile Customization */}
        <div className="tg-card tour-settings-profile" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>👤</span> {lang === 'ru' ? 'Профиль магазина' : 'Shop Profile'}
          </h3>

          {/* Subscription Statistics */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '4px',
            border: '1px solid var(--tg-border)'
          }}>
            <div>
              <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--tg-text)' }}>
                {lang === 'ru' ? 'Тарифный план' : 'Subscription Plan'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--tg-hint)' }}>
                {isCreatorPremium ? (
                  <span>
                    {creator?.premium_until
                      ? (lang === 'ru' ? `👑 Премиум активен до: ${formatPremiumDate(creator.premium_until)}` : `👑 Premium active until: ${formatPremiumDate(creator.premium_until)}`)
                      : (lang === 'ru' ? '♾️ Пожизненный Premium' : '♾️ Lifetime Premium')}
                  </span>
                ) : (
                  <span>{lang === 'ru' ? 'Подписка неактивна ❌' : 'Subscription inactive ❌'}</span>
                )}
              </p>
            </div>
            {!isCreatorPremium && (
              <button
                type="button"
                onClick={onOpenPremium}
                className="btn-primary"
                style={{
                  width: 'auto',
                  padding: '6px 14px',
                  height: 'auto',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)',
                  color: '#000',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {lang === 'ru' ? 'Улучшить ⚡' : 'Upgrade ⚡'}
              </button>
            )}
          </div>

          {/* Onboarding & Tutorial Trigger */}
          {onTriggerOnboarding && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px',
              border: '1px solid var(--tg-border)'
            }}>
              <div>
                <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--tg-text)' }}>
                  {lang === 'ru' ? 'Обучение и онбординг' : 'Tutorial & Onboarding'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--tg-hint)' }}>
                  {lang === 'ru' ? 'Запустить интерактивное обучение и гид по приложению' : 'Launch interactive app guide and onboarding'}
                </p>
              </div>
              <button
                type="button"
                onClick={onTriggerOnboarding}
                className="btn-primary"
                style={{
                  width: 'auto',
                  padding: '6px 14px',
                  height: 'auto',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: 'var(--tg-accent)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                🚀 {lang === 'ru' ? 'Запуск' : 'Start'}
              </button>
            </div>
          )}
          
          <div className="bottom-sheet-form-group">
            <label className="bottom-sheet-label">{t.shopName}</label>
            <input 
              type="text" 
              className="tg-input" 
              value={tempStoreName} 
              onChange={(e) => setTempStoreName(e.target.value)} 
              required 
            />
          </div>
          
          <div className="bottom-sheet-form-group">
            <label className="bottom-sheet-label">{t.shopDescription}</label>
            <textarea 
              className="tg-input" 
              value={tempStoreDesc} 
              onChange={(e) => setTempStoreDesc(e.target.value)} 
              rows={3}
              style={{ resize: 'none' }}
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="bottom-sheet-label" style={{ fontSize: '11px' }}>{lang === 'ru' ? 'Аватар (1:1)' : 'Avatar (1:1)'}</label>
              {tempStoreAvatar && (
                <img src={tempStoreAvatar} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', display: 'block', marginBottom: '8px' }} alt="Avatar" />
              )}
              <label className="btn-secondary" style={{ textAlign: 'center', display: 'block', cursor: 'pointer', fontSize: '11px', padding: '6px' }}>
                📸 {lang === 'ru' ? 'Аватар' : 'Avatar'}
                <input type="file" accept="image/*" onChange={onAvatarUpload} style={{ display: 'none' }} />
              </label>
            </div>
            <div>
              <label className="bottom-sheet-label" style={{ fontSize: '11px' }}>{lang === 'ru' ? 'Баннер (3:1)' : 'Banner (3:1)'}</label>
              {tempStoreBanner && (
                <img src={tempStoreBanner} style={{ width: '100%', height: '36px', borderRadius: '6px', objectFit: 'cover', display: 'block', marginBottom: '8px' }} alt="Banner" />
              )}
              <label className="btn-secondary" style={{ textAlign: 'center', display: 'block', cursor: 'pointer', fontSize: '11px', padding: '6px' }}>
                📸 {lang === 'ru' ? 'Баннер' : 'Banner'}
                <input type="file" accept="image/*" onChange={onBannerUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Social Networks */}
        <div className="tg-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔗</span> {lang === 'ru' ? 'Социальные сети' : 'Social Networks'}
          </h3>
          
          <div className="bottom-sheet-form-group">
            <label className="bottom-sheet-label">{t.youtubeLink}</label>
            <input type="url" className="tg-input" placeholder="https://youtube.com/@channel" value={tempYoutube} onChange={(e) => setTempYoutube(e.target.value)} />
          </div>
          
          <div className="bottom-sheet-form-group">
            <label className="bottom-sheet-label">{t.instagramLink}</label>
            <input type="url" className="tg-input" placeholder="https://instagram.com/profile" value={tempInsta} onChange={(e) => setTempInsta(e.target.value)} />
          </div>

          <div className="bottom-sheet-form-group">
            <label className="bottom-sheet-label">{t.tiktokLink}</label>
            <input type="url" className="tg-input" placeholder="https://tiktok.com/@profile" value={tempTiktok} onChange={(e) => setTempTiktok(e.target.value)} />
          </div>

          <div className="bottom-sheet-form-group">
            <label className="bottom-sheet-label">{t.vkLink}</label>
            <input type="url" className="tg-input" placeholder="https://vk.com/page" value={tempVk} onChange={(e) => setTempVk(e.target.value)} />
          </div>

          <div className="bottom-sheet-form-group">
            <label className="bottom-sheet-label">{t.maxLink}</label>
            <input type="url" className="tg-input" placeholder="https://x.com/handle" value={tempMax} onChange={(e) => setTempMax(e.target.value)} />
          </div>
        </div>

        {/* Section 3: Payment Details */}
        <div className="tg-card tour-settings-payments" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💳</span> {lang === 'ru' ? 'Реквизиты оплаты' : 'Payment Details'}
          </h3>

          {/* Premium Method Selector Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => setPaymentSettingsTab('card')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 8px',
                borderRadius: '12px',
                border: paymentSettingsTab === 'card' ? '2px solid var(--tg-orange)' : '1px solid var(--tg-border)',
                background: paymentSettingsTab === 'card' ? 'rgba(244,128,32,0.08)' : 'transparent',
                color: 'var(--tg-text)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '18px' }}>💳</span>
              <span style={{ fontSize: '11px', fontWeight: 700 }}>
                {lang === 'ru' ? 'Карты' : 'Cards'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentSettingsTab('crypto')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 8px',
                borderRadius: '12px',
                border: paymentSettingsTab === 'crypto' ? '2px solid var(--tg-green)' : '1px solid var(--tg-border)',
                background: paymentSettingsTab === 'crypto' ? 'rgba(77,202,90,0.08)' : 'transparent',
                color: 'var(--tg-text)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '18px' }}>💎</span>
              <span style={{ fontSize: '11px', fontWeight: 700 }}>
                {lang === 'ru' ? 'Крипта' : 'Crypto'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentSettingsTab('other')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 8px',
                borderRadius: '12px',
                border: paymentSettingsTab === 'other' ? '2px solid var(--tg-accent)' : '1px solid var(--tg-border)',
                background: paymentSettingsTab === 'other' ? 'rgba(43,140,243,0.08)' : 'transparent',
                color: 'var(--tg-text)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '18px' }}>💬</span>
              <span style={{ fontSize: '11px', fontWeight: 700 }}>
                {lang === 'ru' ? 'Другое' : 'Other'}
              </span>
            </button>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '10px', border: '1px solid var(--tg-border)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* ── CARD TAB ── */}
            {paymentSettingsTab === 'card' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="animate-fade-in">
                <p style={{ fontSize: '12px', color: 'var(--tg-hint)', margin: 0 }}>
                  {lang === 'ru'
                    ? 'Укажите до 5 карт для перевода (СБП/РФ/мир). Покупатели смогут загрузить чек.'
                    : 'Configure up to 5 cards for receiving bank transfers. Buyers can upload a receipt.'}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {tempCards.map((item, idx) => (
                    <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--tg-border)' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          type="text" 
                          placeholder={lang === 'ru' ? 'Банк (Сбер, Альфа...)' : 'Bank (e.g. Sber)'} 
                          className="tg-input" 
                          style={{ flex: 1, fontSize: '12.5px', padding: '8px' }} 
                          value={item.label} 
                          onChange={(e) => {
                            const updated = [...tempCards];
                            updated[idx].label = e.target.value;
                            setTempCards(updated);
                          }} 
                        />
                        <button 
                          type="button" 
                          onClick={() => {
                            setTempCards(tempCards.filter(c => c.id !== item.id));
                          }}
                          style={{ 
                            background: 'rgba(233,92,92,0.12)', border: 'none', borderRadius: '6px', 
                            width: '32px', height: '32px', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', color: '#ff4d4d', cursor: 'pointer', fontSize: '14px' 
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      
                      <input 
                        type="text" 
                        placeholder={lang === 'ru' ? 'Номер карты / получатель' : 'Card number / receiver info'} 
                        className="tg-input" 
                        style={{ fontSize: '12.5px', padding: '8px' }} 
                        value={item.card} 
                        onChange={(e) => {
                          const updated = [...tempCards];
                          updated[idx].card = e.target.value;
                          setTempCards(updated);
                        }} 
                      />

                      {/* QR Code Upload block */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                        {item.qr ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                            <img src={item.qr} style={{ width: '42px', height: '42px', borderRadius: '4px', objectFit: 'contain', background: '#fff', border: '1px solid var(--tg-border)' }} alt="Card QR" />
                            <span style={{ fontSize: '11px', color: 'var(--tg-green)', fontWeight: 600 }}>✓ QR Загружен</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...tempCards];
                                delete updated[idx].qr;
                                setTempCards(updated);
                              }}
                              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ff4d4d', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              {lang === 'ru' ? 'Удалить QR' : 'Remove QR'}
                            </button>
                          </div>
                        ) : (
                          <label className="btn-secondary" style={{ width: '100%', padding: '6px 10px', fontSize: '11px', textAlign: 'center', display: 'block', cursor: 'pointer', borderStyle: 'dashed' }}>
                            📸 {lang === 'ru' ? 'Загрузить QR-код (СБП)' : 'Upload QR Code'}
                            <input 
                              type="file" 
                              accept="image/*" 
                              style={{ display: 'none' }} 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    const updated = [...tempCards];
                                    updated[idx].qr = reader.result as string;
                                    setTempCards(updated);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }} 
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {tempCards.length < 5 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ 
                        padding: '8px 12px', fontSize: '12px', fontWeight: 600, 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        borderStyle: 'dashed'
                      }}
                      onClick={() => {
                        setTempCards([...tempCards, { id: 'card_' + Date.now(), label: '', card: '' }]);
                      }}
                    >
                      ＋ {lang === 'ru' ? 'Добавить карту' : 'Add Card'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── CRYPTO TAB ── */}
            {paymentSettingsTab === 'crypto' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="animate-fade-in">
                <p style={{ fontSize: '12px', color: 'var(--tg-hint)', margin: 0 }}>
                  {lang === 'ru'
                    ? 'Введите крипто-адреса для приема платежей напрямую от покупателей.'
                    : 'Set wallet addresses to receive crypto direct transfers.'}
                </p>

                {/* TON Wallet */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="bottom-sheet-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>💎</span> TON Address
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      className="tg-input" 
                      placeholder="UQ..." 
                      value={tempTonVal} 
                      onChange={(e) => setTempTonVal(e.target.value)} 
                      style={{ fontSize: '12.5px', padding: '8px' }} 
                    />
                    {tempTonVal ? (
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        style={{ width: 'auto', padding: '0 10px', fontSize: '11px', whiteSpace: 'nowrap' }} 
                        onClick={async () => {
                          setTempTonVal('');
                          if (tonConnectUI && tonConnectUI.connected) {
                            await tonConnectUI.disconnect();
                          }
                        }}
                      >
                        ✕
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        className="btn-primary" 
                        style={{ width: 'auto', padding: '0 10px', fontSize: '11px', whiteSpace: 'nowrap', background: 'var(--tg-accent)' }} 
                        onClick={handleConnectWallet}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>

                {/* USDT TRC20 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="bottom-sheet-label">USDT TRC20 (Tron)</label>
                  <input 
                    type="text" 
                    className="tg-input" 
                    placeholder="T..." 
                    value={tempUsdtTrc20} 
                    onChange={(e) => setTempUsdtTrc20(e.target.value)} 
                    style={{ fontSize: '12.5px', padding: '8px' }} 
                  />
                </div>

                {/* USDT BEP20 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="bottom-sheet-label">USDT BEP20 (BSC)</label>
                  <input 
                    type="text" 
                    className="tg-input" 
                    placeholder="0x..." 
                    value={tempUsdtBep20} 
                    onChange={(e) => setTempUsdtBep20(e.target.value)} 
                    style={{ fontSize: '12.5px', padding: '8px' }} 
                  />
                </div>
              </div>
            )}

            {/* ── OTHER TAB ── */}
            {paymentSettingsTab === 'other' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} className="animate-fade-in">
                <p style={{ fontSize: '12px', color: 'var(--tg-hint)', margin: 0 }}>
                  {lang === 'ru'
                    ? 'Укажите свои инструкции или контакты для альтернативных способов оплаты.'
                    : 'Provide manual payment instructions or links for other methods.'}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="bottom-sheet-label">{lang === 'ru' ? 'Инструкции / Ссылка' : 'Instructions / Link'}</label>
                  <textarea 
                    className="tg-input" 
                    placeholder={lang === 'ru' ? 'Например: Напишите мне в личные сообщения @username для оплаты через PayPal.' : 'e.g. PM me @username to pay via PayPal.'} 
                    value={tempOther} 
                    onChange={(e) => setTempOther(e.target.value)} 
                    rows={4}
                    style={{ resize: 'none', fontSize: '12.5px', padding: '8px' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Calendar Sync & Schedule (Moved to separate screen) */}
        {bookingProductsList.length > 0 && (
          <div className="tg-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📅</span> {lang === 'ru' ? 'Синхронизация календаря и расписание' : 'Calendar & Schedule'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--tg-hint)', margin: 0, lineHeight: 1.4 }}>
              {lang === 'ru' 
                ? 'Настройка часов приема, блокировка дат и привязка Google/Apple календарей перенесены в отдельный раздел меню "Календарь" на главном экране.' 
                : 'Working hours, date blocking, and Google/Apple calendar integration have been moved to the dedicated "Calendar" screen accessible from the Quick Actions row.'}
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCurrentScreen('CALENDAR')}
              style={{ marginTop: '4px', height: '32px', fontSize: '11px', fontWeight: 700 }}
            >
              {lang === 'ru' ? 'Перейти в Календарь' : 'Go to Calendar'}
            </button>
          </div>
        )}

          {/* Administrator Settings (Developer Mode) */}
          {isAdmin && (
            <div className="tg-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '2px dashed #ffd700' }}>
              <h4 style={{ margin: '0', fontSize: '13.5px', fontWeight: 800, color: '#ffd700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                👑 {lang === 'ru' ? 'АДМИНИСТРАТОР: Прием оплат за Premium' : 'ADMINISTRATOR: Receive Premium Payments'}
              </h4>
              <p style={{ fontSize: '11.5px', color: 'var(--tg-hint)', lineHeight: 1.4, margin: '0' }}>
                {lang === 'ru'
                  ? 'Настройте кошельки платформы, на которые пользователи будут отправлять оплату за подписку Premium.'
                  : 'Configure the platform wallets where users will send their payments for Premium subscriptions.'}
              </p>

              {/* Admin Payment Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', margin: '4px 0' }}>
                {['card', 'crypto', 'other'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setAdminPaymentTab(tab as any)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: adminPaymentTab === tab ? '1.5px solid #ffd700' : '1px solid var(--tg-border)',
                      background: adminPaymentTab === tab ? 'rgba(255,215,0,0.08)' : 'transparent',
                      color: 'var(--tg-text)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{tab === 'card' ? '💳' : tab === 'crypto' ? '💎' : '💬'}</span>
                    <span>{tab === 'card' ? (lang === 'ru' ? 'Карты' : 'Cards') : tab === 'crypto' ? (lang === 'ru' ? 'Крипта' : 'Crypto') : (lang === 'ru' ? 'Другое' : 'Other')}</span>
                  </button>
                ))}
              </div>

              {/* Admin Payment Content */}
              <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '10px', border: '1px solid var(--tg-border)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {adminPaymentTab === 'card' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} className="animate-fade-in">
                    <p style={{ fontSize: '11px', color: 'var(--tg-hint)', margin: 0 }}>
                      {lang === 'ru' ? 'Карты для приема оплат (до 5):' : 'Cards for receiving payments (up to 5):'}
                    </p>
                    {adminCards.map((item, idx) => (
                      <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid var(--tg-border)' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder={lang === 'ru' ? 'Банк (Сбер, Альфа...)' : 'Bank (e.g. Sber)'}
                            className="tg-input"
                            style={{ flex: 1, fontSize: '11.5px', padding: '6px' }}
                            value={item.label}
                            onChange={(e) => {
                              const updated = [...adminCards];
                              updated[idx].label = e.target.value;
                              setAdminCards(updated);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setAdminCards(adminCards.filter(c => c.id !== item.id))}
                            style={{
                              background: 'rgba(233,92,92,0.12)', border: 'none', borderRadius: '4px',
                              width: '26px', height: '26px', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', color: '#ff4d4d', cursor: 'pointer', fontSize: '12px'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder={lang === 'ru' ? 'Номер карты / получатель' : 'Card number / receiver info'}
                          className="tg-input"
                          style={{ fontSize: '11.5px', padding: '6px' }}
                          value={item.card}
                          onChange={(e) => {
                            const updated = [...adminCards];
                            updated[idx].card = e.target.value;
                            setAdminCards(updated);
                          }}
                        />
                      </div>
                    ))}
                    {adminCards.length < 5 && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '6px', fontSize: '11px', borderStyle: 'dashed' }}
                        onClick={() => setAdminCards([...adminCards, { id: 'admin_card_' + Date.now(), label: '', card: '' }])}
                      >
                        ＋ {lang === 'ru' ? 'Добавить карту' : 'Add Card'}
                      </button>
                    )}
                  </div>
                )}

                {adminPaymentTab === 'crypto' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} className="animate-fade-in">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label className="bottom-sheet-label" style={{ fontSize: '11px' }}>💎 TON Wallet Address</label>
                      <input
                        type="text"
                        className="tg-input"
                        placeholder="UQ..."
                        value={adminTonVal}
                        onChange={(e) => setAdminTonVal(e.target.value)}
                        style={{ fontSize: '11.5px', padding: '6px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label className="bottom-sheet-label" style={{ fontSize: '11px' }}>USDT TRC20 Address</label>
                      <input
                        type="text"
                        className="tg-input"
                        placeholder="T..."
                        value={adminUsdtTrc20}
                        onChange={(e) => setAdminUsdtTrc20(e.target.value)}
                        style={{ fontSize: '11.5px', padding: '6px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label className="bottom-sheet-label" style={{ fontSize: '11px' }}>USDT BEP20 Address</label>
                      <input
                        type="text"
                        className="tg-input"
                        placeholder="0x..."
                        value={adminUsdtBep20}
                        onChange={(e) => setAdminUsdtBep20(e.target.value)}
                        style={{ fontSize: '11.5px', padding: '6px' }}
                      />
                    </div>
                  </div>
                )}

                {adminPaymentTab === 'other' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} className="animate-fade-in">
                    <label className="bottom-sheet-label" style={{ fontSize: '11px' }}>{lang === 'ru' ? 'Альтернативные инструкции' : 'Alternative instructions'}</label>
                    <textarea
                      className="tg-input"
                      placeholder={lang === 'ru' ? 'Например: Свяжитесь с @PayBioAdmin для оплаты через PayPal.' : 'e.g. Contact @PayBioAdmin for manual payout.'}
                      value={adminOther}
                      onChange={(e) => setAdminOther(e.target.value)}
                      rows={3}
                      style={{ resize: 'none', fontSize: '11.5px', padding: '6px' }}
                    />
                  </div>
                )}
              </div>


            </div>
          )}

        {/* Section 5: Orders & Shipping */}
        <div className="tg-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📦</span> {lang === 'ru' ? 'Заказы и доставка' : 'Orders & Shipping'}
          </h3>
          
          <p style={{ fontSize: '12.5px', color: 'var(--tg-hint)', margin: 0 }}>
            {lang === 'ru' 
              ? 'Список заказов на физические товары, требующие отправки.' 
              : 'List of orders for physical goods requiring shipment.'}
          </p>

          {isLoadingOrders ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
              <span className="spinner-mini" style={{
                width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.1)',
                borderTopColor: 'var(--tg-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite'
              }} />
            </div>
          ) : ordersList.filter(o => o.voucher && o.product?.sub_type === 'PHYSICAL').length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--tg-hint)', margin: 0, fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
              {lang === 'ru' ? 'Нет заказов физических товаров.' : 'No physical goods orders found.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ordersList.filter(o => o.voucher && o.product?.sub_type === 'PHYSICAL').map((order) => {
                const voucher = order.voucher;
                const delivery = voucher.delivery_data || {};
                const status = order.status;
                const isPending = status === 'PAID_PENDING_SHIPPING';
                const isShipped = status === 'SHIPPED';
                
                const handleCopy = (e: React.MouseEvent) => {
                  e.preventDefault();
                  const copyText = `Name: ${delivery.fullName || '—'}\nPhone: ${delivery.phone || '—'}\nMethod: ${delivery.shippingMethod || '—'}\nAddress: ${delivery.addressOrBranch || '—'}`;
                  navigator.clipboard.writeText(copyText).then(() => {
                    showAlert(lang === 'ru' ? '✓ Детали скопированы!' : '✓ Details copied!');
                  });
                };

                const handleMarkShipped = async (e: React.MouseEvent) => {
                  e.preventDefault();
                  const tracking = prompt(
                    lang === 'ru' 
                      ? 'Введите трек-номер отправления:' 
                      : 'Enter package tracking number:'
                  );
                  if (tracking === null) return;
                  if (!tracking.trim()) {
                    showAlert(lang === 'ru' ? 'Трек-номер не может быть пустым.' : 'Tracking number cannot be empty.');
                    return;
                  }
                  
                  setIsShippingActionLoading(prev => ({ ...prev, [order.id]: true }));
                  try {
                    const res = await fetch('/api/vouchers/ship', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ order_id: order.id, tracking_number: tracking.trim() })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                      showAlert(lang === 'ru' ? '✓ Заказ успешно отправлен!' : '✓ Order marked as shipped!');
                      fetchOrders();
                    } else {
                      showAlert(data.error || 'Failed to update order.');
                    }
                  } catch (err: any) {
                    showAlert(err.message || 'Error updating order.');
                  } finally {
                    setIsShippingActionLoading(prev => ({ ...prev, [order.id]: false }));
                  }
                };

                return (
                  <div key={order.id} style={{
                    padding: '12px', background: 'var(--tg-secondary-bg)',
                    borderRadius: '10px', border: '1px solid var(--tg-border)',
                    display: 'flex', flexDirection: 'column', gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--tg-text)' }}>
                        {order.product?.title || 'Product'}
                      </span>
                      <span className={`chip ${isShipped ? 'chip-green' : isPending ? 'chip-orange' : 'chip-blue'}`} style={{ fontSize: '10.5px' }}>
                        {isShipped ? (lang === 'ru' ? 'Отправлено' : 'Shipped') : isPending ? (lang === 'ru' ? 'Оплачено (Ждет отправку)' : 'Paid (Pending Shipping)') : status}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--tg-hint)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <p style={{ margin: 0 }}>👤 <b>{lang === 'ru' ? 'Получатель:' : 'Name:'}</b> {delivery.fullName}</p>
                      <p style={{ margin: 0 }}>📞 <b>{lang === 'ru' ? 'Телефон:' : 'Phone:'}</b> {delivery.phone}</p>
                      <p style={{ margin: 0 }}>🚚 <b>{lang === 'ru' ? 'Способ:' : 'Method:'}</b> {delivery.shippingMethod}</p>
                      <p style={{ margin: 0 }}>📍 <b>{lang === 'ru' ? 'Адрес:' : 'Address:'}</b> {delivery.addressOrBranch}</p>
                      {delivery.trackingNumber && (
                        <p style={{ margin: 0, color: 'var(--tg-green)' }}>🔢 <b>{lang === 'ru' ? 'Трек-номер:' : 'Tracking Number:'}</b> <code>{delivery.trackingNumber}</code></p>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleCopy}
                        style={{ padding: '6px 12px', fontSize: '11.5px', height: 'auto', flex: 1 }}
                      >
                        📋 {lang === 'ru' ? 'Копировать адрес' : 'Copy Details'}
                      </button>
                      {isPending && (
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={handleMarkShipped}
                          disabled={isShippingActionLoading[order.id]}
                          style={{
                            padding: '6px 12px', fontSize: '11.5px', height: 'auto', flex: 1,
                            background: isShippingActionLoading[order.id] ? 'var(--tg-hint)' : 'var(--tg-green)',
                            cursor: isShippingActionLoading[order.id] ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isShippingActionLoading[order.id] ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <span className="spinner-mini" style={{ width: '10px', height: '10px' }} />
                              {lang === 'ru' ? 'Обработка...' : 'Shipping...'}
                            </span>
                          ) : (
                            lang === 'ru' ? 'Отметить как отправленный' : 'Mark as Shipped'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Save & Cancel Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ flex: 1 }}
            onClick={() => setCurrentScreen('CATALOG')}
          >
            {lang === 'ru' ? 'Отмена' : 'Cancel'}
          </button>
          <button 
            type="submit" 
            className="btn-primary" 
            style={{
              flex: 2,
              background: isSaving ? 'var(--tg-hint)' : 'var(--tg-accent)',
              cursor: isSaving ? 'not-allowed' : 'pointer'
            }}
            disabled={isSaving}
          >
            {isSaving ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="spinner-mini" style={{
                  width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite'
                }} />
                {lang === 'ru' ? 'Сохранение...' : 'Saving...'}
              </span>
            ) : (
              lang === 'ru' ? 'Сохранить настройки ✓' : 'Save Settings ✓'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
