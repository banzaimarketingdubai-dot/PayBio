'use client';

import React from 'react';

interface LoadingScreenProps {
  lang?: 'en' | 'ru';
}

export default function LoadingScreen({ lang = 'en' }: LoadingScreenProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100svh',
      background: 'var(--tg-bg)', gap: '14px',
    }}>
      {/* Telegram-style spinner */}
      <div style={{
        width: '36px', height: '36px',
        border: '3px solid var(--tg-border)',
        borderTopColor: 'var(--tg-accent)',
        borderRadius: '50%',
      }} className="animate-spin-slow" />
      <p style={{ color: 'var(--tg-hint)', fontSize: '14px', fontWeight: 500 }}>
        {lang === 'ru' ? 'Загрузка…' : 'Loading…'}
      </p>
    </div>
  );
}
