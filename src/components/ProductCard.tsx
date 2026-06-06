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
}: ProductCardProps) {
  const styleIdx = idx % coverStyles.length;
  const cover = coverStyles[styleIdx];
  const isStarred = starredIds.includes(product.id);

  const typeBadge =
    product.product_type === 'VOUCHER'
      ? (lang === 'ru' ? '🎟 Билет' : '🎟 Ticket')
      : product.product_type === 'BOOKING'
      ? (lang === 'ru' ? '📅 Запись' : '📅 Booking')
      : null;

  return (
    <div
      className="large-product-card animate-fade-up"
      onClick={() => onSelect(product.id)}
    >
      {/* Cover image / gradient */}
      <div
        className="large-product-cover"
        style={
          product.cover_url
            ? {
                backgroundImage: `url("${product.cover_url}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }
            : { background: cover.bg }
        }
      >
        {!product.cover_url && (
          <div className="large-product-icon">{cover.icon}</div>
        )}

        {/* Product type badge – top left */}
        {typeBadge && (
          <span className="product-type-badge">{typeBadge}</span>
        )}

        {/* Owner controls – top right, stopPropagation prevents card navigation */}
        {isOwner && (
          <div className="product-owner-actions">
            <button
              type="button"
              className="product-owner-btn"
              onClick={(e) => { e.stopPropagation(); onToggleStar(product.id, e); }}
              title={isStarred ? 'Unfeature' : 'Feature'}
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

      {/* Body */}
      <div className="large-product-body">
        <h4 className="large-product-title">{product.title}</h4>
        {product.description && (
          <p className="large-product-description">{product.description}</p>
        )}

        <div className="large-product-footer">
          <div className="large-product-price-box">
            <span className="large-product-price-fiat">${product.price_fiat}</span>
            <span className="large-product-price-stars">⭐ {product.price_stars}</span>
          </div>
        </div>

        {/* CTA button – stopPropagation so only this click fires, not double-call */}
        <button
          className="large-product-action-btn"
          onClick={(e) => { e.stopPropagation(); onSelect(product.id); }}
        >
          {t.viewStorefront}
        </button>
      </div>
    </div>
  );
}
