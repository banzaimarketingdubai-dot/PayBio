'use client';

import React from 'react';
import { Product } from '@/types/store';

interface DeliveryFormViewProps {
  lang: 'en' | 'ru';
  product: Product;
  shipFullName: string;
  setShipFullName: (val: string) => void;
  shipPhone: string;
  setShipPhone: (val: string) => void;
  shipMethod: string;
  setShipMethod: (val: string) => void;
  shipAddress: string;
  setShipAddress: (val: string) => void;
  isSubmittingShipping: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function DeliveryFormView({
  lang,
  product,
  shipFullName,
  setShipFullName,
  shipPhone,
  setShipPhone,
  shipMethod,
  setShipMethod,
  shipAddress,
  setShipAddress,
  isSubmittingShipping,
  onSubmit
}: DeliveryFormViewProps) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--tg-bg)',
      color: 'var(--tg-text)',
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      overflowY: 'auto'
    }} className="animate-fade-in">
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🚚</div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0' }}>
          {lang === 'ru' ? 'Детали доставки' : 'Shipping Details'}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--tg-hint)', margin: 0, lineHeight: 1.4 }}>
          {lang === 'ru' 
            ? 'Пожалуйста, заполните форму ниже для доставки вашего товара.' 
            : 'Please fill in the form below to deliver your item.'}
        </p>
      </div>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="bottom-sheet-form-group">
          <label className="bottom-sheet-label">
            {lang === 'ru' ? 'ФИО получателя' : 'Recipient Full Name'} *
          </label>
          <input
            type="text"
            className="tg-input"
            value={shipFullName}
            onChange={(e) => setShipFullName(e.target.value)}
            placeholder={lang === 'ru' ? 'Иванов Иван Иванович' : 'John Doe'}
            required
          />
        </div>

        <div className="bottom-sheet-form-group">
          <label className="bottom-sheet-label">
            {lang === 'ru' ? 'Номер телефона' : 'Phone Number'} *
          </label>
          <input
            type="tel"
            className="tg-input"
            value={shipPhone}
            onChange={(e) => setShipPhone(e.target.value)}
            placeholder="+7 (999) 999-99-99"
            required
          />
        </div>

        <div className="bottom-sheet-form-group">
          <label className="bottom-sheet-label">
            {lang === 'ru' ? 'Способ доставки' : 'Shipping Method'} *
          </label>
          <select
            className="tg-input"
            value={shipMethod}
            onChange={(e) => setShipMethod(e.target.value)}
            style={{ background: 'var(--tg-bg)', color: 'var(--tg-text)' }}
          >
            <option value="SDEK">{lang === 'ru' ? 'СДЭК (Пункт выдачи / Курьер)' : 'SDEK (Branch / Courier)'}</option>
            <option value="Russian Post">{lang === 'ru' ? 'Почта России' : 'Russian Post'}</option>
            <option value="International">{lang === 'ru' ? 'Международная доставка' : 'International Shipping'}</option>
          </select>
        </div>

        <div className="bottom-sheet-form-group">
          <label className="bottom-sheet-label">
            {lang === 'ru' ? 'Адрес доставки / Пункт выдачи' : 'Shipping Address / Pickup Branch'} *
          </label>
          <textarea
            className="tg-input"
            value={shipAddress}
            onChange={(e) => setShipAddress(e.target.value)}
            placeholder={
              shipMethod === 'SDEK'
                ? (lang === 'ru' ? 'Адрес пункта выдачи СДЭК или домашний адрес' : 'SDEK pickup branch address or home address')
                : (lang === 'ru' ? 'Индекс, область, город, улица, дом, квартира' : 'ZIP, region, city, street, house, apt')
            }
            rows={3}
            style={{ resize: 'none' }}
            required
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmittingShipping}
          style={{
            marginTop: '10px',
            background: isSubmittingShipping ? 'var(--tg-hint)' : 'var(--tg-green)',
            cursor: isSubmittingShipping ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmittingShipping ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="spinner-mini" style={{
                width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite'
              }} />
              {lang === 'ru' ? 'Сохранение...' : 'Saving...'}
            </span>
          ) : (
            lang === 'ru' ? 'Подтвердить детали доставки ✓' : 'Confirm Shipping Details ✓'
          )}
        </button>
      </form>
    </div>
  );
}
