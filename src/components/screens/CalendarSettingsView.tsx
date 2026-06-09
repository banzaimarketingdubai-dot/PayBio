'use client';

import React, { useState, useEffect, useMemo } from 'react';
import BookingCalendar from '@/components/BookingCalendar';
import { Creator, Product } from '@/types/store';
import { showAlert } from '@/utils/telegram';

interface CalendarSettingsViewProps {
  creator: Creator | null;
  lang: 'en' | 'ru';
  t: any;
  currentScreen: 'CATALOG' | 'SETTINGS' | 'PARTNER' | 'CALENDAR';
  setCurrentScreen: (screen: 'CATALOG' | 'SETTINGS' | 'PARTNER' | 'CALENDAR') => void;
  products: Product[];
  onSaveSettings: (
    name: string,
    description: string,
    avatar: string,
    banner: string,
    socials: any,
    ton: string,
    p2p: string,
    p2pList: any[],
    calendarProvider: string,
    icsUrl: string,
    usdtTrc20?: string,
    usdtBep20?: string,
    other?: string,
    adminPaymentDetails?: any
  ) => Promise<void>;
  onUpdateProduct: (
    id: string,
    title: string,
    description: string,
    priceFiat: number,
    priceStars?: number,
    contentUrl?: string,
    coverUrl?: string,
    productType?: string,
    section?: string,
    subType?: string
  ) => Promise<boolean>;
  busySlots: { start: string; end: string }[];
  dbBookings: any[];
  fetchBusySlotsForProduct: (prodId: string) => Promise<void>;
  buyerTgId: number;
}

export default function CalendarSettingsView({
  creator,
  lang,
  t,
  currentScreen,
  setCurrentScreen,
  products,
  onSaveSettings,
  onUpdateProduct,
  busySlots,
  dbBookings,
  fetchBusySlotsForProduct,
  buyerTgId,
}: CalendarSettingsViewProps) {
  const bookingProducts = useMemo(() => {
    return products.filter((p) => p.product_type === 'BOOKING');
  }, [products]);

  const [selectedProductId, setSelectedProductId] = useState(() => {
    return bookingProducts[0]?.id || '';
  });

  const selectedProduct = useMemo(() => {
    return bookingProducts.find((p) => p.id === selectedProductId) || null;
  }, [bookingProducts, selectedProductId]);

  // General Calendar integration state (synced from DB on select)
  const [calProvider, setCalProvider] = useState('none');
  const [calIcsUrl, setCalIcsUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; count: number } | null>(null);

  // Working Hours state
  const [workingDays, setWorkingDays] = useState<
    Record<string, { active: boolean; start: string; end: string }>
  >({
    Mon: { active: true, start: '09:00', end: '18:00' },
    Tue: { active: true, start: '09:00', end: '18:00' },
    Wed: { active: true, start: '09:00', end: '18:00' },
    Thu: { active: true, start: '09:00', end: '18:00' },
    Fri: { active: true, start: '09:00', end: '18:00' },
    Sat: { active: false, start: '10:00', end: '16:00' },
    Sun: { active: false, start: '10:00', end: '16:00' },
  });

  // Local calendar widget state
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [isSavingHours, setIsSavingHours] = useState(false);

  // Sync state values when product changes
  useEffect(() => {
    if (selectedProduct) {
      fetchBusySlotsForProduct(selectedProduct.id);
      
      // Parse content_url which holds slots and ics_url for booking
      let parsedSlots = '';
      let parsedIcs = '';
      try {
        const content = JSON.parse(selectedProduct.content_url);
        if (content) {
          parsedSlots = content.slots || '';
          parsedIcs = content.ics_url || '';
        }
      } catch (e) {
        // Fallback for legacy format
        parsedSlots = selectedProduct.content_url || '';
      }

      setCalIcsUrl(parsedIcs || creator?.payment_details?.ics_url || '');
      setCalProvider(
        parsedIcs
          ? parsedIcs.includes('google')
            ? 'google'
            : 'apple'
          : creator?.payment_details?.calendar_provider || 'none'
      );
      setSyncResult(null);

      // Parse working hours back into state if possible
      if (parsedSlots) {
        parseWorkingHoursText(parsedSlots);
      }
    }
  }, [selectedProductId, selectedProduct, creator]);

  // Parser helper for Availability string (e.g. "Mon-Fri 09:00-18:00, Sat 10:00-16:00")
  const parseWorkingHoursText = (text: string) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const updated = {
      Mon: { active: false, start: '09:00', end: '18:00' },
      Tue: { active: false, start: '09:00', end: '18:00' },
      Wed: { active: false, start: '09:00', end: '18:00' },
      Thu: { active: false, start: '09:00', end: '18:00' },
      Fri: { active: false, start: '09:00', end: '18:00' },
      Sat: { active: false, start: '10:00', end: '16:00' },
      Sun: { active: false, start: '10:00', end: '16:00' },
    };

    try {
      const parts = text.split(',');
      parts.forEach((part) => {
        const trimmed = part.trim();
        if (!trimmed) return;
        const match = trimmed.match(/^([A-Za-z\-,\s]+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
        if (match) {
          const [, daysRange, start, end] = match;
          const startVal = start.trim();
          const endVal = end.trim();

          if (daysRange.includes('-')) {
            const [startDay, endDay] = daysRange.split('-').map((d) => d.trim());
            const startIdx = days.indexOf(startDay);
            const endIdx = days.indexOf(endDay);
            if (startIdx !== -1 && endIdx !== -1) {
              for (let i = startIdx; i <= endIdx; i++) {
                updated[days[i] as keyof typeof updated] = { active: true, start: startVal, end: endVal };
              }
            }
          } else {
            const list = daysRange.split(',').map((d) => d.trim());
            list.forEach((d) => {
              if (days.includes(d)) {
                updated[d as keyof typeof updated] = { active: true, start: startVal, end: endVal };
              }
            });
          }
        }
      });
      setWorkingDays(updated);
    } catch (e) {
      console.warn('Failed parsing working hours string:', text, e);
    }
  };

  // Compiler helper for working hours
  const compileWorkingHours = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const activeDays = days.filter((d) => workingDays[d].active);
    if (activeDays.length === 0) return 'No active slots';

    const groups: { hours: string; days: string[] }[] = [];
    days.forEach((d) => {
      if (workingDays[d].active) {
        const hours = `${workingDays[d].start}-${workingDays[d].end}`;
        const existing = groups.find((g) => g.hours === hours);
        if (existing) {
          existing.days.push(d);
        } else {
          groups.push({ hours, days: [d] });
        }
      }
    });

    const formattedGroups = groups.map((g) => {
      const dayIndices = g.days.map((d) => days.indexOf(d));
      dayIndices.sort((a, b) => a - b);

      let isConsecutive = true;
      for (let i = 1; i < dayIndices.length; i++) {
        if (dayIndices[i] !== dayIndices[i - 1] + 1) {
          isConsecutive = false;
          break;
        }
      }

      if (isConsecutive && g.days.length > 2) {
        return `${g.days[0]}-${g.days[g.days.length - 1]} ${g.hours}`;
      } else if (g.days.length === 2 && dayIndices[1] === dayIndices[0] + 1) {
        return `${g.days[0]},${g.days[1]} ${g.hours}`;
      } else {
        return `${g.days.join(', ')} ${g.hours}`;
      }
    });

    return formattedGroups.join(', ');
  };

  const handleSaveWorkingHours = async () => {
    if (!selectedProduct) return;
    setIsSavingHours(true);
    try {
      const formattedSlots = compileWorkingHours();
      const currentContentUrl = selectedProduct.content_url;
      let existingIcs = '';
      try {
        const content = JSON.parse(currentContentUrl);
        if (content) {
          existingIcs = content.ics_url || '';
        }
      } catch (e) {
        // Not JSON
      }

      const updatedContentUrl = JSON.stringify({
        slots: formattedSlots,
        ics_url: existingIcs,
      });

      const success = await onUpdateProduct(
        selectedProduct.id,
        selectedProduct.title,
        selectedProduct.description || '',
        selectedProduct.price_fiat,
        selectedProduct.price_stars,
        updatedContentUrl,
        selectedProduct.cover_url,
        selectedProduct.product_type,
        undefined,
        selectedProduct.sub_type || undefined
      );

      if (success) {
        showAlert(
          lang === 'ru'
            ? '✓ Часы приема успешно сохранены!'
            : '✓ Working hours saved successfully!'
        );
      } else {
        showAlert(lang === 'ru' ? 'Ошибка сохранения часов.' : 'Failed to save working hours.');
      }
    } catch (e: any) {
      showAlert(e.message || 'Error saving hours.');
    } finally {
      setIsSavingHours(false);
    }
  };

  const handleSyncCalendar = async () => {
    if (!selectedProduct) return;
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const currentContentUrl = selectedProduct.content_url;
      let existingSlots = '';
      try {
        const content = JSON.parse(currentContentUrl);
        if (content) {
          existingSlots = content.slots || '';
        }
      } catch (e) {
        existingSlots = currentContentUrl;
      }

      const updatedContentUrl = JSON.stringify({
        slots: existingSlots,
        ics_url: calIcsUrl.trim(),
      });

      // 1. Update the product content URL
      const prodSuccess = await onUpdateProduct(
        selectedProduct.id,
        selectedProduct.title,
        selectedProduct.description || '',
        selectedProduct.price_fiat,
        selectedProduct.price_stars,
        updatedContentUrl,
        selectedProduct.cover_url,
        selectedProduct.product_type,
        undefined,
        selectedProduct.sub_type || undefined
      );

      if (!prodSuccess) {
        throw new Error('Failed to update product details.');
      }

      // 2. Also save to creator payment settings as fallback
      if (creator) {
        const pc = creator.profile_customization || {};
        const pd = creator.payment_details || {};
        await onSaveSettings(
          pc.store_name || '',
          pc.store_description || '',
          pc.avatar_url || '',
          pc.banner_url || '',
          pc.social_links || {},
          pd.ton || '',
          pd.p2p || '',
          pd.p2p_list || [],
          calProvider,
          calIcsUrl.trim(),
          pd.usdt_trc20,
          pd.usdt_bep20,
          pd.other,
          undefined
        );
      }

      // 3. Test sync by calling busy endpoint
      const res = await fetch(`/api/calendar/busy?product_id=${selectedProduct.id}`);
      const data = await res.json();

      if (data.success) {
        setSyncResult({ success: true, count: data.busySlots?.length || 0 });
        await fetchBusySlotsForProduct(selectedProduct.id);
        showAlert(
          lang === 'ru'
            ? '✓ Календарь успешно подключен и синхронизирован!'
            : '✓ Calendar connected and synced successfully!'
        );
      } else {
        setSyncResult({ success: false, count: 0 });
        showAlert(
          lang === 'ru'
            ? '⚠️ Не удалось получить события по ссылке. Проверьте правильность ICS ссылки.'
            : '⚠️ Could not fetch events from URL. Please check the ICS link.'
        );
      }
    } catch (e: any) {
      console.error(e);
      showAlert(e.message || 'Sync error.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div style={{ padding: 'calc(var(--tg-safe-area-inset-top, env(safe-area-inset-top, 50px)) + 12px) 16px 60px', color: 'var(--tg-text)' }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button
          onClick={() => setCurrentScreen('CATALOG')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--tg-link)',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: 0,
          }}
        >
          ← {lang === 'ru' ? 'Назад' : 'Back'}
        </button>
        <span style={{ fontSize: '15px', fontWeight: 800 }}>
          📅 {lang === 'ru' ? 'Расписание и Календарь' : 'Schedule & Calendar'}
        </span>
      </div>

      {bookingProducts.length === 0 ? (
        <div
          className="tg-card animate-scale-in"
          style={{
            padding: '24px',
            textAlign: 'center',
            border: '1px dashed var(--tg-border)',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.01)',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📅</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800 }}>
            {lang === 'ru' ? 'Нет услуг бронирования' : 'No Booking Products'}
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--tg-hint)', lineHeight: 1.45, margin: '0 0 20px 0' }}>
            {lang === 'ru'
              ? 'Создайте услугу типа "Запись на время" в каталоге, чтобы блокировать даты, настраивать часы приема и синхронизировать внешние календари.'
              : 'Create a "Booking / Session" product in the catalog first to start blocking slots and syncing Google/Apple calendars.'}
          </p>
          <button
            className="btn-primary"
            onClick={() => setCurrentScreen('CATALOG')}
            style={{ width: '100%', maxWidth: '200px', margin: '0 auto' }}
          >
            {lang === 'ru' ? 'В каталог' : 'Go to Catalog'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="animate-fade-in">
          
          {/* Booking Product Selector */}
          <div className="tg-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="bottom-sheet-label" style={{ fontWeight: 700 }}>
              {lang === 'ru' ? 'Выберите услугу для настройки:' : 'Select service to configure:'}
            </label>
            <select
              className="tg-input"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              style={{
                background: 'var(--tg-secondary-bg)',
                color: 'var(--tg-text)',
                border: '1px solid var(--tg-border)',
                borderRadius: '10px',
                height: '42px',
                padding: '0 10px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {bookingProducts.map((bp) => (
                <option key={bp.id} value={bp.id}>
                  {bp.title}
                </option>
              ))}
            </select>
          </div>

          {/* Section 1: External Calendar Sync */}
          <div className="tg-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔗</span> {lang === 'ru' ? 'Синхронизация Google / Apple' : 'Google / Apple Calendar Sync'}
            </h3>
            <p style={{ fontSize: '11.5px', color: 'var(--tg-hint)', margin: 0, lineHeight: 1.4 }}>
              {lang === 'ru'
                ? 'Импортируйте ваш личный календарь. Занятые слоты будут автоматически заблокированы на витрине.'
                : 'Import your personal calendar. Busy slots will be automatically blocked for buyers.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', margin: '4px 0' }}>
              {['none', 'google', 'apple'].map((prov) => (
                <button
                  key={prov}
                  type="button"
                  onClick={() => setCalProvider(prov)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '10px',
                    border: calProvider === prov ? '2px solid var(--tg-accent)' : '1px solid var(--tg-border)',
                    background: calProvider === prov ? 'rgba(82,158,255,0.08)' : 'transparent',
                    color: 'var(--tg-text)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {prov === 'none' ? 'None' : prov === 'google' ? 'Google' : 'Apple'}
                </button>
              ))}
            </div>

            {calProvider !== 'none' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} className="animate-fade-in">
                <div className="bottom-sheet-form-group" style={{ margin: 0 }}>
                  <label className="bottom-sheet-label" style={{ fontSize: '11px' }}>
                    {lang === 'ru' ? 'Ссылка на ICS календарь (.ics / webcal)' : 'Calendar ICS Feed URL'}
                  </label>
                  <input
                    type="url"
                    className="tg-input"
                    placeholder="webcal://... or https://..."
                    value={calIcsUrl}
                    onChange={(e) => setCalIcsUrl(e.target.value)}
                    style={{ fontSize: '13px', padding: '10px' }}
                  />
                </div>

                {/* Instruction Cards based on Provider */}
                <div
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--tg-border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '11px',
                    color: 'var(--tg-hint)',
                    lineHeight: 1.45,
                  }}
                >
                  {calProvider === 'google' ? (
                    <>
                      💡 <b>{lang === 'ru' ? 'Как получить ссылку в Google:' : 'How to get Google Calendar Link:'}</b>
                      <ol style={{ margin: '6px 0 0 0', paddingLeft: '16px' }}>
                        <li>{lang === 'ru' ? 'Откройте Google Календарь на компьютере.' : 'Open Google Calendar on desktop.'}</li>
                        <li>{lang === 'ru' ? 'Наведите на календарь слева, нажмите три точки -> Настройки.' : 'Hover over calendar on left, click 3 dots -> Settings.'}</li>
                        <li>{lang === 'ru' ? 'Прокрутите до самого низа к разделу "Интеграция календаря".' : 'Scroll down to "Integrate calendar" section.'}</li>
                        <li>{lang === 'ru' ? 'Скопируйте адрес из поля "Закрытый адрес в формате iCal" (Secret Address in iCal).' : 'Copy URL from "Secret address in iCal format" field.'}</li>
                      </ol>
                    </>
                  ) : (
                    <>
                      💡 <b>{lang === 'ru' ? 'Как получить ссылку в Apple Calendar:' : 'How to get Apple Calendar Link:'}</b>
                      <ol style={{ margin: '6px 0 0 0', paddingLeft: '16px' }}>
                        <li>{lang === 'ru' ? 'Откройте приложение Календарь на iPhone/Mac или в iCloud.' : 'Open Apple Calendar on iPhone/Mac or iCloud.'}</li>
                        <li>{lang === 'ru' ? 'Нажмите значок "Общий доступ" рядом с календарем.' : 'Click the "Share" icon next to your calendar.'}</li>
                        <li>{lang === 'ru' ? 'Включите "Открытый календарь" (Public Calendar).' : 'Turn on "Public Calendar".'}</li>
                        <li>{lang === 'ru' ? 'Скопируйте появившуюся ссылку (она начнется с webcal://).' : 'Copy the generated link (starts with webcal://).'}</li>
                      </ol>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSyncCalendar}
                  disabled={isSyncing || !calIcsUrl.trim()}
                  style={{
                    background: 'var(--tg-accent)',
                    height: '38px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                  }}
                >
                  {isSyncing ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <span className="spinner-mini" style={{ width: '12px', height: '12px' }} />
                      {lang === 'ru' ? 'Синхронизация...' : 'Syncing...'}
                    </span>
                  ) : (
                    lang === 'ru' ? '🔗 Подвязать и синхронизировать' : '🔗 Connect & Sync'
                  )}
                </button>

                {syncResult && (
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: syncResult.success ? 'rgba(77,202,90,0.1)' : 'rgba(233,92,92,0.1)',
                      border: syncResult.success ? '1px solid rgba(77,202,90,0.2)' : '1px solid rgba(233,92,92,0.2)',
                      color: syncResult.success ? 'var(--tg-green, #4dca5a)' : '#ff4d4d',
                      fontSize: '11px',
                      fontWeight: 600,
                      textAlign: 'center',
                    }}
                    className="animate-scale-in"
                  >
                    {syncResult.success
                      ? lang === 'ru'
                        ? `✓ Успешно! Синхронизировано занятых слотов: ${syncResult.count}`
                        : `✓ Success! Synced busy slots: ${syncResult.count}`
                      : lang === 'ru'
                      ? '⚠️ Синхронизация не удалась. Убедитесь, что ссылка ведет на общедоступный .ics файл.'
                      : '⚠️ Sync failed. Ensure the URL links to a valid public .ics file.'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Availability / Working Hours */}
          <div className="tg-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⏰</span> {lang === 'ru' ? 'Часы приема' : 'Working Hours / Availability'}
            </h3>
            <p style={{ fontSize: '11.5px', color: 'var(--tg-hint)', margin: 0, lineHeight: 1.4 }}>
              {lang === 'ru'
                ? 'Настройте дни и время, когда вы готовы принимать клиентов.'
                : 'Configure days and hours you are available for client consultations.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                const info = workingDays[day];
                const dayLabel =
                  lang === 'ru'
                    ? day === 'Mon'
                      ? 'Пн'
                      : day === 'Tue'
                      ? 'Вт'
                      : day === 'Wed'
                      ? 'Ср'
                      : day === 'Thu'
                      ? 'Чт'
                      : day === 'Fri'
                      ? 'Пт'
                      : day === 'Sat'
                      ? 'Сб'
                      : 'Вс'
                    : day;

                return (
                  <div
                    key={day}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: 'rgba(0,0,0,0.15)',
                      borderRadius: '8px',
                      border: '1px solid var(--tg-border)',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={info.active}
                        onChange={(e) => {
                          setWorkingDays({
                            ...workingDays,
                            [day]: { ...info, active: e.target.checked },
                          });
                        }}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--tg-accent)' }}
                      />
                      <span style={{ color: info.active ? 'var(--tg-text)' : 'var(--tg-hint)' }}>
                        {dayLabel}
                      </span>
                    </label>

                    {info.active && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} className="animate-scale-in">
                        <input
                          type="time"
                          className="tg-input"
                          value={info.start}
                          onChange={(e) => {
                            setWorkingDays({
                              ...workingDays,
                              [day]: { ...info, start: e.target.value },
                            });
                          }}
                          style={{
                            padding: '4px 6px',
                            fontSize: '12px',
                            height: '28px',
                            width: '75px',
                            background: 'var(--tg-bg)',
                            border: '1px solid var(--tg-border)',
                            borderRadius: '6px',
                          }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--tg-hint)' }}>—</span>
                        <input
                          type="time"
                          className="tg-input"
                          value={info.end}
                          onChange={(e) => {
                            setWorkingDays({
                              ...workingDays,
                              [day]: { ...info, end: e.target.value },
                            });
                          }}
                          style={{
                            padding: '4px 6px',
                            fontSize: '12px',
                            height: '28px',
                            width: '75px',
                            background: 'var(--tg-bg)',
                            border: '1px solid var(--tg-border)',
                            borderRadius: '6px',
                          }}
                        />
                      </div>
                    )}

                    {!info.active && (
                      <span style={{ fontSize: '12px', color: 'var(--tg-hint)', fontStyle: 'italic' }}>
                        {lang === 'ru' ? 'Выходной' : 'Day Off'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveWorkingHours}
              disabled={isSavingHours}
              style={{
                marginTop: '6px',
                background: 'var(--tg-accent)',
                height: '38px',
                fontSize: '12.5px',
                fontWeight: 700,
              }}
            >
              {isSavingHours ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <span className="spinner-mini" style={{ width: '12px', height: '12px' }} />
                  {lang === 'ru' ? 'Сохранение...' : 'Saving...'}
                </span>
              ) : (
                lang === 'ru' ? '✓ Сохранить часы приема' : '✓ Save Working Hours'
              )}
            </button>
          </div>

          {/* Section 3: Visual Date / Slot Blocker */}
          <div className="tg-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚙️</span> {lang === 'ru' ? 'Управление бронированиями' : 'Manage Bookings'}
            </h3>
            <p style={{ fontSize: '11.5px', color: 'var(--tg-hint)', margin: 0, lineHeight: 1.4 }}>
              {lang === 'ru'
                ? 'Нажмите на любую дату или часовой слот ниже, чтобы вручную заблокировать/разблокировать время (например, на время отпуска или обеда).'
                : 'Click any date or time slot below to manually block or unblock availability (e.g. for lunch or holidays).'}
            </p>

            <div style={{ marginTop: '6px' }}>
              <BookingCalendar
                slotsText={
                  selectedProduct
                    ? (() => {
                        try {
                          const parsed = JSON.parse(selectedProduct.content_url);
                          return parsed.slots || '';
                        } catch {
                          return selectedProduct.content_url || '';
                        }
                      })()
                    : ''
                }
                busySlots={busySlots}
                bookings={dbBookings}
                bookingDate={bookingDate}
                setBookingDate={setBookingDate}
                bookingTime={bookingTime}
                setBookingTime={setBookingTime}
                lang={lang}
                isOwner={true}
                productId={selectedProductId}
                userTgId={buyerTgId}
                onRefreshBusySlots={() => fetchBusySlotsForProduct(selectedProductId)}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
