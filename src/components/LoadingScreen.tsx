'use client';

import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
  lang?: 'en' | 'ru';
}

const slides = [
  {
    titleEn: 'Boost Conversions by 37%',
    titleRu: 'Повышение конверсии на 37%',
    descEn: 'Our streamlined checkout flow is optimized for impulse buys, securing more sales automatically.',
    descRu: 'Оптимизированный процесс покупки повышает импульсивные продажи и приносит больше прибыли.',
    img: '/conversion_gain.png',
  },
  {
    titleEn: 'Zero-Fee Payments',
    titleRu: 'Оплата без комиссии',
    descEn: 'Accept Telegram Stars, direct card transfers (P2P), or TON crypto payments with zero fees.',
    descRu: 'Принимайте Telegram Stars, карты (P2P) или TON напрямую без посредников и скрытых комиссий.',
    img: '/payment_options.png',
  },
  {
    titleEn: 'Advertise in Telegram Stories',
    titleRu: 'Реклама прямо в Stories',
    descEn: 'Drive instant sales by linking your high-converting product pages directly inside Telegram Stories.',
    descRu: 'Запускайте продажи напрямую, прикрепляя ссылки на ваши товары прямо в Telegram Stories.',
    img: '/story_ads.png',
  },
  {
    titleEn: 'Maximize Impulsive Sales',
    titleRu: 'Взрыв импульсивных продаж',
    descEn: 'Instant product creation, auto-generated graphics, and immediate bot delivery make buying frictionless.',
    descRu: 'Мгновенное создание товаров, авто-обложки и автоматическая выдача делают покупку бесшовной.',
    img: '/impulsive_sales.png',
  }
];

export default function LoadingScreen({ lang = 'en' }: LoadingScreenProps) {
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % slides.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const slide = slides[currentIdx];
  const title = lang === 'ru' ? slide.titleRu : slide.titleEn;
  const desc = lang === 'ru' ? slide.descRu : slide.descEn;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100svh',
      background: 'linear-gradient(135deg, #100b26 0%, #03000a 100%)',
      padding: '24px',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      boxSizing: 'border-box',
    }}>
      {/* Top indicator progress bars */}
      <div style={{
        display: 'flex',
        width: 'calc(100% - 32px)',
        maxWidth: '480px',
        gap: '6px',
        position: 'absolute',
        top: '28px',
        zIndex: 10,
      }}>
        {slides.map((_, index) => (
          <div key={index} style={{
            flex: 1,
            height: '4px',
            borderRadius: '2px',
            background: index === currentIdx 
              ? 'linear-gradient(90deg, #2b8cf3 0%, #a855f7 100%)' 
              : 'rgba(255, 255, 255, 0.1)',
            transition: 'background 0.4s ease',
          }} />
        ))}
      </div>

      {/* Main Slide Card Container */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        flex: 1,
        justifyContent: 'center',
        paddingTop: '60px',
        paddingBottom: '80px',
        boxSizing: 'border-box',
      }}>
        {/* Animated Slide Transition wrapper */}
        <div 
          key={currentIdx}
          className="fade-in-slide"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          {/* Illustration image */}
          <div style={{
            width: '100%',
            height: '280px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
            borderRadius: '20px',
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '16px',
            boxSizing: 'border-box',
          }}>
            <img 
              src={slide.img} 
              alt={title} 
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))',
              }} 
            />
          </div>

          <h2 style={{
            fontSize: '26px',
            fontWeight: 850,
            margin: '0 0 16px 0',
            background: 'linear-gradient(90deg, #3b82f6 0%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
            lineHeight: '1.25',
          }}>
            {title}
          </h2>

          <p style={{
            fontSize: '15.5px',
            color: 'rgba(255, 255, 255, 0.75)',
            lineHeight: '1.6',
            margin: 0,
            minHeight: '80px',
            padding: '0 16px',
          }}>
            {desc}
          </p>
        </div>
      </div>

      {/* Loading indicator and spinner footer */}
      <div style={{
        position: 'absolute',
        bottom: '36px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <div style={{
          width: '18px',
          height: '18px',
          border: '2px solid rgba(255,255,255,0.15)',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
        }} className="animate-spin" />
        <span style={{
          fontSize: '12.5px',
          color: 'rgba(255, 255, 255, 0.4)',
          fontWeight: 500,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>
          {lang === 'ru' ? 'Загрузка системы...' : 'Initializing PayBio...'}
        </span>
      </div>

      <style jsx global>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .fade-in-slide {
          animation: fadeInSlide 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
