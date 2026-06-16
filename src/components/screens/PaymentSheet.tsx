'use client';

import React from 'react';
import { Product } from '@/types/store';
import { handleOpenLink } from '@/utils/telegram';

export interface PaymentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ru';
  t: any;
  product: Product;
  bookingDate: string;
  bookingTime: string;
  tonAmount: string;
  checkoutMethod: 'card' | 'stars' | 'crypto' | 'other' | null;
  setCheckoutMethod: (method: 'card' | 'stars' | 'crypto' | 'other' | null) => void;
  p2pList: any[];
  checkoutP2pIdx: number;
  setCheckoutP2pIdx: (idx: number) => void;
  copied: boolean;
  copy: (text: string) => void;
  cryptoSubMethod: 'ton' | 'usdt_trc20' | 'usdt_bep20';
  setCryptoSubMethod: (method: 'ton' | 'usdt_trc20' | 'usdt_bep20') => void;
  tonDetails: string;
  handleSelectPaymentMethod: (method: 'card' | 'crypto') => void;
  handleStarsPayment: () => void;
  handleBuyDirect: () => void;
  hasBookingConflict: boolean;
  verifying: boolean;
  verifySuccess: boolean;
  verifyError: string | null;
  setVerifyError: (error: string | null) => void;
  isProcessingPayment: boolean;
  handleClaimPayment: (receiptUrl?: string) => void;
  activeOrderId: string | null;
}

export default function PaymentSheet({
  isOpen,
  onClose,
  lang,
  t,
  product,
  bookingDate,
  bookingTime,
  tonAmount,
  checkoutMethod,
  setCheckoutMethod,
  p2pList,
  checkoutP2pIdx,
  setCheckoutP2pIdx,
  copied,
  copy,
  cryptoSubMethod,
  setCryptoSubMethod,
  tonDetails,
  handleSelectPaymentMethod,
  handleStarsPayment,
  handleBuyDirect,
  hasBookingConflict,
  verifying,
  verifySuccess,
  verifyError,
  setVerifyError,
  isProcessingPayment,
  handleClaimPayment,
  activeOrderId
}: PaymentSheetProps) {
  const [showInstructions, setShowInstructions] = React.useState(true);
  const [screenshot, setScreenshot] = React.useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setShowInstructions(true);
      setScreenshot(null);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  const renderReceiptUploadZone = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
        {!verifying && !verifySuccess && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Upload Zone */}
            <div 
              className={`upload-zone ${screenshot ? 'has-file' : ''}`}
              onClick={triggerFileInput}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '20px',
                minHeight: '120px'
              }}
            >
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
              />
              
              {screenshot ? (
                <>
                  <div style={{ position: 'relative', width: '100%', maxHeight: '180px', display: 'flex', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <img 
                      src={screenshot} 
                      style={{ maxHeight: '150px', borderRadius: '8px', objectFit: 'contain' }} 
                      alt="Payment screenshot" 
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setScreenshot(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '0px',
                        background: 'var(--tg-red)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        zIndex: 10
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--tg-green)', fontWeight: 600 }}>
                    {lang === 'ru' ? '✓ Скриншот загружен' : '✓ Screenshot uploaded'}
                  </span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '32px' }}>📸</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tg-text)' }}>
                    {lang === 'ru' ? 'Загрузить скриншот платежа' : 'Upload payment screenshot'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--tg-hint)' }}>
                    {lang === 'ru' ? 'Нажмите, чтобы выбрать файл (JPEG, PNG)' : 'Tap to select file (JPEG, PNG)'}
                  </span>
                </>
              )}
            </div>

            <button
              onClick={() => handleClaimPayment(screenshot || undefined)}
              className="btn-primary"
              disabled={hasBookingConflict || !screenshot}
              style={{
                background: !hasBookingConflict && screenshot ? 'var(--tg-accent)' : 'var(--tg-hint)',
                height: '44px',
                fontSize: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: !hasBookingConflict && screenshot ? 'pointer' : 'not-allowed'
              }}
            >
              <span>⚡️</span>
              <span>
                {lang === 'ru'
                  ? 'Я оплатил, уведомить автора'
                  : 'I have paid, notify the creator'}
              </span>
            </button>

            {verifyError && (
              <div style={{
                padding: '10px 12px',
                background: 'rgba(233,92,92,0.1)',
                border: '1px solid rgba(233,92,92,0.2)',
                borderRadius: '10px',
                fontSize: '12.5px',
                color: 'var(--tg-red)',
              }} className="animate-scale-in">
                ❌ {verifyError}
                <button
                  type="button"
                  onClick={() => handleClaimPayment(screenshot || undefined)}
                  style={{ marginLeft: '8px', fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '12px' }}
                >
                  {lang === 'ru' ? 'Повторить' : 'Retry'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {verifying && (
          <div style={{
            padding: '20px 14px',
            background: 'var(--tg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--tg-border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }} className="animate-fade-in">
            <span className="spinner-mini" style={{
              width: '24px',
              height: '24px',
              border: '2px solid rgba(255,255,255,0.1)',
              borderTopColor: 'var(--tg-accent)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ fontSize: '12.5px', color: 'var(--tg-hint)', margin: 0 }}>
              {lang === 'ru' ? 'Уведомляем автора об оплате...' : 'Notifying the creator...'}
            </p>
          </div>
        )}

        {/* Success / Waiting state */}
        {verifySuccess && (
          <div style={{
            padding: '20px 16px',
            background: 'rgba(77,202,90,0.08)',
            border: '1px solid rgba(77,202,90,0.2)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
            textAlign: 'center'
          }} className="animate-scale-in">
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--tg-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: '#fff'
            }}>✓</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--tg-green)', margin: '0 0 4px 0' }}>
                {lang === 'ru' ? 'Запрос отправлен автору' : 'Request sent to creator'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--tg-hint)', margin: 0, lineHeight: 1.4 }}>
                {lang === 'ru'
                  ? 'Как только он проверит баланс, бот пришлет вам товар.'
                  : 'As soon as they check their balance, the bot will deliver your product.'}
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                setCheckoutMethod(null);
                handleClaimPayment(); // Reset states if needed, or caller handles it on close
              }}
              className="btn-primary"
              style={{ background: 'var(--tg-green)', height: '38px', fontSize: '13px', borderRadius: '8px', marginTop: '4px', width: '100%' }}
            >
              {lang === 'ru' ? 'Закрыть ✓' : 'Close ✓'}
            </button>
            <button
              onClick={() => handleOpenLink('https://t.me/PaybioBot')}
              style={{
                background: 'rgba(233,92,92,0.08)',
                border: '1.5px solid var(--tg-red)',
                color: 'var(--tg-red)',
                borderRadius: '8px',
                height: '38px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                width: '100%',
                marginTop: '4px'
              }}
            >
              🚨 {lang === 'ru' ? 'Открыть диспут' : 'Open Dispute'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const handleSheetOverlayClick = () => {
    if (!verifying) {
      onClose();
      setCheckoutMethod(null);
    }
  };

  return (
    <>
      <div 
        className={`bottom-sheet-overlay ${isOpen ? 'active' : ''}`} 
      style={isOpen ? { zIndex: 1100 } : undefined} 
      onClick={handleSheetOverlayClick}
    >
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90svh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="bottom-sheet-handle" />
        <button 
          type="button" 
          onClick={() => {
            if (!verifying) {
              onClose();
              setCheckoutMethod(null);
            }
          }}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
            width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--tg-text)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', zIndex: 10
          }}
        >
          ✕
        </button>
        
        <h2 className="bottom-sheet-title" style={{ marginBottom: '8px' }}>
          {lang === 'ru' ? 'Оплата товара' : 'Checkout'}
        </h2>

        {/* Product Summary Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          background: 'var(--tg-secondary-bg)',
          borderRadius: '12px',
          border: '1px solid var(--tg-border)'
        }}>
          {product.cover_url ? (
            <img src={product.cover_url} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} alt="Product Cover" />
          ) : (
            <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              {product.product_type === 'VOUCHER' ? '🎟️' : product.product_type === 'BOOKING' ? '📅' : '💾'}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--tg-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {product.title}
            </p>
            <div style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--tg-hint)' }}>
              {product.product_type === 'BOOKING' && bookingDate && bookingTime ? (
                <span>🕒 {bookingDate} {bookingTime}</span>
              ) : (
                <span>{product.product_type === 'VOUCHER' ? (lang === 'ru' ? 'Билет / Ваучер' : 'Ticket / Voucher') : (lang === 'ru' ? 'Цифровой файл' : 'Digital file')}</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: 'var(--tg-text)' }}>
              ${product.price_fiat}
            </p>
            <p style={{ margin: '1px 0 0', fontSize: '9.5px', color: 'var(--tg-hint)' }}>
              {product.price_stars} ⭐ / ~{tonAmount} TON
            </p>
          </div>
        </div>

        {showInstructions ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="animate-fade-in">
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--tg-text)' }}>
              {lang === 'ru' ? '📖 Инструкция по оплате' : '📖 Payment Instructions'}
            </h3>
            
            <div style={{
              padding: '14px',
              background: 'var(--tg-secondary-bg)',
              borderRadius: '12px',
              border: '1px solid var(--tg-border)',
              fontSize: '13px',
              color: 'var(--tg-text)',
              lineHeight: '1.6',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {lang === 'ru' ? (
                <>
                  <p style={{ margin: 0 }}>Пожалуйста, ознакомьтесь с процессом оплаты:</p>
                  <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li><b>Вы выбираете метод оплаты</b> (банковская карта, Telegram Stars или криптовалюта).</li>
                    <li>Совершаете перевод по реквизитам и нажимаете кнопку <b>«Я оплатил»</b> после реальной оплаты.</li>
                    <li>Мы мгновенно <b>уведомляем владельца магазина</b> о вашем платеже.</li>
                    <li>Как только он подтверждает оплату, <b>Вы получаете товар/ваучер</b> прямо здесь.</li>
                  </ul>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--tg-hint)', borderTop: '1px solid var(--tg-border)', paddingTop: '10px', marginTop: '4px' }}>
                    ⚠️ Если вы не получили товар после оплаты, вы можете открыть диспут (спор).
                  </p>
                </>
              ) : (
                <>
                  <p style={{ margin: 0 }}>Please review the payment process:</p>
                  <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li><b>Choose your payment method</b> (bank card, Telegram Stars, or cryptocurrency).</li>
                    <li>Transfer the amount and click the <b>"I paid"</b> button after the actual payment.</li>
                    <li>We will immediately <b>notify the shop owner</b> about your payment.</li>
                    <li>As soon as they confirm the payment, <b>you will receive the product/voucher</b> directly.</li>
                  </ul>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--tg-hint)', borderTop: '1px solid var(--tg-border)', paddingTop: '10px', marginTop: '4px' }}>
                    ⚠️ If you have paid but did not receive the product, you can open a dispute.
                  </p>
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={() => setShowInstructions(false)}
                className="btn-primary"
                style={{
                  background: 'var(--tg-accent)',
                  height: '46px',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  cursor: 'pointer',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white'
                }}
              >
                {lang === 'ru' ? 'Я понял, готов оплатить' : 'I understand, ready to pay'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Payment Method Selector Grid */}
            {!checkoutMethod && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="animate-fade-in">
                <p className="section-header" style={{ margin: 0 }}>
                  {lang === 'ru'
                    ? (product.creator_id === 'demo-welcome-store' ? 'Выберите способ оплаты (доступны Stars в демо)' : 'Выберите способ оплаты')
                    : (product.creator_id === 'demo-welcome-store' ? 'Select payment method (Stars active in demo)' : 'Select payment method')}
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* 1. Card */}
                  {(() => {
                    const isDemoProduct = product.creator_id === 'demo-welcome-store';
                    const hasCards = !isDemoProduct && (p2pList.length > 0 || !!product.creator?.payment_details?.p2p);
                    return (
                      <button
                        onClick={() => {
                          if (hasCards) {
                            handleSelectPaymentMethod('card');
                          }
                        }}
                        className={`pay-btn ${hasCards ? '' : 'disabled'}`}
                        style={{
                          opacity: hasCards ? 1 : 0.45,
                          cursor: hasCards ? 'pointer' : 'not-allowed',
                          borderColor: 'var(--tg-border)',
                          background: 'var(--tg-secondary-bg)',
                          position: 'relative'
                        }}
                      >
                        <div className="pay-btn-icon" style={{ color: 'var(--tg-orange)' }}>💳</div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--tg-text)' }}>
                          {lang === 'ru' ? 'Банковская карта' : 'Bank Card'}
                        </span>
                        {!hasCards && (
                          <span style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '8px', background: 'rgba(255,255,255,0.08)', padding: '2px 4px', borderRadius: '4px', color: 'var(--tg-hint)' }}>
                            {lang === 'ru' ? 'Выкл.' : 'Inactive'}
                          </span>
                        )}
                      </button>
                    );
                  })()}

                  {/* 2. Telegram Stars */}
                  <button
                    onClick={() => setCheckoutMethod('stars')}
                    className="pay-btn"
                    style={{
                      borderColor: 'var(--tg-border)',
                      background: 'var(--tg-secondary-bg)'
                    }}
                  >
                    <div className="pay-btn-icon" style={{ color: 'var(--tg-accent)' }}>⭐️</div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--tg-text)' }}>
                      Telegram Stars
                    </span>
                  </button>

                  {/* 3. Crypto */}
                  {(() => {
                    const isDemoProduct = product.creator_id === 'demo-welcome-store';
                    const hasCrypto = !isDemoProduct && !!(product.creator?.payment_details?.ton || product.creator?.payment_details?.usdt_trc20 || product.creator?.payment_details?.usdt_bep20);
                    return (
                      <button
                        onClick={() => {
                          if (hasCrypto) {
                            handleSelectPaymentMethod('crypto');
                          }
                        }}
                        className={`pay-btn ${hasCrypto ? '' : 'disabled'}`}
                        style={{
                          opacity: hasCrypto ? 1 : 0.45,
                          cursor: hasCrypto ? 'pointer' : 'not-allowed',
                          borderColor: 'var(--tg-border)',
                          background: 'var(--tg-secondary-bg)',
                          position: 'relative'
                        }}
                      >
                        <div className="pay-btn-icon" style={{ color: 'var(--tg-green)' }}>💎</div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--tg-text)' }}>
                          {lang === 'ru' ? 'Криптовалюта' : 'Cryptocurrency'}
                        </span>
                        {!hasCrypto && (
                          <span style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '8px', background: 'rgba(255,255,255,0.08)', padding: '2px 4px', borderRadius: '4px', color: 'var(--tg-hint)' }}>
                            {lang === 'ru' ? 'Выкл.' : 'Inactive'}
                          </span>
                        )}
                      </button>
                    );
                  })()}

                  {/* 4. Other Options */}
                  {(() => {
                    const isDemoProduct = product.creator_id === 'demo-welcome-store';
                    const hasOther = !isDemoProduct && !!(product.creator?.payment_details?.other || product.creator?.username);
                    return (
                      <button
                        onClick={() => {
                          if (hasOther) {
                            setCheckoutMethod('other');
                          }
                        }}
                        className={`pay-btn ${hasOther ? '' : 'disabled'}`}
                        style={{
                          opacity: hasOther ? 1 : 0.45,
                          cursor: hasOther ? 'pointer' : 'not-allowed',
                          borderColor: 'var(--tg-border)',
                          background: 'var(--tg-secondary-bg)',
                          position: 'relative'
                        }}
                      >
                        <div className="pay-btn-icon" style={{ color: 'var(--tg-link)' }}>💬</div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--tg-text)' }}>
                          {lang === 'ru' ? 'Другие способы' : 'Other options'}
                        </span>
                        {!hasOther && (
                          <span style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '8px', background: 'rgba(255,255,255,0.08)', padding: '2px 4px', borderRadius: '4px', color: 'var(--tg-hint)' }}>
                            {lang === 'ru' ? 'Выкл.' : 'Inactive'}
                          </span>
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Detailed Sub-Panels */}
            {checkoutMethod && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="animate-fade-in">
                {/* Back to method selection */}
                {!verifying && !verifySuccess && (
                  <button
                    onClick={() => {
                      setCheckoutMethod(null);
                      setVerifyError(null);
                    }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--tg-link)',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px', padding: 0, alignSelf: 'flex-start'
                    }}
                  >
                    ← {lang === 'ru' ? 'Другие способы оплаты' : 'Other payment methods'}
                  </button>
                )}

                {/* ── CARD PANEL ── */}
                {checkoutMethod === 'card' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>💳</span>
                      <span style={{ fontWeight: 800, fontSize: '15.5px' }}>{lang === 'ru' ? 'Оплата картой (P2P)' : 'Card Transfer (P2P)'}</span>
                    </div>

                    {/* Multi-card selector if more than 1 card */}
                    {p2pList.length > 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <p style={{ fontSize: '11px', color: 'var(--tg-hint)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
                          {lang === 'ru' ? 'Выберите карту банка:' : 'Select bank card:'}
                        </p>
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                          {p2pList.map((item: any, idx: number) => (
                            <button
                              key={item.id}
                              onClick={() => setCheckoutP2pIdx(idx)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                borderRadius: '20px',
                                border: checkoutP2pIdx === idx ? '1.5px solid var(--tg-orange)' : '1px solid var(--tg-border)',
                                background: checkoutP2pIdx === idx ? 'rgba(244,128,32,0.1)' : 'transparent',
                                color: 'var(--tg-text)',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer'
                              }}
                            >
                              {item.label || `Card #${idx+1}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Display Card details */}
                    {(() => {
                      const cardObj = p2pList.length > 0 && checkoutP2pIdx < p2pList.length ? p2pList[checkoutP2pIdx] : null;
                      const cardNum = cardObj ? cardObj.card : (product.creator?.payment_details?.p2p || '');
                      const cardBank = cardObj ? cardObj.label : (lang === 'ru' ? 'Основная карта' : 'Primary Card');
                      const cardQr = cardObj ? cardObj.qr : null;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ background: 'var(--tg-secondary-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--tg-border)' }}>
                            <p style={{ fontSize: '11px', color: 'var(--tg-hint)', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 6px 0' }}>
                              {lang === 'ru' ? `Карта получателя (${cardBank}):` : `Receiver Card (${cardBank}):`}
                            </p>
                            <div className="copy-block" style={{ background: 'var(--tg-bg)' }}>
                              <span className="copy-value" style={{ fontSize: '13px', fontWeight: 700 }}>{cardNum}</span>
                              <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={() => copy(cardNum)}>
                                {copied ? '✓' : (lang === 'ru' ? 'Коп.' : 'Copy')}
                              </button>
                            </div>
                          </div>

                          {/* QR Code SBP display if available */}
                          {cardQr && (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '8px',
                              background: 'var(--tg-surface)',
                              padding: '16px',
                              borderRadius: '16px',
                              border: '1px dashed var(--tg-border)',
                              textAlign: 'center'
                            }}>
                              <p style={{ fontSize: '11.5px', color: 'var(--tg-hint)', margin: 0 }}>
                                {lang === 'ru' ? 'Сканируйте QR-код в приложении банка:' : 'Scan QR code in your banking app:'}
                              </p>
                              <div 
                                onClick={() => setIsLightboxOpen(true)}
                                style={{
                                  padding: '10px',
                                  background: '#fff',
                                  borderRadius: '12px',
                                  display: 'inline-block',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  cursor: 'zoom-in',
                                  transition: 'transform 0.2s',
                                  userSelect: 'none'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              >
                                <img src={cardQr} style={{ width: '160px', height: '160px', objectFit: 'contain', display: 'block' }} alt="SBP QR code" />
                              </div>
                              <p 
                                onClick={() => setIsLightboxOpen(true)}
                                style={{ fontSize: '10px', color: 'var(--tg-link)', margin: '4px 0 0 0', cursor: 'pointer', fontWeight: 600 }}
                              >
                                🔍 {lang === 'ru' ? 'Открыть во весь экран' : 'View Fullscreen'}
                              </p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = cardQr;
                                    link.download = `qr_${cardBank || 'card'}.png`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                  style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid var(--tg-border)',
                                    color: 'var(--tg-link)',
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    padding: '5px 12px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    alignSelf: 'center'
                                  }}
                                >
                                  💾 {lang === 'ru' ? 'Скачать QR-код' : 'Download QR'}
                                </button>
                                <span style={{ fontSize: '9.5px', color: 'var(--tg-hint)', opacity: 0.7 }}>
                                  {lang === 'ru' ? '💡 Также можно нажать и удерживать для сохранения' : '💡 Or press and hold image to save'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Transfer amount display */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 14px', background: 'var(--tg-surface)', borderRadius: '12px',
                      border: '1px solid var(--tg-border)'
                    }}>
                      <span style={{ fontSize: '13px', color: 'var(--tg-hint)' }}>{lang === 'ru' ? 'Сумма к переводу:' : 'Amount to transfer:'}</span>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--tg-text)' }}>
                        ${product.price_fiat}
                      </span>
                    </div>

                    {/* Unified Instructions */}
                    <div style={{
                      padding: '12px',
                      background: 'rgba(244,128,32,0.06)',
                      borderRadius: '10px',
                      border: '1px solid rgba(244,128,32,0.15)',
                      fontSize: '12px',
                      color: 'var(--tg-hint)',
                      lineHeight: 1.5
                    }}>
                      📝 <b>{lang === 'ru' ? 'Инструкция:' : 'Instructions:'}</b> {lang === 'ru' 
                        ? 'Сделайте перевод на указанные реквизиты, сделайте скриншот чека, загрузите его ниже и нажмите проверку. ИИ автоматически проверит чек и выдаст товар.'
                        : 'Transfer the amount to the details above, take a screenshot of the receipt, upload it below, and click verify. AI will automatically verify and deliver your product.'}
                    </div>

                    {/* Upload and Verify Receipt Component */}
                    {renderReceiptUploadZone()}
                  </div>
                )}

                {/* ── STARS PANEL ── */}
                {checkoutMethod === 'stars' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>⭐️</span>
                      <span style={{ fontWeight: 800, fontSize: '15.5px' }}>Telegram Stars</span>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--tg-hint)', lineHeight: 1.5, margin: 0 }}>
                      {lang === 'ru'
                        ? 'Моментальная оплата через официальный счет Telegram. Товар будет доставлен сразу.'
                        : 'Pay instantly via official Telegram Stars invoice. The product will be delivered immediately.'}
                    </p>

                    <button 
                      className="btn-primary" 
                      onClick={() => {
                        handleStarsPayment();
                      }} 
                      disabled={hasBookingConflict || isProcessingPayment}
                      style={{ 
                        background: hasBookingConflict || isProcessingPayment ? 'var(--tg-hint)' : 'var(--tg-accent)', 
                        height: '48px', 
                        fontSize: '14.5px',
                        cursor: hasBookingConflict || isProcessingPayment ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isProcessingPayment ? (
                        <span>{lang === 'ru' ? 'Запуск оплаты...' : 'Launching payment...'}</span>
                      ) : (
                        <span>{lang === 'ru' ? `Оплатить ${product.price_stars} ⭐` : `Pay ${product.price_stars} ⭐`}</span>
                      )}
                    </button>

                    {/* Stars top-up instructions */}
                    <div style={{ borderTop: '1px solid var(--tg-border)', paddingTop: '12px', marginTop: '4px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--tg-hint)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', textAlign: 'center' }}>
                        {lang === 'ru' ? 'Как купить Telegram Stars?' : 'How to buy Telegram Stars?'}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                        <button 
                          type="button"
                          onClick={() => handleOpenLink('https://fragment.com/stars')}
                          style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'var(--tg-secondary-bg)', border: '1px solid var(--tg-border)', color: 'var(--tg-link)', fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <span>💎 Fragment.com/stars</span>
                          <span style={{ fontSize: '10px', color: 'var(--tg-hint)', fontWeight: 500 }}>{lang === 'ru' ? 'Дешевле через TON' : 'Cheaper via TON'}</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleOpenLink('tg://settings')}
                          style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'var(--tg-secondary-bg)', border: '1px solid var(--tg-border)', color: 'var(--tg-link)', fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <span>📱 Настройки Telegram</span>
                          <span style={{ fontSize: '10px', color: 'var(--tg-hint)', fontWeight: 500 }}>{lang === 'ru' ? 'Картой на мобильном' : 'Card in-app topup'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── CRYPTO PANEL ── */}
                {checkoutMethod === 'crypto' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>💎</span>
                      <span style={{ fontWeight: 800, fontSize: '15.5px' }}>{lang === 'ru' ? 'Оплата криптовалютой' : 'Crypto Transfer'}</span>
                    </div>

                    {/* Sub-method tabs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      {/* TON tab */}
                      {product.creator?.payment_details?.ton && (
                        <button
                          type="button"
                          onClick={() => setCryptoSubMethod('ton')}
                          style={{
                            padding: '8px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: cryptoSubMethod === 'ton' ? '2px solid var(--tg-green)' : '1px solid var(--tg-border)',
                            background: cryptoSubMethod === 'ton' ? 'rgba(77,202,90,0.08)' : 'transparent',
                            color: 'var(--tg-text)',
                            cursor: 'pointer'
                          }}
                        >
                          TON
                        </button>
                      )}
                      {/* USDT TRC20 tab */}
                      {product.creator?.payment_details?.usdt_trc20 && (
                        <button
                          type="button"
                          onClick={() => setCryptoSubMethod('usdt_trc20')}
                          style={{
                            padding: '8px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: cryptoSubMethod === 'usdt_trc20' ? '2px solid var(--tg-green)' : '1px solid var(--tg-border)',
                            background: cryptoSubMethod === 'usdt_trc20' ? 'rgba(77,202,90,0.08)' : 'transparent',
                            color: 'var(--tg-text)',
                            cursor: 'pointer'
                          }}
                        >
                          USDT TRC20
                        </button>
                      )}
                      {/* USDT BEP20 tab */}
                      {product.creator?.payment_details?.usdt_bep20 && (
                        <button
                          type="button"
                          onClick={() => setCryptoSubMethod('usdt_bep20')}
                          style={{
                            padding: '8px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: cryptoSubMethod === 'usdt_bep20' ? '2px solid var(--tg-green)' : '1px solid var(--tg-border)',
                            background: cryptoSubMethod === 'usdt_bep20' ? 'rgba(77,202,90,0.08)' : 'transparent',
                            color: 'var(--tg-text)',
                            cursor: 'pointer'
                          }}
                        >
                          USDT BEP20
                        </button>
                      )}
                    </div>

                    {/* Render active sub-method details */}
                    {cryptoSubMethod === 'ton' && product.creator?.payment_details?.ton && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} className="animate-fade-in">
                        <div style={{ background: 'var(--tg-secondary-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--tg-border)' }}>
                          <p style={{ fontSize: '11px', color: 'var(--tg-hint)', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 6px 0' }}>
                            TON {lang === 'ru' ? 'Адрес кошелька:' : 'Wallet Address:'}
                          </p>
                          <div className="copy-block" style={{ background: 'var(--tg-bg)' }}>
                            <span className="copy-value" style={{ fontSize: '11px' }}>{tonDetails || ''}</span>
                            <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={() => copy(tonDetails)}>
                              {copied ? '✓' : (lang === 'ru' ? 'Коп.' : 'Copy')}
                            </button>
                          </div>
                        </div>

                        {activeOrderId && (
                          <div style={{ background: 'var(--tg-secondary-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--tg-border)' }}>
                            <p style={{ fontSize: '11px', color: 'var(--tg-hint)', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 6px 0' }}>
                              {lang === 'ru' ? 'Комментарий к переводу (Обязательно):' : 'Payment Comment / Memo (Required):'}
                            </p>
                            <div className="copy-block" style={{ background: 'var(--tg-bg)' }}>
                              <span className="copy-value" style={{ fontSize: '11px', fontFamily: 'monospace' }}>{activeOrderId}</span>
                              <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={() => copy(activeOrderId)}>
                                {copied ? '✓' : (lang === 'ru' ? 'Коп.' : 'Copy')}
                              </button>
                            </div>
                            <p style={{ fontSize: '10px', color: 'var(--tg-red)', margin: '6px 0 0 0', fontWeight: 600 }}>
                              ⚠️ {lang === 'ru' 
                                ? 'Вставьте этот комментарий при переводе в кошельке, иначе платеж не зачислится автоматически!' 
                                : 'You MUST paste this comment when sending in your wallet, or the payment won\'t credit automatically!'}
                            </p>
                          </div>
                        )}

                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 14px', background: 'var(--tg-surface)', borderRadius: '12px',
                          border: '1px solid var(--tg-border)'
                        }}>
                          <span style={{ fontSize: '13px', color: 'var(--tg-hint)' }}>{lang === 'ru' ? 'Сумма к переводу:' : 'Amount to transfer:'}</span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--tg-text)' }}>
                            {tonAmount} TON
                          </span>
                        </div>

                        <a
                          href={`ton://transfer/${tonDetails}?amount=${Math.round(Number(tonAmount) * 1e9)}`}
                          className="btn-primary"
                          style={{ background: 'var(--tg-green)', textDecoration: 'none', height: '42px', fontSize: '13.5px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          🚀 {lang === 'ru' ? 'Открыть в TON-кошельке' : 'Open in TON Wallet'}
                        </a>
                      </div>
                    )}

                    {cryptoSubMethod === 'usdt_trc20' && product.creator?.payment_details?.usdt_trc20 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} className="animate-fade-in">
                        <div style={{ background: 'var(--tg-secondary-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--tg-border)' }}>
                          <p style={{ fontSize: '11px', color: 'var(--tg-hint)', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 6px 0' }}>
                            USDT TRC20 (Tron) {lang === 'ru' ? 'Адрес:' : 'Address:'}
                          </p>
                          <div className="copy-block" style={{ background: 'var(--tg-bg)' }}>
                            <span className="copy-value" style={{ fontSize: '11.5px' }}>{product.creator?.payment_details?.usdt_trc20 || ''}</span>
                            <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={() => copy(product.creator?.payment_details?.usdt_trc20 || '')}>
                              {copied ? '✓' : (lang === 'ru' ? 'Коп.' : 'Copy')}
                            </button>
                          </div>
                        </div>

                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 14px', background: 'var(--tg-surface)', borderRadius: '12px',
                          border: '1px solid var(--tg-border)'
                        }}>
                          <span style={{ fontSize: '13px', color: 'var(--tg-hint)' }}>{lang === 'ru' ? 'Сумма к переводу:' : 'Amount to transfer:'}</span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--tg-text)' }}>
                            {product.price_fiat} USDT
                          </span>
                        </div>
                      </div>
                    )}

                    {cryptoSubMethod === 'usdt_bep20' && product.creator?.payment_details?.usdt_bep20 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} className="animate-fade-in">
                        <div style={{ background: 'var(--tg-secondary-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--tg-border)' }}>
                          <p style={{ fontSize: '11px', color: 'var(--tg-hint)', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 6px 0' }}>
                            USDT BEP20 (BSC) {lang === 'ru' ? 'Адрес:' : 'Address:'}
                          </p>
                          <div className="copy-block" style={{ background: 'var(--tg-bg)' }}>
                            <span className="copy-value" style={{ fontSize: '11.5px' }}>{product.creator?.payment_details?.usdt_bep20 || ''}</span>
                            <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={() => copy(product.creator?.payment_details?.usdt_bep20 || '')}>
                              {copied ? '✓' : (lang === 'ru' ? 'Коп.' : 'Copy')}
                            </button>
                          </div>
                        </div>

                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 14px', background: 'var(--tg-surface)', borderRadius: '12px',
                          border: '1px solid var(--tg-border)'
                        }}>
                          <span style={{ fontSize: '13px', color: 'var(--tg-hint)' }}>{lang === 'ru' ? 'Сумма к переводу:' : 'Amount to transfer:'}</span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--tg-text)' }}>
                            {product.price_fiat} USDT
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Unified Instructions */}
                    <div style={{
                      padding: '12px',
                      background: 'rgba(77,202,90,0.06)',
                      borderRadius: '10px',
                      border: '1px solid rgba(77,202,90,0.15)',
                      fontSize: '12px',
                      color: 'var(--tg-hint)',
                      lineHeight: 1.5
                    }}>
                      📝 <b>{lang === 'ru' ? 'Инструкция:' : 'Instructions:'}</b> {lang === 'ru' 
                        ? 'Сделайте перевод на указанные реквизиты, сделайте скриншот транзакции/чека, загрузите его ниже и нажмите проверку. ИИ автоматически проверит перевод и выдаст товар.'
                        : 'Transfer the amount to the details above, take a screenshot of the transaction, upload it below, and click verify. AI will automatically verify and deliver your product.'}
                    </div>

                    {/* Upload and Verify Receipt Component */}
                    {renderReceiptUploadZone()}
                  </div>
                )}

                {/* ── OTHER PANEL ── */}
                {checkoutMethod === 'other' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>💬</span>
                      <span style={{ fontWeight: 800, fontSize: '15.5px' }}>{lang === 'ru' ? 'Другие способы оплаты' : 'Other Payment Options'}</span>
                    </div>

                    {product.creator?.payment_details?.other ? (
                      <div style={{
                        padding: '14px',
                        background: 'var(--tg-secondary-bg)',
                        border: '1px solid var(--tg-border)',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        lineHeight: 1.5,
                        color: 'var(--tg-text)',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {product.creator?.payment_details?.other}
                      </div>
                    ) : (
                      <p style={{ fontSize: '13px', color: 'var(--tg-hint)', margin: 0 }}>
                        {lang === 'ru'
                          ? 'Вы можете связаться с автором напрямую для уточнения альтернативных вариантов оплаты.'
                          : 'You can contact the creator directly to discuss alternate checkout options.'}
                      </p>
                    )}

                    <button
                      onClick={handleBuyDirect}
                      className="btn-primary"
                      style={{ background: 'var(--tg-accent)', height: '48px', fontSize: '14.5px', marginTop: '6px' }}
                    >
                      💬 {lang === 'ru' ? 'Написать автору' : 'Contact Creator'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>

    {isLightboxOpen && (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.92)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={() => setIsLightboxOpen(false)}
      >
        {/* Close button */}
        <button
          type="button"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.15)',
            border: 'none',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            color: '#fff',
            fontSize: '20px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
          onClick={() => setIsLightboxOpen(false)}
        >
          ✕
        </button>

        {/* Instruction banner */}
        <div style={{
          color: '#fff',
          textAlign: 'center',
          marginBottom: '20px',
          maxWidth: '320px',
          fontSize: '13.5px',
          fontWeight: 600,
          lineHeight: 1.4
        }}>
          {lang === 'ru' 
            ? '📸 Сделайте скриншот QR-кода, чтобы оплатить в приложении банка' 
            : '📸 Take a screenshot of the QR code to pay in your banking app'}
          <div style={{ fontSize: '11px', color: '#b3b3b3', marginTop: '6px', fontWeight: 400 }}>
            {lang === 'ru' 
              ? 'Или зажмите изображение пальцем для сохранения в галерею' 
              : 'Or press and hold the image to save it to your gallery'}
          </div>
        </div>

        {/* QR Code Frame */}
        {(() => {
          const cardObj = p2pList.length > 0 && checkoutP2pIdx < p2pList.length ? p2pList[checkoutP2pIdx] : null;
          const cardQrImg = cardObj ? cardObj.qr : null;
          const cardBankName = cardObj ? cardObj.label : (lang === 'ru' ? 'Основная карта' : 'Primary Card');
          
          return (
            <>
              <div 
                style={{
                  padding: '16px',
                  backgroundColor: '#fff',
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  maxWidth: '85vw',
                  maxHeight: '60vh'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <img 
                  src={cardQrImg || ''} 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '100%', 
                    objectFit: 'contain',
                    userSelect: 'auto',
                    WebkitUserSelect: 'auto',
                    display: 'block'
                  }} 
                  alt="SBP QR code Fullscreen" 
                />
              </div>

              {/* Download button in Lightbox */}
              <div style={{ marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const link = document.createElement('a');
                    link.href = cardQrImg || '';
                    link.download = `qr_${cardBankName || 'card'}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #0088CC 0%, #00A6FF 100%)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    padding: '10px 24px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,136,204,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  💾 {lang === 'ru' ? 'Скачать в галерею' : 'Save to Gallery'}
                </button>
              </div>
            </>
          );
        })()}
      </div>
    )}
    </>
  );
}
