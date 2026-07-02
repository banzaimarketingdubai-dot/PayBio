'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product } from '@/types/store';
import ProductCard from '../ProductCard';

interface EventStoreScreenProps {
  products: Product[];
  lang: 'en' | 'ru';
  t: any;
  isOwner: boolean;
  onSelect: (id: string) => void;
  starredIds: string[];
  onToggleStar: (productId: string, e: React.MouseEvent) => void;
  onGeneratePromo: (p: any) => void;
  onOpenEditProduct: (p: any) => void;
  onConfirmDelete: (productId: string, productTitle: string) => void;
  onAddProduct: (section: string) => void;
}

const rubrics = [
  { id: 'business', labelRu: 'Бизнес', labelEn: 'Business', icon: '💼' },
  { id: 'development', labelRu: 'Развитие', labelEn: 'Development', icon: '🧠' },
  { id: 'activities', labelRu: 'Активности', labelEn: 'Activities', icon: '💃' },
  { id: 'networking', labelRu: 'Нетворкинг', labelEn: 'Networking', icon: '🤝' },
  { id: 'relations', labelRu: 'Отношения', labelEn: 'Relations', icon: '❤️' },
  { id: 'other', labelRu: 'Другое', labelEn: 'Other', icon: '✨' },
];

export default function EventStoreScreen({
  products,
  lang,
  t,
  isOwner,
  onSelect,
  starredIds,
  onToggleStar,
  onGeneratePromo,
  onOpenEditProduct,
  onConfirmDelete,
  onAddProduct,
}: EventStoreScreenProps) {
  const [selectedRubric, setSelectedRubric] = useState('all');
  const [selectedDateStr, setSelectedDateStr] = useState('all'); // 'all' or 'YYYY-MM-DD'
  const [locationSearch, setLocationSearch] = useState('');
  const [sortByDate, setSortByDate] = useState<'asc' | 'desc'>('asc');

  const sliderRef = useRef<HTMLDivElement>(null);

  // Initialize scroll position for the infinite category slider
  useEffect(() => {
    const el = sliderRef.current;
    if (el) {
      el.scrollLeft = el.scrollWidth / 3;
    }
  }, []);

  const handleSliderScroll = () => {
    const el = sliderRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const oneThird = scrollWidth / 3;

    if (scrollLeft < 10) {
      el.scrollLeft = oneThird + scrollLeft;
    } else if (scrollLeft + clientWidth > scrollWidth - 10) {
      el.scrollLeft = scrollLeft - oneThird;
    }
  };

  // Generate the next 7 days dynamically
  const days = useMemo(() => {
    const result = [];
    const daysOfWeekRu = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const daysOfWeekEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        dateStr,
        dayNum: d.getDate(),
        dayName: lang === 'ru' ? daysOfWeekRu[d.getDay()] : daysOfWeekEn[d.getDay()],
      });
    }
    return result;
  }, [lang]);

  // Filter events (product_type === 'TICKET')
  const eventProducts = useMemo(() => {
    return products.filter((p) => p.product_type === 'TICKET');
  }, [products]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    let result = [...eventProducts];

    // Filter by Rubric
    if (selectedRubric !== 'all') {
      result = result.filter((p) => {
        try {
          const parsed = JSON.parse(p.content_url);
          if (parsed && parsed.rubric) {
            const rubricsList = Array.isArray(parsed.rubric) ? parsed.rubric : [parsed.rubric];
            return rubricsList.map((r: any) => String(r).toLowerCase()).includes(selectedRubric.toLowerCase());
          }
          return false;
        } catch {
          return false;
        }
      });
    }

    // Filter by Dynamic Week Date
    if (selectedDateStr !== 'all') {
      result = result.filter((p) => {
        try {
          const parsed = JSON.parse(p.content_url);
          return parsed.event_date === selectedDateStr;
        } catch {
          return false;
        }
      });
    }

    // Filter by Location
    if (locationSearch.trim() !== '') {
      const search = locationSearch.toLowerCase().trim();
      result = result.filter((p) => {
        try {
          const parsed = JSON.parse(p.content_url);
          return parsed.location && parsed.location.toLowerCase().includes(search);
        } catch {
          return false;
        }
      });
    }

    // Sort by Date & Time
    result.sort((a, b) => {
      let dateA = 0;
      let dateB = 0;
      try {
        const parsedA = JSON.parse(a.content_url);
        if (parsedA.event_date) {
          dateA = new Date(`${parsedA.event_date}T${parsedA.event_time || '00:00'}`).getTime();
        }
      } catch {}
      try {
        const parsedB = JSON.parse(b.content_url);
        if (parsedB.event_date) {
          dateB = new Date(`${parsedB.event_date}T${parsedB.event_time || '00:00'}`).getTime();
        }
      } catch {}

      return sortByDate === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [eventProducts, selectedRubric, selectedDateStr, locationSearch, sortByDate]);

  return (
    <div style={{ padding: '0 16px 80px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ─── TITLE & ADD ACTION ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="section-header" style={{ margin: 0 }}>
          {lang === 'ru' ? 'Афиша мероприятий' : 'Event Board'}
        </p>
        {isOwner && (
          <button
            type="button"
            onClick={() => onAddProduct('TICKET')}
            style={{
              background: 'var(--tg-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(0, 136, 204, 0.2)'
            }}
          >
            ＋ {lang === 'ru' ? 'Событие' : 'Event'}
          </button>
        )}
      </div>

      {/* ─── DYNAMIC WEEK CALENDAR TILE HEADER ─── */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '8px', 
          overflowX: 'auto', 
          paddingBottom: '4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {/* "All" Tile */}
        <button
          type="button"
          onClick={() => setSelectedDateStr('all')}
          style={{
            flexShrink: 0,
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            border: selectedDateStr === 'all' ? 'none' : '1px solid var(--tg-border)',
            background: selectedDateStr === 'all' ? 'linear-gradient(135deg, var(--tg-accent) 0%, #006699 100%)' : 'rgba(255,255,255,0.03)',
            color: selectedDateStr === 'all' ? '#fff' : 'var(--tg-text)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: 700,
            fontSize: '12px'
          }}
        >
          <span>🗓️</span>
          <span style={{ fontSize: '11px', marginTop: '2px' }}>{lang === 'ru' ? 'Все' : 'All'}</span>
        </button>

        {/* 7 Days Tiles */}
        {days.map((day) => {
          const isSelected = selectedDateStr === day.dateStr;
          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => setSelectedDateStr(day.dateStr)}
              style={{
                flexShrink: 0,
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                border: isSelected ? 'none' : '1px solid var(--tg-border)',
                background: isSelected ? 'linear-gradient(135deg, var(--tg-accent) 0%, #006699 100%)' : 'rgba(255,255,255,0.03)',
                color: isSelected ? '#fff' : 'var(--tg-text)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                gap: '2px'
              }}
            >
              <span style={{ fontSize: '10px', color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--tg-hint)', fontWeight: 600, textTransform: 'uppercase' }}>
                {day.dayName}
              </span>
              <span style={{ fontSize: '15px', fontWeight: 800 }}>
                {day.dayNum}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── RUBRICS HORIZONTAL SLIDER (INFINITE) ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div 
          ref={sliderRef}
          onScroll={handleSliderScroll}
          style={{ 
            display: 'flex', 
            gap: '8px', 
            overflowX: 'auto', 
            paddingBottom: '4px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {/* Default "All" option for rubrics */}
          <button
            type="button"
            onClick={() => setSelectedRubric('all')}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '12px',
              border: selectedRubric === 'all' ? 'none' : '1px solid var(--tg-border)',
              background: selectedRubric === 'all' ? 'linear-gradient(135deg, var(--tg-accent) 0%, #006699 100%)' : 'rgba(255,255,255,0.03)',
              color: selectedRubric === 'all' ? '#fff' : 'var(--tg-text)',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <span>🌟</span>
            <span>{lang === 'ru' ? 'Все' : 'All'}</span>
          </button>

          {[...rubrics, ...rubrics, ...rubrics].map((rubric, index) => {
            const isSelected = selectedRubric === rubric.id;
            return (
              <button
                key={`${rubric.id}-${index}`}
                type="button"
                onClick={() => setSelectedRubric(rubric.id)}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  border: isSelected ? 'none' : '1px solid var(--tg-border)',
                  background: isSelected ? 'linear-gradient(135deg, var(--tg-accent) 0%, #006699 100%)' : 'rgba(255,255,255,0.03)',
                  color: isSelected ? '#fff' : 'var(--tg-text)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span>{rubric.icon}</span>
                <span>{lang === 'ru' ? rubric.labelRu : rubric.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── FILTERS GRID ─── */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '12px',
          background: 'rgba(255,255,255,0.02)',
          padding: '12px',
          borderRadius: '14px',
          border: '1px solid var(--tg-border)',
          alignItems: 'end'
        }}
      >
        {/* Location Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--tg-hint)', fontWeight: 600, textTransform: 'uppercase' }}>
            📍 {lang === 'ru' ? 'Локация / Город' : 'Location / City'}
          </span>
          <input
            type="text"
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            placeholder={lang === 'ru' ? 'Введите город...' : 'Search city...'}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--tg-border)',
              background: 'var(--tg-bg)',
              color: 'var(--tg-text)',
              fontSize: '13px',
              height: '32px'
            }}
          />
        </div>

        {/* Date Sorting */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--tg-hint)', fontWeight: 600, textTransform: 'uppercase' }}>
            ⇅ {lang === 'ru' ? 'Сортировка' : 'Sort'}
          </span>
          <button
            type="button"
            onClick={() => setSortByDate(sortByDate === 'asc' ? 'desc' : 'asc')}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid var(--tg-border)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--tg-text)',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <span>📅</span>
            <span>{sortByDate === 'asc' ? '▲' : '▼'}</span>
            <span style={{ fontSize: '11px' }}>{lang === 'ru' ? (sortByDate === 'asc' ? 'Сначала новые' : 'Сначала старые') : (sortByDate === 'asc' ? 'Soonest' : 'Latest')}</span>
          </button>
        </div>
      </div>

      {/* ─── EVENT PRODUCTS LIST ─── */}
      {filteredEvents.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px' }}>
          {filteredEvents.map((p, idx) => (
            <ProductCard
              key={p.id}
              product={p}
              idx={idx}
              isOwner={isOwner}
              starredIds={starredIds}
              lang={lang}
              t={t}
              onSelect={onSelect}
              onToggleStar={onToggleStar}
              onGeneratePromo={onGeneratePromo}
              onOpenEditProduct={onOpenEditProduct}
              onConfirmDelete={onConfirmDelete}
            />
          ))}
        </div>
      ) : (
        <div 
          style={{ 
            textAlign: 'center', 
            padding: '40px 20px', 
            color: 'var(--tg-hint)',
            background: 'rgba(255,255,255,0.01)',
            borderRadius: '16px',
            border: '1px dashed var(--tg-border)',
            marginTop: '8px'
          }}
        >
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>🎟️</span>
          <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600 }}>
            {lang === 'ru' 
              ? 'Мероприятий не найдено. Попробуйте сбросить фильтры.' 
              : 'No events found. Try resetting the filters.'}
          </p>
        </div>
      )}

    </div>
  );
}
