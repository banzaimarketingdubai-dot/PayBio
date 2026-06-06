'use client';

import React, { useState, useEffect } from 'react';

interface OnboardingScreenProps {
  lang: 'en' | 'ru';
  onComplete: () => void;
}

export default function OnboardingScreen({ lang, onComplete }: OnboardingScreenProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      icon: '💸',
      title: lang === 'ru' ? 'Продажи в соцсетях — это боль?' : 'Selling on social media is a pain?',
      desc: lang === 'ru' 
        ? 'Сложные сайты, ручные переводы и потерянные клиенты в личке. Пора это исправить!' 
        : 'Complex sites, manual transfers, and lost clients in direct messages. Time to fix it!',
    },
    {
      icon: '🤖',
      title: lang === 'ru' ? 'Магазин за 60 секунд с ИИ' : 'AI Store in 60 Seconds',
      desc: lang === 'ru' 
        ? 'Просто загрузите файл или ссылку. Наш искусственный интеллект сам создаст описание, карточку товара и настроит авто-оплату.' 
        : 'Just upload a file or a link. Our AI will automatically generate descriptions, product cards, and configure payments.',
    },
    {
      icon: '💳',
      title: lang === 'ru' ? 'Принимайте оплаты везде' : 'Accept Payments Everywhere',
      desc: lang === 'ru' 
        ? 'Telegram Stars, банковские карты или криптовалюта TON/USDT. Деньги поступают сразу на ваши реквизиты.' 
        : 'Telegram Stars, bank cards, or TON/USDT crypto. Funds go directly to your accounts.',
    },
    {
      icon: '📊',
      title: lang === 'ru' ? 'Перестаньте терять 37% клиентов' : 'Stop Losing 37% of Customers',
      desc: lang === 'ru'
        ? 'Каждый клик «Перейти на сайт» — это «долина смерти» для вашей прибыли. 37% пользователей отваливаются из-за долгой загрузки и лишних переходов.'
        : 'Every click to an external website is a dead end for profits. 37% of users drop off due to slow loading and extra steps.',
    },
    {
      icon: '🚀',
      title: lang === 'ru' ? 'Растите и масштабируйтесь' : 'Grow and Scale',
      desc: lang === 'ru' 
        ? 'Встроенная CRM-система, аналитика продаж и автоматическая выдача цифровых товаров клиентам.' 
        : 'Built-in CRM system, detailed sales analytics, and automated delivery of digital goods to customers.',
    }
  ];

  const handleNext = () => {
    if (activeSlide < slides.length - 1) {
      setActiveSlide(prev => prev + 1);
    } else {
      setActiveSlide(0);
    }
  };

  const handlePrev = () => {
    if (activeSlide > 0) {
      setActiveSlide(prev => prev - 1);
    } else {
      setActiveSlide(slides.length - 1);
    }
  };

  // Screen click navigation: left side goes back, right side goes forward
  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('.onboarding-cta-btn')) return;

    const width = window.innerWidth;
    const clickX = e.clientX;
    if (clickX < width * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  return (
    <div className="onboarding-container" onClick={handleScreenClick}>
      {/* Story Progress Indicators */}
      <div className="story-progress-bar">
        {slides.map((_, idx) => {
          let status: 'empty' | 'active' | 'completed' = 'empty';
          if (idx < activeSlide) status = 'completed';
          else if (idx === activeSlide) status = 'active';

          return (
            <div key={idx} className="story-progress-segment">
              <div 
                className={`story-progress-fill ${status}`}
                onAnimationEnd={idx === activeSlide ? handleNext : undefined}
              />
            </div>
          );
        })}
      </div>

      {/* Top Header/Logo */}
      <div className="onboarding-header">
        <div className="onboarding-logo">
          <span className="onboarding-logo-star">⭐</span>
          <span className="onboarding-logo-text">PayBio</span>
        </div>
      </div>

      {/* Active Slide Content */}
      <div className="onboarding-content-wrapper">
        {slides.map((slide, idx) => (
          <div 
            key={idx} 
            className={`onboarding-slide-card ${idx === activeSlide ? 'active' : ''}`}
          >
            {idx !== 3 ? (
              // Standard story cards
              <>
                <div className="onboarding-slide-icon-wrapper">
                  <span className="onboarding-slide-icon">{slide.icon}</span>
                </div>
                <h2 className="onboarding-slide-title">{slide.title}</h2>
                <p className="onboarding-slide-desc">{slide.desc}</p>
              </>
            ) : (
              // Custom Conversion slide (Slide 4) with funnel scheme
              <div className="onboarding-funnel-slide" style={{ width: '100%' }}>
                <h2 className="onboarding-slide-title" style={{ fontSize: '20px', marginBottom: '8px' }}>
                  {slide.title}
                </h2>
                <p className="onboarding-slide-desc" style={{ fontSize: '12px', lineHeight: 1.4, opacity: 0.85, marginBottom: '10px' }}>
                  {slide.desc}
                </p>
                <div style={{ fontWeight: 800, color: '#FFD700', fontSize: '13.5px', marginBottom: '14px', textShadow: '0 0 8px rgba(255,215,0,0.3)' }}>
                  {lang === 'ru' ? 'С PayBio вы продаете прямо в Telegram Stories!' : 'With PayBio you sell directly in Telegram Stories!'}
                </div>

                {/* Funnel Scheme */}
                <div className="funnel-container">
                  <div className="funnel-column funnel-left">
                    <div className="funnel-column-title">{lang === 'ru' ? 'Обычный сайт' : 'Regular Link'}</div>
                    <div className="funnel-step">{lang === 'ru' ? 'Реклама' : 'Ad'}</div>
                    <div className="funnel-arrow">↓</div>
                    <div className="funnel-step">{lang === 'ru' ? 'Внешний сайт' : 'External Web'}</div>
                    <div className="funnel-arrow">↓</div>
                    <div className="funnel-step loss">
                      {lang === 'ru' ? 'Потери 37% ❌' : 'Loss 37% ❌'}
                    </div>
                  </div>
                  <div className="funnel-column funnel-right">
                    <div className="funnel-column-title">PayBio</div>
                    <div className="funnel-step active">Stories</div>
                    <div className="funnel-arrow active">↓</div>
                    <div className="funnel-step active">{lang === 'ru' ? 'Телеграм-витрина' : 'Telegram Store'}</div>
                    <div className="funnel-arrow active">↓</div>
                    <div className="funnel-step active win">
                      {lang === 'ru' ? 'Профит 🎉' : 'Profit 🎉'}
                    </div>
                  </div>
                </div>

                <p className="onboarding-slide-desc" style={{ fontSize: '11px', marginTop: '12px', opacity: 0.75 }}>
                  {lang === 'ru' 
                    ? 'Клиент видит товар, кликает и оплачивает внутри мессенджера за секунды. Никаких переходов наружу.' 
                    : 'Client views, clicks, and pays inside Telegram in seconds. No redirection loss.'}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Sticky Action Panel */}
      <div className="onboarding-action-panel">
        <button 
          className="onboarding-cta-btn" 
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
        >
          {lang === 'ru' ? '🚀 Создать ИИ-магазин' : '🚀 Create AI Store'}
        </button>
      </div>
    </div>
  );
}
