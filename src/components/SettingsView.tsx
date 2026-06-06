'use client';

import React, { useState, useEffect, useMemo } from 'react';
import BookingCalendar from '@/components/BookingCalendar';
import { Creator, Product } from '@/types/store';
import { showAlert } from '@/utils/telegram';

interface SettingsViewProps {
  creator: Creator | null;
  lang: 'en' | 'ru';
  t: any;
  currentScreen: 'CATALOG' | 'SETTINGS';
  setCurrentScreen: (screen: 'CATALOG' | 'SETTINGS') => void;
  storeName: string;
  storeDescription: string;
  storeAvatar: string;
  storeBanner: string;
  setStoreAvatar: (avatar: string) => void;
  setStoreBanner: (banner: string) => void;
  socialLinks: { youtube?: string; instagram?: string; tiktok?: string; vk?: string; max?: string; };
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveSettings: (name: string, description: string, avatar: string, banner: string, socials: any, ton: string, p2p: string, p2pList: any[], calendarProvider: string, icsUrl: string) => Promise<void>;
  bookingProductsList: Product[];
  busySlots: { start: string; end: string }[];
  dbBookings: any[];
  fetchBusySlotsForProduct: (prodId: string) => Promise<void>;
  buyerTgId: number;
  onOpenPremium: () => void;
  isCreatorPremium: boolean;
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
  const [tempP2pVal, setTempP2pVal] = useState('');
  const [tempCardsList, setTempCardsList] = useState<any[]>([]);
  const [tempCalProvider, setTempCalProvider] = useState('none');
  const [tempCalIcsUrl, setTempCalIcsUrl] = useState('');
  const [newP2pLabel, setNewP2pLabel] = useState('');
  const [newP2pCard, setNewP2pCard] = useState('');

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
      setTempP2pVal(pd.p2p || '');
      setTempCardsList(pd.p2p_list || []);
      setTempCalProvider(pd.calendar_provider || 'none');
      setTempCalIcsUrl(pd.ics_url || '');
    }
  }, [creator, currentScreen, storeName, storeDescription, storeAvatar, storeBanner, socialLinks]);

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
      tempP2pVal,
      tempCardsList,
      tempCalProvider,
      tempCalIcsUrl
    );
  };

  const formatPremiumDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
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
        <div className="tg-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                    👑 {lang === 'ru' ? `Премиум активен до: ${formatPremiumDate(creator?.premium_until)}` : `Premium active until: ${formatPremiumDate(creator?.premium_until)}`}
                  </span>
                ) : (
                  <span>{lang === 'ru' ? 'Бесплатный тариф' : 'Free package'}</span>
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
        <div className="tg-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💳</span> {lang === 'ru' ? 'Реквизиты оплаты' : 'Payment Details'}
          </h3>
          
          <div className="bottom-sheet-form-group">
            <label className="bottom-sheet-label">{lang === 'ru' ? 'Основной TON кошелек' : 'Default TON Wallet'}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" className="tg-input" placeholder="UQ..." value={tempTonVal} onChange={(e) => setTempTonVal(e.target.value)} style={{ flex: 1 }} />
              <button type="button" className="btn-primary" style={{ width: 'auto', padding: '0 12px', whiteSpace: 'nowrap', fontSize: '12px', background: 'var(--tg-accent)' }} onClick={handleConnectWallet}>
                💎 {lang === 'ru' ? 'Wallet' : 'Connect Wallet'}
              </button>
            </div>
          </div>
          
          <div className="bottom-sheet-form-group">
            <label className="bottom-sheet-label">{lang === 'ru' ? 'Основная карта P2P' : 'Default P2P Card'}</label>
            <input type="text" className="tg-input" placeholder="Visa 4321-..." value={tempP2pVal} onChange={(e) => setTempP2pVal(e.target.value)} />
          </div>

          {isCreatorPremium ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--tg-border)', paddingTop: '14px' }}>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'var(--tg-text)' }}>
                👑 {lang === 'ru' ? 'Дополнительные карты P2P' : 'Additional P2P Cards'} ({tempCardsList.length})
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {tempCardsList.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--tg-secondary-bg)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>
                    <span><strong>{item.label}:</strong> {item.card}</span>
                    <button type="button" onClick={() => setTempCardsList(tempCardsList.filter(c => c.id !== item.id))} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '14px' }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="text" placeholder={lang === 'ru' ? 'Банк' : 'Bank'} className="tg-input" style={{ flex: 1, fontSize: '12px', padding: '6px' }} value={newP2pLabel} onChange={(e) => setNewP2pLabel(e.target.value)} />
                <input type="text" placeholder={lang === 'ru' ? 'Карта' : 'Card'} className="tg-input" style={{ flex: 2, fontSize: '12px', padding: '6px' }} value={newP2pCard} onChange={(e) => setNewP2pCard(e.target.value)} />
                <button type="button" className="btn-primary" style={{ width: 'auto', padding: '0 12px', fontSize: '12px' }} onClick={() => {
                  if (newP2pLabel && newP2pCard) {
                    setTempCardsList([...tempCardsList, { id: 'card_' + Date.now(), label: newP2pLabel, card: newP2pCard }]);
                    setNewP2pLabel('');
                    setNewP2pCard('');
                  }
                }}>
                  ＋
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '10px', background: 'rgba(255,215,0,0.08)', border: '1px dashed rgba(255,215,0,0.3)', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#ffd700', margin: 0 }}>👑 Premium: Добавление нескольких карт P2P</p>
            </div>
          )}
        </div>

        {/* Section 4: Calendar Sync & Schedule */}
        <div className="tg-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📅</span> {lang === 'ru' ? 'Интеграция календаря' : 'Calendar Integration'}
          </h3>
          
          <p style={{ fontSize: '12px', color: 'var(--tg-hint)', margin: 0 }}>
            {lang === 'ru' ? 'Выберите провайдер для синхронизации занятых слотов:' : 'Choose a provider to sync busy slots:'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {['none', 'google', 'apple'].map((prov) => (
              <button
                key={prov}
                type="button"
                onClick={() => setTempCalProvider(prov)}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: tempCalProvider === prov ? '2px solid var(--tg-accent)' : '1px solid var(--tg-border)',
                  background: tempCalProvider === prov ? 'rgba(82,158,255,0.08)' : 'transparent',
                  color: 'var(--tg-text)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {prov === 'none' ? 'None' : prov}
              </button>
            ))}
          </div>

          {tempCalProvider !== 'none' && (
            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{lang === 'ru' ? 'Ссылка на ICS календарь' : 'Calendar ICS Link'}</label>
              <input type="url" className="tg-input" placeholder="webcal://... or https://..." value={tempCalIcsUrl} onChange={(e) => setTempCalIcsUrl(e.target.value)} />
            </div>
          )}

          {/* Local DB Booking Calendar */}
          <div style={{ borderTop: '1px solid var(--tg-border)', paddingTop: '14px', marginTop: '6px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800 }}>
              ⚙️ {lang === 'ru' ? 'Управление бронированиями' : 'Manage Bookings'}
            </h4>
            {bookingProductsList.length > 0 ? (
              <>
                <div className="bottom-sheet-form-group" style={{ marginBottom: '12px' }}>
                  <label className="bottom-sheet-label">{lang === 'ru' ? 'Выберите товар-запись' : 'Select Booking Product'}</label>
                  <select
                    className="tg-input"
                    value={selectedSettingsBookingProdId}
                    onChange={(e) => setSelectedSettingsBookingProdId(e.target.value)}
                    style={{ background: 'var(--tg-secondary-bg)', color: 'var(--tg-text)', border: '1px solid var(--tg-border)' }}
                  >
                    {bookingProductsList.map((bp) => (
                      <option key={bp.id} value={bp.id}>{bp.title}</option>
                    ))}
                  </select>
                </div>
                
                <BookingCalendar
                  slotsText={bookingProductsList.find(bp => bp.id === selectedSettingsBookingProdId)?.content_url || ''}
                  busySlots={busySlots}
                  bookings={dbBookings}
                  bookingDate={settingsBookingDate}
                  setBookingDate={setSettingsBookingDate}
                  bookingTime={settingsBookingTime}
                  setBookingTime={setSettingsBookingTime}
                  lang={lang}
                  isOwner={true}
                  productId={selectedSettingsBookingProdId}
                  userTgId={buyerTgId}
                  onRefreshBusySlots={() => fetchBusySlotsForProduct(selectedSettingsBookingProdId)}
                />
              </>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--tg-hint)', margin: 0, fontStyle: 'italic' }}>
                {lang === 'ru' ? 'У вас нет услуг по бронированию времени.' : 'You have no booking-type services.'}
              </p>
            )}
          </div>
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
            style={{ flex: 2 }}
          >
            {lang === 'ru' ? 'Сохранить настройки ✓' : 'Save Settings ✓'}
          </button>
        </div>
      </form>
    </div>
  );
}
