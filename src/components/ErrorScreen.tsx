'use client';

import React from 'react';

interface ErrorScreenProps {
  message: string;
  onBack: () => void;
  lang?: 'en' | 'ru';
}

export default function ErrorScreen({ message, onBack, lang = 'en' }: ErrorScreenProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100svh', padding: '24px',
      textAlign: 'center', gap: '12px',
    }} className="animate-fade-in">
      <div style={{
        width: '56px', height: '56px', borderRadius: '50%',
        background: 'rgba(233,92,92,0.12)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '24px',
      }}>⚠️</div>
      <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--tg-text)' }}>
        {lang === 'ru' ? 'Витрина недоступна' : 'Storefront Unavailable'}
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--tg-hint)', maxWidth: '280px', lineHeight: 1.6 }}>
        {message}
      </p>
      <button className="btn-secondary" style={{ maxWidth: '200px', marginTop: '8px' }} onClick={onBack}>
        ← {lang === 'ru' ? 'Назад' : 'Back'}
      </button>
    </div>
  );
}
