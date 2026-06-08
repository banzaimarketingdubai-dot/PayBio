'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Product } from '@/types/store';
import { showAlert } from '@/utils/telegram';

const BookingCalendar = dynamic(() => import('@/components/BookingCalendar'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />,
});

const ReviewsDashboard = dynamic(() => import('@/components/ReviewsDashboard'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 150, borderRadius: 14 }} />,
});

interface ProductDetailViewProps {
  lang: 'en' | 'ru';
  product: Product;
  t: any;
  isOwner: boolean;
  isStorePremium: boolean;
  tonAmount: string;
  bookingDate: string;
  setBookingDate: (date: string) => void;
  bookingTime: string;
  setBookingTime: (time: string) => void;
  busySlots: { start: string; end: string }[];
  dbBookings: any[];
  fetchBusySlotsForProduct: (prodId: string) => Promise<void>;
  buyerTgId: number;
  isProductReviewsOpen: boolean;
  setIsProductReviewsOpen: (open: boolean) => void;
  handleSelectProduct: (id: string | null) => void;
  setIsPaymentSheetOpen: (open: boolean) => void;
  setIsPremiumOpen: (open: boolean) => void;
}

const getDaysWord = (days: number, lang: 'ru' | 'en') => {
  if (lang === 'en') return days === 1 ? 'day' : 'days';
  const mod10 = days % 10;
  const mod100 = days % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
};

export default function ProductDetailView({
  lang,
  product,
  t,
  isOwner,
  isStorePremium,
  tonAmount,
  bookingDate,
  setBookingDate,
  bookingTime,
  setBookingTime,
  busySlots,
  dbBookings,
  fetchBusySlotsForProduct,
  buyerTgId,
  isProductReviewsOpen,
  setIsProductReviewsOpen,
  handleSelectProduct,
  setIsPaymentSheetOpen,
  setIsPremiumOpen
}: ProductDetailViewProps) {
  let slotsText = product.content_url || '';
  let maxQuantity: number | null = null;
  let hasLimit = false;

  if (product.product_type === 'BOOKING' || product.product_type === 'VOUCHER') {
    try {
      const parsed = JSON.parse(product.content_url);
      if (parsed) {
        if (product.product_type === 'BOOKING') {
          slotsText = parsed.slots || '';
        } else if (product.product_type === 'VOUCHER') {
          if (typeof parsed.max_quantity === 'number') {
            maxQuantity = parsed.max_quantity;
            hasLimit = true;
          }
        }
      }
    } catch (e) {
      // Ignore JSON parse errors for legacy data
    }
  }

  const isSoldOut = product.product_type === 'VOUCHER' && hasLimit && (product.sold_count || 0) >= (maxQuantity || 0);

  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--tg-bg)',
      display: 'flex', flexDirection: 'column',
    }} className="animate-fade-in">

      {isOwner && !isStorePremium && (
        <div style={{
          background: 'linear-gradient(135deg, #FF9966 0%, #FF5E62 100%)',
          color: '#fff',
          padding: '14px 16px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div>
            ⚠️ {lang === 'ru' 
              ? 'Срок действия вашей подписки PayBio из-за неоплаты истек. Покупатели больше не могут просматривать и покупать ваши товары.' 
              : 'Your PayBio subscription has expired. Buyers can no longer view or purchase your products.'}
          </div>
          <button 
            onClick={() => setIsPremiumOpen(true)}
            style={{
              background: '#fff',
              color: '#FF5E62',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 14px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}
          >
            👑 {lang === 'ru' ? 'Активировать Premium' : 'Activate Premium'}
          </button>
        </div>
      )}

      {isOwner && isStorePremium && product.creator?.premium_until && (() => {
        const daysLeft = Math.ceil((new Date(product.creator.premium_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 0 && daysLeft <= 7) {
          const daysWord = getDaysWord(daysLeft, lang);
          return (
            <div style={{
              background: 'linear-gradient(135deg, #2b8cf3 0%, #0056b3 100%)',
              color: '#fff',
              padding: '14px 16px',
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <div>
                ⚠️ {lang === 'ru' 
                  ? `Внимание! Осталось ${daysLeft} ${daysWord} пробного периода.` 
                  : `Attention! ${daysLeft} ${daysWord} of the trial period left.`}
              </div>
              <button 
                onClick={() => setIsPremiumOpen(true)}
                style={{
                  background: '#fff',
                  color: '#2b8cf3',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                👑 {lang === 'ru' ? 'Продлить Premium' : 'Extend Premium'}
              </button>
            </div>
          );
        }
        return null;
      })()}

      {/* Top sticky navigation bar for buyer page */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--tg-secondary-bg)',
        borderBottom: '1px solid var(--tg-border)',
        padding: 'calc(var(--tg-safe-area-inset-top, env(safe-area-inset-top, 50px)) + 12px) 16px 12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backdropFilter: 'blur(10px)'
      }}>
        <button 
          onClick={() => handleSelectProduct(null)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--tg-link)',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: 0
          }}
        >
          ← {lang === 'ru' ? 'Назад в каталог' : 'Back to Catalog'}
        </button>
        <span style={{ fontSize: '13px', color: 'var(--tg-hint)', fontWeight: 500 }}>
          PayBio
        </span>
      </div>

      {/* ── PRODUCT HERO ── */}
      <div style={{
        background: 'var(--tg-secondary-bg)',
        borderBottom: '1px solid var(--tg-border)',
        padding: '20px 16px 24px',
      }}>
        {/* Creator row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: '20px',
        }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'var(--tg-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '12px', color: '#fff',
          }}>
            {(product.creator?.username || 'PB').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--tg-hint)', fontWeight: 500 }}>
              {lang === 'ru' ? 'Магазин автора' : 'Storefront by'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--tg-text)' }}>
                @{product.creator?.username || 'creator'}
              </p>
              {isStorePremium && (
                <span style={{ fontSize: '12px' }} title="Premium Creator">👑</span>
              )}
            </div>
          </div>
          <span className="chip chip-blue" style={{ marginLeft: 'auto' }}>
            ✓ Verified
          </span>
        </div>

        {/* Category-Specific Storefront Product Layout */}
        {product.product_type === 'VOUCHER' ? (
          /* ── VOUCHER / TICKET CATEGORY LAYOUT (TICKET STUB) ── */
          <div style={{
            background: 'var(--tg-surface)',
            borderRadius: '16px',
            padding: product.cover_url ? '0 0 20px 0' : '24px 20px',
            textAlign: 'center',
            marginBottom: '20px',
            position: 'relative', overflow: 'hidden',
            border: '1px solid var(--tg-border)',
          }}>
            {/* Ticket Notches */}
            <div className="ticket-notch-left" />
            <div className="ticket-notch-right" />

            {product.cover_url && (
              <div style={{
                width: '100%',
                height: '180px',
                backgroundImage: `url("${product.cover_url}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                marginBottom: '16px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '60px',
                  background: 'linear-gradient(to top, var(--tg-surface), transparent)'
                }} />
              </div>
            )}
            
            <div style={{ padding: product.cover_url ? '0 20px' : '0' }}>
              {!product.cover_url && (
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.2)',
                  color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '26px', margin: '0 auto 16px',
                  boxShadow: '0 4px 12px rgba(248,113,113,0.1)'
                }}>
                  🎟️
                </div>
              )}
              
              <span className="chip" style={{ marginBottom: '14px', display: 'inline-flex', background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>
                {lang === 'ru' ? '🎟️ Билет / Ваучер' : '🎟️ Ticket / Voucher'}
              </span>
              
              <h1 style={{
                fontSize: '22px', fontWeight: 800,
                color: 'var(--tg-text)', lineHeight: 1.3,
                letterSpacing: '-0.3px',
              }}>
                {product.title}
              </h1>

              <div 
                onClick={() => setIsProductReviewsOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '8px',
                  padding: '5px 10px',
                  background: 'rgba(255, 215, 0, 0.08)',
                  border: '1px solid rgba(255, 215, 0, 0.2)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#ffd700',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >
                <span>⭐️</span>
                <span>{lang === 'ru' ? 'РЕЙТИНГ / ОТЗЫВЫ' : 'RATING / REVIEWS'}</span>
              </div>
              
              <p style={{
                marginTop: '12px', fontSize: '13px',
                color: 'var(--tg-hint)', lineHeight: 1.6,
              }}>
                {product.description}
              </p>

              {/* Stub perforation line */}
              <div style={{
                height: '1px', borderBottom: '2px dashed var(--tg-border)',
                margin: '20px 0 10px'
              }} />
              
              <div style={{
                fontSize: '11px', color: 'var(--tg-hint)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}>
                <span>🎟️</span>
                <span>
                  {lang === 'ru'
                    ? 'QR-код билета генерируется и верифицируется системой.'
                    : 'Ticket QR code is generated & verified securely.'}
                </span>
              </div>
            </div>
          </div>
        ) : product.product_type === 'BOOKING' ? (
          /* ── BOOKING CATEGORY LAYOUT (SERVICE / CONSULTATION) ── */
          <div style={{
            background: 'var(--tg-surface)',
            borderRadius: '16px',
            padding: product.cover_url ? '0 0 20px 0' : '24px 20px',
            textAlign: 'center',
            marginBottom: '20px',
            border: '1px solid var(--tg-border)',
            overflow: 'hidden'
          }}>
            {product.cover_url && (
              <div style={{
                width: '100%',
                height: '180px',
                backgroundImage: `url("${product.cover_url}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                marginBottom: '16px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '60px',
                  background: 'linear-gradient(to top, var(--tg-surface), transparent)'
                }} />
              </div>
            )}
            
            <div style={{ padding: product.cover_url ? '0 20px' : '0' }}>
              {!product.cover_url && (
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.2)',
                  color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '26px', margin: '0 auto 16px',
                  boxShadow: '0 4px 12px rgba(56,189,248,0.1)'
                }}>
                  📅
                </div>
              )}
              
              <span className="chip" style={{ marginBottom: '14px', display: 'inline-flex', background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
                {lang === 'ru' ? '📅 Запись на время' : '📅 Booking slot'}
              </span>
              
              <h1 style={{
                fontSize: '22px', fontWeight: 800,
                color: 'var(--tg-text)', lineHeight: 1.3,
                letterSpacing: '-0.3px',
              }}>
                {product.title}
              </h1>

              <div 
                onClick={() => setIsProductReviewsOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '8px',
                  padding: '5px 10px',
                  background: 'rgba(255, 215, 0, 0.08)',
                  border: '1px solid rgba(255, 215, 0, 0.2)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#ffd700',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >
                <span>⭐️</span>
                <span>{lang === 'ru' ? 'РЕЙТИНГ / ОТЗЫВЫ' : 'RATING / REVIEWS'}</span>
              </div>
              
              <p style={{
                marginTop: '12px', fontSize: '13px',
                color: 'var(--tg-hint)', lineHeight: 1.6,
              }}>
                {product.description}
              </p>
            </div>
          </div>
        ) : (
          /* ── DIGITAL PRODUCTS LAYOUT (EBOOK, FILE, ASSET) ── */
          <div style={{
            background: 'var(--tg-surface)',
            borderRadius: '16px',
            padding: product.cover_url ? '0 0 20px 0' : '24px 20px',
            textAlign: 'center',
            marginBottom: '20px',
            border: '1px solid var(--tg-border)',
            overflow: 'hidden'
          }}>
            {product.cover_url && (
              <div style={{
                width: '100%',
                height: '180px',
                backgroundImage: `url("${product.cover_url}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                marginBottom: '16px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '60px',
                  background: 'linear-gradient(to top, var(--tg-surface), transparent)'
                }} />
              </div>
            )}
            
            <div style={{ padding: product.cover_url ? '0 20px' : '0' }}>
              {!product.cover_url && (
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)',
                  color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '26px', margin: '0 auto 16px',
                  boxShadow: '0 4px 12px rgba(96,165,250,0.1)'
                }}>
                  💾
                </div>
              )}
              
              <span className="chip chip-blue" style={{ marginBottom: '14px', display: 'inline-flex' }}>
                {t.digitalProduct}
              </span>
              
              <h1 style={{
                fontSize: '22px', fontWeight: 800,
                color: 'var(--tg-text)', lineHeight: 1.3,
                letterSpacing: '-0.3px',
              }}>
                {product.title}
              </h1>
              
              <div 
                onClick={() => setIsProductReviewsOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '8px',
                  padding: '5px 10px',
                  background: 'rgba(255, 215, 0, 0.08)',
                  border: '1px solid rgba(255, 215, 0, 0.2)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#ffd700',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease'
                }}
                className="animate-scale-in"
              >
                <span>⭐️</span>
                <span>{lang === 'ru' ? 'РЕЙТИНГ / ОТЗЫВЫ' : 'RATING / REVIEWS'}</span>
              </div>
              
              <p style={{
                marginTop: '10px', fontSize: '13px',
                color: 'var(--tg-hint)', lineHeight: 1.6,
              }}>
                {product.description}
              </p>

              <div style={{
                marginTop: '16px', padding: '10px 12px',
                background: 'rgba(96,165,250,0.06)', borderRadius: '10px',
                border: '1.5px dashed rgba(96,165,250,0.2)',
                fontSize: '11.5px', color: 'var(--tg-text)', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>⚡</span>
                <span>
                  {lang === 'ru' 
                    ? 'Мгновенная выдача! Ссылку или файл вы получите сразу же после завершения платежа.' 
                    : 'Instant access! File downloads or access links are provided right after checkout.'}
                </span>
              </div>
            </div>
          </div>
        )}

        {product.product_type === 'VOUCHER' && hasLimit && (
          <div style={{ margin: '0 0 16px 0', padding: '12px 16px', background: 'var(--tg-surface)', borderRadius: '14px', border: '1px solid var(--tg-border)', display: 'flex', flexDirection: 'column', gap: '8px' }} className="animate-fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
              <span style={{ color: 'var(--tg-hint)' }}>
                {lang === 'ru' ? 'Доступно билетов:' : 'Tickets available:'}
              </span>
              <span style={{ color: (product.sold_count || 0) >= (maxQuantity || 0) ? 'var(--tg-red)' : 'var(--tg-text)' }}>
                {Math.max(0, (maxQuantity || 0) - (product.sold_count || 0))} / {maxQuantity}
              </span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--tg-border)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, ((product.sold_count || 0) / (maxQuantity || 1)) * 100)}%`,
                height: '100%',
                background: (product.sold_count || 0) >= (maxQuantity || 0) 
                  ? 'var(--tg-red)' 
                  : (maxQuantity || 0) - (product.sold_count || 0) <= 5 
                  ? 'linear-gradient(90deg, #f48020, #e95c5c)' 
                  : 'var(--tg-accent)',
                borderRadius: '3px',
                transition: 'width 0.4s ease'
              }} />
            </div>
            {(maxQuantity || 0) - (product.sold_count || 0) <= 5 && (maxQuantity || 0) - (product.sold_count || 0) > 0 && (
              <p style={{ fontSize: '11px', color: '#e95c5c', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }} className="animate-pulse-soft">
                <span>🔥</span> {lang === 'ru' ? 'Почти все раскуплено! Спешите!' : 'Almost sold out! Hurry up!'}
              </p>
            )}
          </div>
        )}

        {product.product_type === 'BOOKING' && (
          <BookingCalendar
            slotsText={slotsText}
            busySlots={busySlots}
            bookings={dbBookings}
            bookingDate={bookingDate}
            setBookingDate={setBookingDate}
            bookingTime={bookingTime}
            setBookingTime={setBookingTime}
            lang={lang}
            isOwner={!!isOwner}
            productId={product.id}
            userTgId={buyerTgId}
            onRefreshBusySlots={() => fetchBusySlotsForProduct(product.id)}
          />
        )}

        {/* Price row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px',
          background: 'var(--tg-surface)',
          borderRadius: '14px',
          border: '1px solid var(--tg-border)'
        }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--tg-hint)', marginBottom: '3px' }}>{t.price}</p>
            <p style={{ fontSize: '26px', fontWeight: 800, color: 'var(--tg-text)', letterSpacing: '-0.5px' }}>
              ${product.price_fiat}
            </p>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span className="chip chip-blue">{product.price_stars} ⭐ {t.stars}</span>
            <span className="chip chip-hint">~{tonAmount} TON</span>
          </div>
        </div>
      </div>

      {/* ── PAYMENT SECTION ── */}
      <div style={{ flex: 1, padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {isSoldOut ? (
          <div style={{ textAlign: 'center', padding: '24px', background: 'var(--tg-surface)', borderRadius: '14px', border: '1px solid var(--tg-border)' }} className="animate-scale-in">
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎟️</div>
            <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--tg-text)', margin: 0 }}>
              {lang === 'ru' ? 'Все билеты распроданы!' : 'All tickets are sold out!'}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--tg-hint)', marginTop: '4px', marginBottom: 0 }}>
              {lang === 'ru' ? 'Следите за новыми предложениями автора.' : 'Stay tuned for new offers from the creator.'}
            </p>
          </div>
        ) : !isStorePremium ? (
          <div className="tg-card animate-fade-up" style={{ padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--tg-text)', margin: 0 }}>
              ⚠️ {lang === 'ru' ? 'Подписка истекла' : 'Subscription Expired'}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--tg-hint)', lineHeight: 1.6, margin: 0 }}>
              {lang === 'ru' 
                ? 'Для активации возможности оплаты этого товара покупателями, пожалуйста, продлите Premium подписку.'
                : 'To enable customers to pay for this product, please renew your Premium subscription.'}
            </p>
            <button className="btn-primary" onClick={() => setIsPremiumOpen(true)} style={{ background: 'var(--tg-accent)', color: '#fff', fontWeight: 700 }}>
              👑 {lang === 'ru' ? 'Активировать Premium' : 'Activate Premium'}
            </button>
          </div>
        ) : (
          <button 
            onClick={() => {
              if (product.product_type === 'BOOKING' && (!bookingDate || !bookingTime)) {
                showAlert(lang === 'ru' ? 'Пожалуйста, выберите дату и время записи.' : 'Please select date and time for the booking.');
                return;
              }
              setIsPaymentSheetOpen(true);
            }}
            className="btn-primary"
            style={{ 
              background: 'var(--tg-accent)', 
              fontSize: '16px', 
              fontWeight: 700, 
              height: '54px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px',
              borderRadius: '16px',
              boxShadow: '0 4px 15px rgba(43, 140, 243, 0.3)'
            }}
          >
            <span>💳</span>
            <span>{lang === 'ru' ? `Оплатить $${product.price_fiat}` : `Pay $${product.price_fiat}`}</span>
          </button>
        )}
      </div>

      {/* Back button */}
      <div style={{ padding: '0 16px 12px' }}>
        <button className="btn-secondary" onClick={() => handleSelectProduct(null)}>
          {t.backToCatalog}
        </button>
      </div>

      {/* Footer Branding (Hidden if Premium) */}
      {!isStorePremium && (
        <div style={{
          textAlign: 'center', padding: '12px 16px 24px',
          fontSize: '11px', color: 'var(--tg-hint)', opacity: 0.5,
        }}>
          {t.poweredBy}
        </div>
      )}

      {/* ─── BOTTOM SHEET: PRODUCT REVIEWS ─── */}
      <div className={`bottom-sheet-overlay ${isProductReviewsOpen ? 'active' : ''}`} onClick={() => setIsProductReviewsOpen(false)}>
        <div className="bottom-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85svh', overflowY: 'auto' }}>
          <div className="bottom-sheet-handle" />
          <button 
            type="button" 
            onClick={() => setIsProductReviewsOpen(false)}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--tg-text)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', zIndex: 10
            }}
          >
            ✕
          </button>
          <ReviewsDashboard 
            creatorId={product.creator_id} 
            productId={product.id} 
            buyerTgId={buyerTgId} 
            lang={lang} 
            t={t} 
            hasBought={!!product.has_bought} 
          />
        </div>
      </div>
    </div>
  );
}
