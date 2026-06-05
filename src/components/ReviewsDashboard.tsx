'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { showAlert } from '@/utils/telegram';

interface ReviewsDashboardProps {
  creatorId: string;
  productId?: string | null;
  buyerTgId: number;
  lang: 'en' | 'ru';
  t: any;
  hasBought?: boolean;
}

export default function ReviewsDashboard({ creatorId, productId = null, buyerTgId, lang, t, hasBought = false }: ReviewsDashboardProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const pIdQuery = productId ? `&product_id=${productId}` : '&product_id=null';
      const res = await fetch(`/api/reviews?creator_id=${creatorId}${pIdQuery}`);
      const data = await res.json();
      if (data.success) {
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [creatorId, productId]);

  useEffect(() => {
    fetchReviews();
    
    // Resolve default buyer name from Telegram WebApp
    let defaultName = lang === 'ru' ? 'Гость' : 'Guest';
    if (typeof window !== 'undefined') {
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser) {
        defaultName = `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || tgUser.username || defaultName;
      }
    }
    setBuyerName(defaultName);
  }, [fetchReviews, lang]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Number((sum / reviews.length).toFixed(1));
  }, [reviews]);

  const ratingCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // for 1, 2, 3, 4, 5 stars
    reviews.forEach((r) => {
      const idx = Math.min(4, Math.max(0, r.rating - 1));
      counts[idx]++;
    });
    return counts;
  }, [reviews]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const textClean = reviewText.trim();
    if (!textClean) return;
    if (textClean.length > 800) {
      showAlert(lang === 'ru' ? 'Отзыв не должен превышать 800 символов' : 'Review cannot exceed 800 characters');
      return;
    }
    if (!buyerName.trim()) {
      showAlert(lang === 'ru' ? 'Пожалуйста, введите ваше имя' : 'Please enter your name');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: creatorId,
          product_id: productId,
          buyer_tg_id: buyerTgId,
          buyer_name: buyerName.trim(),
          rating,
          text: textClean
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert(lang === 'ru' ? '✓ Отзыв успешно опубликован!' : '✓ Review posted successfully!');
        setReviewText('');
        fetchReviews();
      } else {
        showAlert(data.error || 'Failed to post review');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error posting review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showForm = !productId || hasBought;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0 30px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, textAlign: 'center' }}>
        {productId 
          ? (lang === 'ru' ? 'Отзывы о товаре' : 'Product Reviews')
          : (lang === 'ru' ? 'Отзывы о магазине' : 'Store Reviews')
        }
      </h2>

      {/* Rating Stats Summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '16px',
        background: 'var(--tg-secondary-bg)', padding: '16px', borderRadius: '12px',
        border: '1px solid var(--tg-border)', alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '32px', fontWeight: 900, color: 'var(--tg-text)', margin: 0 }}>
            {averageRating > 0 ? averageRating : '—'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', margin: '4px 0', fontSize: '16px', color: '#ffd700' }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s}>{s <= Math.round(averageRating) ? '★' : '☆'}</span>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--tg-hint)', margin: 0 }}>
            {reviews.length} {lang === 'ru' ? 'отзывов' : 'reviews'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = ratingCounts[stars - 1] || 0;
            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            return (
              <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                <span style={{ minWidth: '12px', textAlign: 'right', fontWeight: 700 }}>{stars}</span>
                <div style={{ flex: 1, height: '6px', background: 'var(--tg-border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#ffd700', borderRadius: '3px' }} />
                </div>
                <span style={{ minWidth: '20px', color: 'var(--tg-hint)' }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review input form */}
      {showForm ? (
        <form onSubmit={handleSubmitReview} style={{
          background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px',
          border: '1px dashed var(--tg-border)', display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>
            {lang === 'ru' ? 'Оставить отзыв' : 'Write a Review'}
          </h3>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--tg-hint)', fontWeight: 600 }}>
              {lang === 'ru' ? 'Ваша оценка:' : 'Your Rating:'}
            </span>
            <div style={{ display: 'flex', gap: '6px', fontSize: '22px', cursor: 'pointer' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span 
                  key={s} 
                  onClick={() => setRating(s)} 
                  style={{ color: s <= rating ? '#ffd700' : 'var(--tg-hint)', transition: 'color 0.2s' }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          <div className="bottom-sheet-form-group" style={{ marginBottom: 0 }}>
            <label className="bottom-sheet-label">{lang === 'ru' ? 'Ваше имя' : 'Your Name'}</label>
            <input 
              type="text" 
              className="tg-input" 
              placeholder={lang === 'ru' ? 'Введите имя' : 'Enter your name'}
              value={buyerName} 
              onChange={(e) => setBuyerName(e.target.value)} 
              required 
            />
          </div>

          <div className="bottom-sheet-form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label className="bottom-sheet-label">{lang === 'ru' ? 'Текст отзыва' : 'Review Text'}</label>
              <span style={{ fontSize: '10px', color: reviewText.length > 800 ? 'var(--tg-red)' : 'var(--tg-hint)' }}>
                {reviewText.length} / 800
              </span>
            </div>
            <textarea 
              className="tg-input" 
              placeholder={lang === 'ru' ? 'Поделитесь вашим мнением о покупке...' : 'Share your opinion...'}
              value={reviewText} 
              onChange={(e) => setReviewText(e.target.value)} 
              rows={4}
              maxLength={800}
              style={{ resize: 'none' }}
              required 
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isSubmitting || reviewText.length > 800}>
            {isSubmitting ? (lang === 'ru' ? 'Публикация...' : 'Posting...') : (lang === 'ru' ? 'Опубликовать отзыв ✓' : 'Post Review ✓')}
          </button>
        </form>
      ) : (
        productId && (
          <div style={{
            padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
            border: '1px dashed var(--tg-border)', textAlign: 'center', fontSize: '12.5px', color: 'var(--tg-hint)', lineHeight: '1.4'
          }}>
            🔒 {lang === 'ru' 
              ? 'Только покупатели этого товара могут оставлять отзывы.' 
              : 'Only buyers of this product can write reviews.'}
          </div>
        )
      )}

      {/* Reviews List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '10px 0 0' }}>
          {lang === 'ru' ? 'Все отзывы' : 'All Reviews'} ({reviews.length})
        </h3>

        {loading ? (
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--tg-hint)' }}>
            {lang === 'ru' ? 'Загрузка...' : 'Loading reviews...'}
          </p>
        ) : reviews.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--tg-hint)', fontStyle: 'italic', margin: '10px 0' }}>
            {lang === 'ru' ? 'Отзывов пока нет. Будьте первым!' : 'No reviews yet. Be the first to write one!'}
          </p>
        ) : (
          reviews.map((r) => {
            const initials = r.buyer_name ? r.buyer_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'B';
            const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
              day: 'numeric', month: 'short', year: 'numeric'
            }) : '';
            return (
              <div key={r.id} className="animate-fade-up" style={{
                background: 'var(--tg-secondary-bg)', padding: '12px', borderRadius: '12px',
                border: '1px solid var(--tg-border)', display: 'flex', gap: '12px'
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--tg-accent)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 800, flexShrink: 0
                }}>
                  {initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: 'var(--tg-text)' }}>{r.buyer_name}</h4>
                    <span style={{ fontSize: '10px', color: 'var(--tg-hint)' }}>{dateStr}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '2px', color: '#ffd700', fontSize: '12px', margin: '4px 0' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s}>{s <= r.rating ? '★' : '☆'}</span>
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--tg-text)', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                    {r.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
