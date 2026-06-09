'use client';

import React, { useState, useEffect, useRef } from 'react';

interface TutorialStep {
  selector: string | null;
  titleEn: string;
  titleRu: string;
  textEn: string;
  textRu: string;
  action?: () => void;
}

interface InteractiveTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ru';
  setCurrentScreen: (screen: 'CATALOG' | 'SETTINGS' | 'PARTNER') => void;
}

export default function InteractiveTutorial({
  isOpen,
  onClose,
  lang,
  setCurrentScreen,
}: InteractiveTutorialProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const steps: TutorialStep[] = [
    {
      selector: null,
      titleEn: 'Welcome to PayBio! 🚀',
      titleRu: 'Добро пожаловать в PayBio! 🚀',
      textEn: "Let's take a quick 1-minute interactive tour of your storefront dashboard.",
      textRu: 'Давайте совершим короткую 1-минутную экскурсию по панели управления вашего магазина.',
      action: () => setCurrentScreen('CATALOG'),
    },
    {
      selector: '.tour-avatar',
      titleEn: 'Profile Branding 🎨',
      titleRu: 'Оформление профиля 🎨',
      textEn: 'This is your shop avatar and banner. As the owner, you can tap the camera icons to upload custom designs directly.',
      textRu: 'Это аватар и баннер вашего магазина. Вы можете нажать на иконки фотоаппарата, чтобы загрузить свои изображения.',
      action: () => setCurrentScreen('CATALOG'),
    },
    {
      selector: '.tour-lang-row',
      titleEn: 'Storefront Actions 🌐',
      titleRu: 'Управление витриной 🌐',
      textEn: 'Switch language (RU/EN) instantly, scan buyer ticket QR codes to check them in, or open the settings dashboard.',
      textRu: 'Переключайте язык (RU/EN), сканируйте QR-коды билетов покупателей для отметки входа или открывайте настройки.',
      action: () => setCurrentScreen('CATALOG'),
    },
    {
      selector: '.tour-section-header',
      titleEn: 'Catalog Sections 📁',
      titleRu: 'Разделы каталога 📁',
      textEn: 'Products are grouped into sections: Files, Tickets, and Bookings. Drag section handles to reorder them.',
      textRu: 'Товары делятся на разделы: Файлы, Билеты, Записи. Вы можете перетаскивать их за иконки, чтобы менять порядок.',
      action: () => setCurrentScreen('CATALOG'),
    },
    {
      selector: '.tour-add-btn',
      titleEn: 'Creating Products ＋',
      titleRu: 'Добавление товаров ＋',
      textEn: "Tap '＋ Add' under any section to create a product card. Buyers will see it in your catalog immediately.",
      textRu: 'Нажмите «＋ Add» под любым разделом, чтобы быстро создать товар. Он сразу появится на витрине.',
      action: () => setCurrentScreen('CATALOG'),
    },
    {
      selector: '.tour-settings-profile',
      titleEn: 'Shop Profile Settings 👤',
      titleRu: 'Профиль магазина 👤',
      textEn: 'Here you can edit your shop name and description, and check your Premium subscription status.',
      textRu: 'В этом разделе вы можете обновить название, описание магазина и узнать статус Premium подписки.',
      action: () => setCurrentScreen('SETTINGS'),
    },
    {
      selector: '.tour-settings-payments',
      titleEn: 'Billing & Payouts 💳',
      titleRu: 'Реквизиты и Выплаты 💳',
      textEn: 'Configure bank cards, TON or USDT wallets. Payments go straight to your accounts with 0% platform commission!',
      textRu: 'Привяжите карты (СБП/РФ), TON или USDT. Платежи от покупателей поступают сразу на ваши кошельки без комиссии сервиса!',
      action: () => setCurrentScreen('SETTINGS'),
    },
    {
      selector: '.tour-settings-calendar',
      titleEn: 'Calendar Sync 📅',
      titleRu: 'Интеграция календаря 📅',
      textEn: 'If you sell consultations, connect Google or Apple calendars (ICS) to auto-exclude busy slots and prevent conflict bookings.',
      textRu: 'Для продажи консультаций подключите календарь Google/Apple (ICS), чтобы автоматически исключать занятые часы.',
      action: () => setCurrentScreen('SETTINGS'),
    },
    {
      selector: '.tour-partner-btn',
      titleEn: 'Partner Program 🤝',
      titleRu: 'Партнерская программа 🤝',
      textEn: 'Invite other creators to PayBio and earn up to 30% lifetime recurring commission on all their Premium upgrades!',
      textRu: 'Приглашайте других авторов и получайте пожизненную комиссию до 30% от всех оплат подписок Premium ваших рефералов!',
      action: () => setCurrentScreen('PARTNER'),
    },
    {
      selector: '.tour-bio-link',
      titleEn: 'Ready to Sell! 🎉',
      titleRu: 'Все готово к продажам! 🎉',
      textEn: 'Copy your storefront link from this box or from Settings, then paste it in your Telegram bio or channel description. Good luck with your sales!',
      textRu: 'Скопируйте ссылку на витрину из этого блока или из Настроек, затем разместите её в описании профиля (Bio) Telegram или вашего канала. Желаем успешных продаж!',
      action: () => setCurrentScreen('CATALOG'),
    },
  ];

  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    if (!isOpen) return;
    if (currentStep.action) {
      currentStep.action();
    }
  }, [currentStepIndex, isOpen]);

  useEffect(() => {
    if (!isOpen || !currentStep.selector) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      if (!currentStep.selector) return;
      const el = document.querySelector(currentStep.selector);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };

    updateRect();
    const t = setTimeout(updateRect, 180); // Wait for transition animations
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, { passive: true });

    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [currentStep.selector, currentStepIndex, isOpen]);

  if (!isOpen) return null;

  const isTargetAtBottom = rect ? (rect.top + rect.height / 2 > window.innerHeight / 2) : false;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9990,
      fontFamily: 'Inter, -apple-system, sans-serif'
    }}>
      {/* Background Mask */}
      {!rect ? (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.78)',
          backdropFilter: 'blur(3px)',
          zIndex: 9991
        }} />
      ) : (
        <div style={{
          position: 'fixed',
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          borderRadius: '12px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.78)',
          zIndex: 9991,
          pointerEvents: 'none',
          transition: 'all 0.25s ease'
        }} />
      )}

      {/* Popover Card */}
      <div 
        style={{
          position: 'fixed',
          left: '16px',
          right: '16px',
          bottom: isTargetAtBottom ? 'auto' : '24px',
          top: isTargetAtBottom ? '60px' : 'auto',
          background: 'var(--tg-secondary-bg, #232e3c)',
          border: '1.5px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '20px',
          zIndex: 9995,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          color: 'var(--tg-text, #f5f5f5)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--tg-accent, #2b8cf3)' }}>
            {lang === 'ru' ? currentStep.titleRu : currentStep.titleEn}
          </h4>
          <span style={{ fontSize: '11px', color: 'var(--tg-hint, #708499)', fontWeight: 600 }}>
            {currentStepIndex + 1} / {steps.length}
          </span>
        </div>

        <p style={{ fontSize: '13.5px', lineHeight: 1.5, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
          {lang === 'ru' ? currentStep.textRu : currentStep.textEn}
        </p>

        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--tg-hint, #708499)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '6px 0',
              marginRight: 'auto'
            }}
          >
            {lang === 'ru' ? 'Пропустить' : 'Skip'}
          </button>

          {currentStepIndex > 0 && (
            <button
              type="button"
              onClick={handleBack}
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--tg-text, #f5f5f5)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {lang === 'ru' ? 'Назад' : 'Back'}
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            style={{
              background: 'var(--tg-accent, #2b8cf3)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(43, 140, 243, 0.3)'
            }}
          >
            {currentStepIndex === steps.length - 1 
              ? (lang === 'ru' ? 'Начать!' : 'Get Started!') 
              : (lang === 'ru' ? 'Далее →' : 'Next →')}
          </button>
        </div>
      </div>
    </div>
  );
}
