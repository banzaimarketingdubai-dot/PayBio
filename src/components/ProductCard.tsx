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

  const typeBadge =
    product.product_type === 'VOUCHER'
      ? (lang === 'ru' ? '🎟 Билет' : '🎟 Ticket')
      : product.product_type === 'BOOKING'
      ? (lang === 'ru' ? '📅 Запись' : '📅 Booking')
      : (lang === 'ru' ? '📁 Файл' : '📁 File');

  if (variant === 'featured') {
    // Featured vertical layout for top horizontal scrolling gallery
    return (
      <div
        className="featured-product-card animate-fade-up"
        onClick={() => onSelect(product.id)}
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
