'use client';

import React from 'react';
import { Product } from '@/types/store';

const coverStyles = [
  { bg: 'linear-gradient(135deg, #FF5E62 0%, #FF9966 100%)', icon: '📘' },
  { bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', icon: '⚡' },
  { bg: 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)', icon: '🎨' },
];

interface ProductCardProps {
  product: Product;
  idx: number;
  isOwner: boolean;
  starredIds: string[];
  lang: 'en' | 'ru';
  t: any;
  onSelect: (id: string) => void;
  onToggleStar: (productId: string, e: React.MouseEvent) => void;
  onGeneratePromo: (p: any) => void;
  onOpenEditProduct: (p: any) => void;
  onConfirmDelete: (productId: string, productTitle: string) => void;
  variant?: 'standard' | 'featured';
}

export default function ProductCard({
  product,
  idx,
  isOwner,
  starredIds,
  lang,
  t,
  onSelect,
  onToggleStar,
  onGeneratePromo,
  onOpenEditProduct,
  onConfirmDelete,
  variant = 'standard',
}: ProductCardProps) {
  const styleIdx = idx % coverStyles.length;
  const cover = coverStyles[styleIdx];
  const isStarred = starredIds.includes(product.id);

  let ticketInfo: {
    event_date?: string;
    event_time?: string;
    location?: string;
    rubric?: string | string[];
  } | null = null;

  if (product.product_type === 'TICKET') {
    try {
      ticketInfo = JSON.parse(product.content_url);
    } catch (e) {}
  }

  const getRubricBadgeStyle = (rubricId: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      business: { bg: 'rgba(251, 191, 36, 0.12)', border: '#fbbf24', text: '#fbbf24' },
      development: { bg: 'rgba(59, 130, 246, 0.12)', border: '#3b82f6', text: '#60a5fa' },
      activities: { bg: 'rgba(249, 115, 22, 0.12)', border: '#f97316', text: '#fb923c' },
      networking: { bg: 'rgba(168, 85, 247, 0.12)', border: '#a855f7', text: '#c084fc' },
      relations: { bg: 'rgba(236, 72, 153, 0.12)', border: '#ec4899', text: '#f472b6' },
      other: { bg: 'rgba(6, 182, 212, 0.12)', border: '#06b6d4', text: '#22d3ee' }
    };
    return colors[rubricId.toLowerCase()] || { bg: 'rgba(255,255,255,0.06)', border: 'var(--tg-border)', text: 'var(--tg-hint)' };
  };

  const getRubricLabel = (rubricId: string) => {
    const labels: Record<string, { ru: string; en: string }> = {
      business: { ru: '💼 Бизнес', en: '💼 Business' },
      development: { ru: '🧠 Развитие', en: '🧠 Development' },
      activities: { ru: '💃 Активности', en: '💃 Activities' },
      networking: { ru: '🤝 Нетворкинг', en: '🤝 Networking' },
      relations: { ru: '❤️ Отношения', en: '❤️ Relations' },
      other: { ru: '✨ Другое', en: '✨ Other' }
    };
    const item = labels[rubricId.toLowerCase()];
    return item ? (lang === 'ru' ? item.ru : item.en) : rubricId;
  };

  const getRubricsBorder = (prod: Product) => {
    if (prod.product_type !== 'TICKET') return {};
    
    let rubricsList: string[] = [];
    try {
      const content = JSON.parse(prod.content_url);
      if (content && content.rubric) {
        rubricsList = Array.isArray(content.rubric) ? content.rubric : [content.rubric];
      }
    } catch (e) {}

    if (rubricsList.length === 0) return {};

    const rubricColors: Record<string, string> = {
      business: '#fbbf24',
      development: '#3b82f6',
      activities: '#f97316',
      networking: '#a855f7',
      relations: '#ec4899',
      other: '#06b6d4'
    };

    const colors = rubricsList
      .map(r => rubricColors[r.toLowerCase()])
      .filter(Boolean);

    if (colors.length === 0) return {};
    if (colors.length === 1) {
      return { border: `2px solid ${colors[0]}` };
    }

    return {
      border: '2px solid transparent',
      backgroundImage: `linear-gradient(var(--tg-bg, #18181b), var(--tg-bg, #18181b)), linear-gradient(135deg, ${colors.join(', ')})`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'padding-box, border-box'
    };
  };

  const typeBadge =
    product.product_type === 'VOUCHER'
      ? (lang === 'ru' ? '🎟 Ваучер' : '🎟 Voucher')
      : product.product_type === 'TICKET'
      ? (lang === 'ru' ? '🎫 Билет' : '🎫 Ticket')
      : product.product_type === 'BOOKING'
      ? (lang === 'ru' ? '📅 Запись' : '📅 Booking')
      : (lang === 'ru' ? '📁 Файл' : '📁 File');

  if (variant === 'featured') {
    // Featured vertical layout for top horizontal scrolling gallery
    return (
      <div
        className="featured-product-card animate-fade-up"
        onClick={() => onSelect(product.id)}
        style={getRubricsBorder(product)}
      >
        <div
          className="featured-product-cover"
          style={
            product.cover_url
              ? { backgroundImage: `url("${product.cover_url}")` }
              : { background: cover.bg }
          }
        >
          {!product.cover_url && (
            <div className="featured-product-icon">{cover.icon}</div>
          )}

          {typeBadge && (
            <span className="product-type-badge">{typeBadge}</span>
          )}

          {isOwner && (
            <div className="product-owner-actions" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="product-owner-btn"
                onClick={(e) => { e.stopPropagation(); onToggleStar(product.id, e); }}
                title={isStarred ? 'Unfeature' : 'Feature'}
                style={{ color: isStarred ? '#ffd700' : '#fff' }}
              >
                {isStarred ? '⭐' : '☆'}
              </button>
              <button
                type="button"
                className="product-owner-btn"
                onClick={(e) => { e.stopPropagation(); onGeneratePromo(product); }}
                title="Promo"
              >
                📢
              </button>
              <button
                type="button"
                className="product-owner-btn"
                onClick={(e) => { e.stopPropagation(); onOpenEditProduct(product); }}
                title="Edit"
              >
                ✏️
              </button>
              <button
                type="button"
                className="product-owner-btn"
                style={{ color: '#ff6b6b' }}
                onClick={(e) => { e.stopPropagation(); onConfirmDelete(product.id, product.title); }}
                title="Delete"
              >
                🗑️
              </button>
            </div>
          )}
        </div>

        <div className="featured-product-body">
          <h4 className="featured-product-title">{product.title}</h4>
          {ticketInfo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0 10px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {(Array.isArray(ticketInfo.rubric) ? ticketInfo.rubric : [ticketInfo.rubric || 'other']).map((rubricId) => {
                  const styleObj = getRubricBadgeStyle(rubricId);
                  return (
                    <span
                      key={rubricId}
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: styleObj.bg,
                        border: `1px solid ${styleObj.border}`,
                        color: styleObj.text,
                        textTransform: 'uppercase'
                      }}
                    >
                      {getRubricLabel(rubricId)}
                    </span>
                  );
                })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11.5px', color: 'var(--tg-hint)' }}>
                {ticketInfo.event_date && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📅 {new Date(ticketInfo.event_date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {ticketInfo.event_time && ` в ${ticketInfo.event_time}`}
                  </span>
                )}
                {ticketInfo.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    📍 {ticketInfo.location}
                  </span>
                )}
              </div>
            </div>
          )}
          <p className="featured-product-description">
            {product.description || (lang === 'ru' ? 'Описание отсутствует' : 'No description available')}
          </p>
          
          <div className="featured-product-footer">
            <div className="featured-product-price-box">
              <span className="featured-product-price-fiat">${product.price_fiat}</span>
              <span className="featured-product-price-stars">⭐ {product.price_stars}</span>
            </div>
            <button
              className="featured-product-action-btn"
              onClick={(e) => { e.stopPropagation(); onSelect(product.id); }}
            >
              {Number(product.price_fiat) === 0 ? (lang === 'ru' ? 'Резервировать' : 'Reserve') : product.product_type === 'BOOKING' ? (lang === 'ru' ? 'Запись' : 'Book') : (lang === 'ru' ? 'Купить' : 'Buy')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Standard horizontal list card layout (default)
  return (
    <div
      className="universal-product-card animate-fade-up"
      onClick={() => onSelect(product.id)}
      style={getRubricsBorder(product)}
    >
      {/* Left side: Cover image */}
      <div
        className="universal-product-cover"
        style={
          product.cover_url
            ? { backgroundImage: `url("${product.cover_url}")` }
            : { background: cover.bg }
        }
      >
        {!product.cover_url && (
          <div className="universal-product-icon">{cover.icon}</div>
        )}
      </div>

      {/* Right side: Information */}
      <div className="universal-product-info">
        <div className={isOwner ? 'universal-product-title-row-owner' : 'universal-product-title-row'}>
          <h4 className="universal-product-title">{product.title}</h4>
          {ticketInfo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0 10px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {(Array.isArray(ticketInfo.rubric) ? ticketInfo.rubric : [ticketInfo.rubric || 'other']).map((rubricId) => {
                  const styleObj = getRubricBadgeStyle(rubricId);
                  return (
                    <span
                      key={rubricId}
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: styleObj.bg,
                        border: `1px solid ${styleObj.border}`,
                        color: styleObj.text,
                        textTransform: 'uppercase'
                      }}
                    >
                      {getRubricLabel(rubricId)}
                    </span>
                  );
                })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11.5px', color: 'var(--tg-hint)' }}>
                {ticketInfo.event_date && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📅 {new Date(ticketInfo.event_date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {ticketInfo.event_time && ` в ${ticketInfo.event_time}`}
                  </span>
                )}
                {ticketInfo.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    📍 {ticketInfo.location}
                  </span>
                )}
              </div>
            </div>
          )}
          {product.description && (
            <p className="universal-product-description">{product.description}</p>
          )}
        </div>

        <div className="universal-product-footer">
          <div className="universal-product-price-box">
            <span className="universal-product-price-fiat">${product.price_fiat}</span>
            <span className="universal-product-price-stars">⭐ {product.price_stars}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {typeBadge && (
              <span className="universal-product-badge">{typeBadge}</span>
            )}
            <button
              className="universal-product-action-btn"
              onClick={(e) => { e.stopPropagation(); onSelect(product.id); }}
            >
              {Number(product.price_fiat) === 0 ? (lang === 'ru' ? 'Резервировать' : 'Reserve') : product.product_type === 'BOOKING' ? (lang === 'ru' ? 'Запись' : 'Book') : (lang === 'ru' ? 'Купить' : 'Buy')}
            </button>
          </div>
        </div>
      </div>

      {/* Owner controls: top-right absolute-positioned */}
      {isOwner && (
        <div className="universal-owner-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="universal-owner-btn"
            onClick={(e) => { e.stopPropagation(); onToggleStar(product.id, e); }}
            title={isStarred ? 'Unfeature' : 'Feature'}
            style={{ color: isStarred ? '#ffd700' : '#fff' }}
          >
            {isStarred ? '⭐' : '☆'}
          </button>
          <button
            type="button"
            className="universal-owner-btn"
            onClick={(e) => { e.stopPropagation(); onGeneratePromo(product); }}
            title="Promo"
          >
            📢
          </button>
          <button
            type="button"
            className="universal-owner-btn"
            onClick={(e) => { e.stopPropagation(); onOpenEditProduct(product); }}
            title="Edit"
          >
            ✏️
          </button>
          <button
            type="button"
            className="universal-owner-btn"
            style={{ color: '#ff6b6b' }}
            onClick={(e) => { e.stopPropagation(); onConfirmDelete(product.id, product.title); }}
            title="Delete"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}
