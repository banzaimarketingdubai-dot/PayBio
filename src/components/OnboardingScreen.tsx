'use client';

import React, { useState, useRef } from 'react';

interface OnboardingScreenProps {
  lang: 'en' | 'ru';
  onComplete: () => void;
}

export default function OnboardingScreen({ lang, onComplete }: OnboardingScreenProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const slidesCount = 5;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.clientWidth || window.innerWidth;
    if (width > 0) {
      const activeIdx = Math.round(scrollLeft / width);
      if (activeIdx !== activeSlide && activeIdx >= 0 && activeIdx < slidesCount) {
        setActiveSlide(activeIdx);
      }
    }
  };

  const handleNext = () => {
    if (sliderRef.current) {
      const width = sliderRef.current.clientWidth || window.innerWidth;
      sliderRef.current.scrollTo({
        left: (activeSlide + 1) * width,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="onboarding-container">
      {/* Top Header / Logo + Skip */}
      <div className="onboarding-header-row">
        <div className="onboarding-logo-mini">
          <span className="onboarding-logo-star">⭐</span>
          <span className="onboarding-logo-text">PayBio</span>
        </div>
        <button className="onboarding-skip-btn" onClick={onComplete}>
          {lang === 'ru' ? 'Пропустить' : 'Skip'}
        </button>
      </div>

      {/* Swipeable Slider */}
      <div 
        ref={sliderRef}
        className="onboarding-slider"
        onScroll={handleScroll}
      >
        {/* Slide 1: Problem */}
        <div className="onboarding-slide">
          <div className="onboarding-slide-graphic">
            <div className="chat-mockup">
              <div className="chat-msg bubble-left">
                <span className="chat-msg-sender">Client</span>
                <span className="chat-msg-text">{lang === 'ru' ? 'Хочу купить! Куда платить?' : 'I want to buy! Where do I pay?'}</span>
              </div>
              <div className="chat-msg bubble-right">
                <span className="chat-msg-sender">Creator</span>
                <span className="chat-msg-text">{lang === 'ru' ? 'Минутку, сейчас скину карту...' : 'One sec, sending my card details...'}</span>
              </div>
              <div className="chat-delay-badge">
                <span className="chat-delay-icon">⏳</span>
                <span>{lang === 'ru' ? 'Потери конверсии -37%' : 'Conversion Drop -37%'}</span>
              </div>
            </div>
          </div>
          <h2 className="onboarding-slide-title">
            {lang === 'ru' ? 'Продажи в соцсетях — это боль?' : 'Selling on social media is a pain?'}
          </h2>
          <p className="onboarding-slide-desc">
            {lang === 'ru' 
              ? 'Сложные сайты, ручные переводы и потерянные клиенты в личке. Пора это исправить!' 
              : 'Complex sites, manual transfers, and lost clients in direct messages. Time to fix it!'}
          </p>
        </div>

        {/* Slide 2: AI Creation */}
        <div className="onboarding-slide">
          <div className="onboarding-slide-graphic">
            <div className="ai-mockup">
              <div className="ai-file-badge">📄 Guide.pdf</div>
              <div className="ai-magic-glow">🪄</div>
              <div className="ai-card-preview">
                <div className="ai-card-title">📖 Guide To Sales</div>
                <div className="ai-card-price">$19</div>
              </div>
            </div>
          </div>
          <h2 className="onboarding-slide-title">
            {lang === 'ru' ? 'Магазин за 60 секунд с ИИ' : 'AI Store in 60 Seconds'}
          </h2>
          <p className="onboarding-slide-desc">
            {lang === 'ru' 
              ? 'Просто загрузите файл или ссылку. Наш искусственный интеллект сам создаст описание, карточку товара и настроит авто-оплату.' 
              : 'Just upload a file or a link. Our AI will automatically generate descriptions, product cards, and configure payments.'}
          </p>
        </div>

        {/* Slide 3: Payments */}
        <div className="onboarding-slide">
          <div className="onboarding-slide-graphic">
            <div className="payment-badges-container">
              <div className="payment-badge-item">💳 {lang === 'ru' ? 'Карты' : 'Cards'}</div>
              <div className="payment-badge-item star-glow">⭐ Stars</div>
              <div className="payment-badge-item ton-glow">💎 TON</div>
              <div className="payment-badge-item usdt-glow">💸 USDT</div>
            </div>
          </div>
          <h2 className="onboarding-slide-title">
            {lang === 'ru' ? 'Принимайте оплаты везде' : 'Accept Payments Everywhere'}
          </h2>
          <p className="onboarding-slide-desc">
            {lang === 'ru' 
              ? 'Telegram Stars, банковские карты или криптовалюта TON/USDT. Деньги поступают сразу на ваши реквизиты.' 
              : 'Telegram Stars, bank cards, or TON/USDT crypto. Funds go directly to your accounts.'}
          </p>
        </div>

        {/* Slide 4: Conversion (Funnel Visual) */}
        <div className="onboarding-slide">
          <div className="onboarding-slide-graphic" style={{ height: '170px' }}>
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
          </div>
          <h2 className="onboarding-slide-title" style={{ fontSize: '20px' }}>
            {lang === 'ru' ? 'Перестаньте терять 37% клиентов' : 'Stop Losing 37% of Customers'}
          </h2>
          <div className="onboarding-accent-callout">
            {lang === 'ru' ? 'С PayBio вы продаете прямо в Telegram Stories!' : 'With PayBio you sell directly in Telegram Stories!'}
          </div>
          <p className="onboarding-slide-desc" style={{ fontSize: '12.5px' }}>
            {lang === 'ru'
              ? 'Каждый клик «Перейти на сайт» — это «долина смерти» для вашей прибыли. 37% пользователей отваливаются из-за долгой загрузки и лишних переходов.'
              : 'Every click to an external website is a dead end for profits. 37% of users drop off due to slow loading and extra steps.'}
          </p>
        </div>

        {/* Slide 5: Success & Scale */}
        <div className="onboarding-slide">
          <div className="onboarding-slide-graphic">
            <div className="dashboard-mockup">
              <div className="dashboard-header-row">
                <span className="dashboard-title">PayBio CRM</span>
                <span className="dashboard-badge-live">● LIVE</span>
              </div>
              <div className="dashboard-stats-grid">
                <div className="dashboard-stat-card">
                  <span className="stat-label">Sales</span>
                  <span className="stat-value text-green">$2,450</span>
                </div>
                <div className="dashboard-stat-card">
                  <span className="stat-label">Orders</span>
                  <span className="stat-value text-blue">+15</span>
                </div>
              </div>
              <div className="dashboard-progress-row">
                <span className="progress-label">Fulfillment:</span>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: '100%' }}></div>
                </div>
                <span className="progress-value">100%</span>
              </div>
            </div>
          </div>
          <h2 className="onboarding-slide-title">
            {lang === 'ru' ? 'Растите и масштабируйтесь' : 'Grow and Scale'}
          </h2>
          <p className="onboarding-slide-desc">
            {lang === 'ru' 
              ? 'Встроенная CRM-система, аналитика продаж и автоматическая выдача цифровых товаров клиентам.' 
              : 'Built-in CRM system, detailed sales analytics, and automated delivery of digital goods to customers.'}
          </p>
        </div>
      </div>

      {/* Bottom Indicators & Actions */}
      <div className="onboarding-footer-controls">
        {/* Onboarding Dots Indicator */}
        <div className="onboarding-dots">
          {Array.from({ length: slidesCount }).map((_, idx) => (
            <div 
              key={idx} 
              className={`onboarding-dot ${idx === activeSlide ? 'active' : ''}`}
            />
          ))}
        </div>

        {/* Actions Button */}
        <div className="onboarding-btn-area">
          {activeSlide < slidesCount - 1 ? (
            <button className="onboarding-next-btn" onClick={handleNext}>
              {lang === 'ru' ? 'Далее →' : 'Next →'}
            </button>
          ) : (
            <button className="onboarding-cta-btn animate-pulse" onClick={onComplete}>
              {lang === 'ru' ? '🚀 Создать ИИ-магазин' : '🚀 Create AI Store'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
