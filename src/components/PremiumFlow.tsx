'use client';

import React from 'react';

interface PremiumFlowProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ru';
  t: any;
  isUpgrading: boolean;
  onBuyPremiumWithStars: (isSubscription: boolean) => void;
  isPremiumStarsHelpOpen: boolean;
  onTogglePremiumStarsHelp: () => void;
  onOpenLink: (url: string) => void;
  promoCodeInput: string;
  onPromoCodeInputChange: (val: string) => void;
  onApplyPromoCode: () => void;
  promoCodeStatus: { type: 'success' | 'error' | null; message: string };
  isApplyingPromo: boolean;
}

export default function PremiumFlow({
  isOpen,
  onClose,
  lang,
  t,
  isUpgrading,
  onBuyPremiumWithStars,
  isPremiumStarsHelpOpen,
  onTogglePremiumStarsHelp,
  onOpenLink,
  promoCodeInput,
  onPromoCodeInputChange,
  onApplyPromoCode,
  promoCodeStatus,
  isApplyingPromo,
}: PremiumFlowProps) {
  return (
    <div className={`bottom-sheet-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-handle" />
        <button 
          type="button" 
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
            width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--tg-text)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', zIndex: 10
          }}
        >
          ✕
        </button>
        
        {/* Header / Graphic icon */}
        <div style={{
          width: '50px', height: '50px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '26px', margin: '0 auto 10px',
          boxShadow: '0 4px 16px rgba(255, 215, 0, 0.3)'
        }}>
          👑
        </div>
        
        <h2 className="bottom-sheet-title" style={{ marginBottom: '4px', fontSize: '18px' }}>{t.premiumTitle}</h2>
        <p style={{ textAlign: 'center', fontSize: '12.5px', color: 'var(--tg-hint)', marginBottom: '16px', lineHeight: 1.4 }}>
          {t.premiumSub}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '18px' }}>👑</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--tg-text)', margin: 0 }}>{t.premiumStatusBadge}</p>
              <p style={{ fontSize: '11.5px', color: 'var(--tg-hint)', marginTop: '2px', lineHeight: 1.3, margin: 0 }}>{t.premiumStatusBadgeDesc}</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '18px' }}>🚫</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--tg-text)', margin: 0 }}>{t.removeBrandingLogo}</p>
              <p style={{ fontSize: '11.5px', color: 'var(--tg-hint)', marginTop: '2px', lineHeight: 1.3, margin: 0 }}>{t.removeBrandingLogoDesc}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '18px' }}>🔓</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--tg-text)', margin: 0 }}>{t.unlimitedTransactions}</p>
              <p style={{ fontSize: '11.5px', color: 'var(--tg-hint)', marginTop: '2px', lineHeight: 1.3, margin: 0 }}>{t.unlimitedTransactionsDesc}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '18px' }}>🔓</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--tg-text)', margin: 0 }}>🤖 AI Cover Generator</p>
              <p style={{ fontSize: '11.5px', color: 'var(--tg-hint)', marginTop: '2px', lineHeight: 1.3, margin: 0 }}>{lang === 'ru' ? 'Создавайте обложки для товаров по описанию с помощью ИИ FLUX.' : 'Create product covers from description using FLUX AI.'}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '18px' }}>📈</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--tg-text)', margin: 0 }}>{t.advancedInsights}</p>
              <p style={{ fontSize: '11.5px', color: 'var(--tg-hint)', marginTop: '2px', lineHeight: 1.3, margin: 0 }}>{t.advancedInsightsDesc}</p>
            </div>
          </div>
        </div>

        {/* Promo code block */}
        <div style={{ marginBottom: '16px', borderTop: '1px solid var(--tg-border)', paddingTop: '12px' }}>
          <label className="bottom-sheet-label" style={{ display: 'block', marginBottom: '6px', textAlign: 'left', fontWeight: 600 }}>
            {lang === 'ru' ? 'Активация промокода' : 'Activate Promo Code'}
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="tg-input"
              placeholder={lang === 'ru' ? 'Введите промокод' : 'Enter promo code'}
              value={promoCodeInput}
              onChange={(e) => onPromoCodeInputChange(e.target.value)}
              style={{ flex: 1, textTransform: 'uppercase', padding: '8px 12px', fontSize: '14px' }}
              disabled={isApplyingPromo}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={onApplyPromoCode}
              disabled={isApplyingPromo || !promoCodeInput.trim()}
              style={{ width: 'auto', padding: '0 16px', height: '34px', borderRadius: '10px', fontSize: '13px' }}
            >
              {isApplyingPromo ? (lang === 'ru' ? 'Применение…' : 'Applying…') : (lang === 'ru' ? 'Применить' : 'Apply')}
            </button>
          </div>
          {promoCodeStatus.message && (
            <p style={{
              fontSize: '12px',
              marginTop: '6px',
              color: promoCodeStatus.type === 'success' ? '#4dca5a' : '#e95c5c',
              textAlign: 'left',
              fontWeight: 500,
              margin: '6px 0 0 0'
            }}>
              {promoCodeStatus.message}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            type="button"
            className="btn-primary" 
            style={{ background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)', color: '#000', fontWeight: 700, padding: '10px 16px', fontSize: '13.5px', height: '38px', borderRadius: '10px' }}
            onClick={() => onBuyPremiumWithStars(false)}
            disabled={isUpgrading}
          >
            {isUpgrading ? (lang === 'ru' ? 'Оформление…' : 'Processing…') : (lang === 'ru' ? 'Разово на 1 мес (500 Stars)' : 'One-time 1 Month (500 Stars)')}
          </button>
          <button 
            type="button"
            className="btn-primary" 
            style={{ background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)', color: '#000', fontWeight: 700, padding: '10px 16px', fontSize: '13.5px', height: '38px', borderRadius: '10px' }}
            onClick={() => onBuyPremiumWithStars(true)}
            disabled={isUpgrading}
          >
            {isUpgrading ? (lang === 'ru' ? 'Оформление…' : 'Processing…') : (lang === 'ru' ? 'Подписка на месяц (500 Stars/мес)' : 'Monthly Subscription (500 Stars/mo)')}
          </button>
        </div>

        {/* Stars Purchase Assistant for Premium Purchase */}
        <div style={{ marginTop: '14px', borderTop: '1px solid var(--tg-border)', paddingTop: '10px' }}>
          <button 
            type="button"
            onClick={onTogglePremiumStarsHelp}
            style={{
              background: 'none', border: 'none', color: 'var(--tg-link)',
              fontSize: '12px', cursor: 'pointer', padding: '4px 0',
              display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto',
              fontWeight: 500
            }}
          >
            {isPremiumStarsHelpOpen ? '▲' : '▼'} {lang === 'ru' ? 'Как получить Telegram Stars?' : 'How to get Telegram Stars?'}
          </button>
          
          {isPremiumStarsHelpOpen && (
            <div style={{
              marginTop: '8px', padding: '10px', background: 'rgba(255,255,255,0.01)',
              border: '1px solid var(--tg-border)', borderRadius: '8px',
              fontSize: '12px', lineHeight: 1.5, textAlign: 'left'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>
                {lang === 'ru' ? 'Купить Звёзды можно двумя способами:' : 'You can buy Stars in two ways:'}
              </p>
              <ol style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>
                  <button 
                    type="button"
                    onClick={() => onOpenLink('https://fragment.com/stars')}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--tg-link)', fontWeight: 600, fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', textAlign: 'left' }}
                  >
                    Fragment.com/stars
                  </button>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--tg-hint)', marginTop: '2px' }}>
                    {lang === 'ru' 
                      ? '💡 Дешевле! Оплата криптовалютой TON / кошельком TON.' 
                      : '💡 Cheaper! Pay with TON cryptocurrency / TON wallet.'}
                  </span>
                </li>
                <li>
                  <button 
                    type="button"
                    onClick={() => onOpenLink('tg://settings/stars')}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--tg-link)', fontWeight: 600, fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', textAlign: 'left' }}
                  >
                    {lang === 'ru' ? 'Настройки Telegram' : 'Telegram Settings'}
                  </button>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--tg-hint)', marginTop: '2px' }}>
                    {lang === 'ru'
                      ? '📱 Быстрая покупка через App Store / Google Play на мобильном.'
                      : '📱 Fast top-up via App Store / Google Play on mobile.'}
                  </span>
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
