'use client';

import React from 'react';
import { Product } from '@/types/store';

const coverStyles = [
  { bg: 'linear-gradient(135deg, #FF5E62 0%, #FF9966 100%)', icon: '📘' }, // Ebook
  { bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', icon: '⚡' }, // Tutorial
  { bg: 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)', icon: '🎨' }, // Assets
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

  return (
    <div 
      className="large-product-card animate-fade-up"
      style={{ width: '80vw', minWidth: '80vw', maxWidth: '80vw', scrollSnapAlign: 'start', flexShrink: 0, margin: 0, display: 'flex', flexDirection: 'column' }}
    >
      <div 
        className="large-product-cover" 
        style={product.cover_url ? { backgroundImage: `url("${product.cover_url}")`, height: '110px', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : { background: cover.bg, height: '110px' }}
      >
        {!product.cover_url && <div className="large-product-icon" style={{ fontSize: '24px' }}>{cover.icon}</div>}
        
        {isOwner && (
          <button
            type="button"
            onClick={(e) => onToggleStar(product.id, e)}
            style={{
              position: 'absolute', top: '8px', right: '8px',
              background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
              width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 5, fontSize: '13px'
            }}
          >
            {isStarred ? '⭐' : '☆'}
          </button>
        )}
      </div>
      
      <div className="large-product-body" style={{ padding: '10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '14.5px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--tg-text)' }}>{product.title}</h4>
          <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--tg-hint)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '34px', lineHeight: 1.6 }}>{product.description}</p>
        </div>

        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--tg-text)' }}>${product.price_fiat}</span>
            <span style={{ fontSize: '10.5px', color: 'var(--tg-hint)' }}>⭐️ {product.price_stars}</span>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="large-product-action-btn" style={{ fontSize: '11px', padding: '6px' }} onClick={() => onSelect(product.id)}>
              {t.viewStorefront}
            </button>
            {isOwner && (
              <>
                <button className="large-product-action-btn" style={{ background: 'rgba(255,165,0,0.12)', color: '#ffa500', width: '30px', padding: 0 }} onClick={(e) => { e.stopPropagation(); onGeneratePromo(product); }}>📢</button>
                <button className="large-product-action-btn" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--tg-text)', width: '30px', padding: 0 }} onClick={(e) => { e.stopPropagation(); onOpenEditProduct(product); }}>✏️</button>
                <button className="large-product-action-btn" style={{ background: 'rgba(233,92,92,0.12)', color: '#ff4d4d', width: '30px', padding: 0 }} onClick={(e) => { e.stopPropagation(); onConfirmDelete(product.id, product.title); }}>🗑️</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
