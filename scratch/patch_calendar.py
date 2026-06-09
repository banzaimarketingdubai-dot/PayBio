import codecs

file_path = 'src/components/BookingCalendar.tsx'

new_code = """import { useState, useMemo, useEffect } from 'react';

interface BookingCalendarProps {
  slotsText: string;
  busySlots: { start: string; end: string }[];
  bookings?: { id: string; start: string; end: string; order_id: string | null; status: string }[];
  bookingDate: string;
  setBookingDate: (date: string) => void;
  bookingTime: string;
  setBookingTime: (time: string) => void;
  lang: 'en' | 'ru';
  isOwner?: boolean;
  productId?: string;
  userTgId?: number;
  onRefreshBusySlots?: () => void;
  onUpdateSlots?: (newSlots: string) => Promise<boolean>;
}

export default function BookingCalendar({
  slotsText,
  busySlots,
  bookings = [],
  bookingDate,
  setBookingDate,
  bookingTime,
  setBookingTime,
  lang,
  isOwner = false,
  productId,
  userTgId,
  onRefreshBusySlots,
  onUpdateSlots,
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [activeView, setActiveView] = useState<'month' | 'week' | 'day'>('month');

  // Bulk Mode states
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkSelectedDates, setBulkSelectedDates] = useState<string[]>([]);
  const [bulkSelectedTimes, setBulkSelectedTimes] = useState<string[]>([]);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  // States for schedule templates
  const [workdaysRange, setWorkdaysRange] = useState('09:00-18:00');
  const [weekendsRange, setWeekendsRange] = useState('closed');

  // Load existing template if present in slotsText
  useEffect(() => {
    try {
      const parsed = JSON.parse(slotsText);
      if (parsed) {
        if (parsed.workdays) setWorkdaysRange(parsed.workdays);
        if (parsed.weekends) setWeekendsRange(parsed.weekends);
      }
    } catch {
      if (slotsText && slotsText.includes('-')) {
        setWorkdaysRange(slotsText);
      }
    }
  }, [slotsText]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Auto-select today if Day View is selected and no date is set
  useEffect(() => {
    if (activeView === 'day' && !bookingDate) {
      setBookingDate(todayStr);
    }
  }, [activeView, bookingDate, todayStr, setBookingDate]);

  const weekDays = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        dateStr,
        dateObj: d,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' })
      });
    }
    return days;
  }, [lang]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthNamesEN = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNamesRU = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const weekdayNamesEN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const weekdayNamesRU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => {
    const day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const daysInCurrent = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Padding from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = prevMonthDays - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: dNum,
        isCurrentMonth: false,
        isPast: true,
      });
    }

    // Days of current month
    for (let dNum = 1; dNum <= daysInCurrent; dNum++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      const thisDate = new Date(year, month, dNum);
      days.push({
        dateStr: dStr,
        dayNum: dNum,
        isCurrentMonth: true,
        isPast: thisDate < today,
      });
    }

    // Padding from next month
    const totalSlots = 42;
    const remainingSlots = totalSlots - days.length;
    for (let dNum = 1; dNum <= remainingSlots; dNum++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: dNum,
        isCurrentMonth: false,
        isPast: false,
      });
    }

    return days;
  }, [year, month]);

  // Hourly slots generation (with workdays & weekends schedule)
  const hourlySlots = useMemo(() => {
    let range = slotsText;
    
    try {
      const parsed = JSON.parse(slotsText);
      if (parsed) {
        const d = new Date(bookingDate + 'Z');
        const dayOfWeek = d.getUTCDay(); // 0 = Sunday, 6 = Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isWeekend) {
          range = parsed.weekends || 'closed';
        } else {
          range = parsed.workdays || '09:00-18:00';
        }
      }
    } catch {
      // fallback to plain range string
    }

    if (!range || range === 'closed') {
      return [];
    }

    let startHour = 9;
    let endHour = 20;
    
    const match = range.match(/(\\d{1,2}):\\d{2}\\s*-\\s*(\\d{1,2}):\\d{2}/);
    if (match) {
      startHour = parseInt(match[1], 10);
      endHour = parseInt(match[2], 10);
    }
    
    const slots: string[] = [];
    for (let h = startHour; h < endHour; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    return slots;
  }, [slotsText, bookingDate]);

  const [isTogglingBlock, setIsTogglingBlock] = useState<string | null>(null);

  const showAlert = (message: string) => {
    if (typeof window !== 'undefined') {
      const WebApp = (window as any).Telegram?.WebApp;
      if (WebApp?.showAlert) {
        WebApp.showAlert(message);
        return;
      }
    }
    alert(message);
  };

  // Find database booking for a specific hour start time (timezone-safe)
  const getBookingForSlot = (dateStr: string, timeStr: string) => {
    const slotStart = new Date(`${dateStr}T${timeStr}:00Z`).getTime();
    return bookings.find(b => {
      if (b.status !== 'SCHEDULED') return false;
      const start = new Date(b.start.endsWith('Z') ? b.start : `${b.start}Z`).getTime();
      return start === slotStart;
    });
  };

  // Check if a specific slot is busy (either DB booking or external calendar slot)
  const isSlotBusy = (dateStr: string, timeStr: string) => {
    const slotStart = new Date(`${dateStr}T${timeStr}:00Z`).getTime();
    const slotEnd = slotStart + 30 * 60 * 1000;
    
    return busySlots.some(slot => {
      const start = new Date(slot.start.endsWith('Z') ? slot.start : `${slot.start}Z`).getTime();
      const end = new Date(slot.end.endsWith('Z') ? slot.end : `${slot.end}Z`).getTime();
      return slotStart === start || (slotStart < end && slotEnd > start);
    });
  };

  const handleSlotClickOwner = async (time: string) => {
    if (!productId || userTgId === undefined) return;
    const slotTimeStr = `${bookingDate}T${time}:00Z`; // Force UTC Z format
    const booking = getBookingForSlot(bookingDate, time);
    const isManualBlock = booking && !booking.order_id;
    const isCustomerBooking = booking && !!booking.order_id;
    const extBusy = isSlotBusy(bookingDate, time) && !booking;

    if (isCustomerBooking || extBusy) {
      const msg = lang === 'ru'
        ? 'Этот слот забронирован клиентом или внешним календарем. Его нельзя изменить вручную.'
        : 'This slot is booked by a customer or external calendar and cannot be modified here.';
      showAlert(msg);
      return;
    }

    const confirmMsg = isManualBlock
      ? (lang === 'ru'
          ? `Разблокировать время ${time} на дату ${bookingDate}?`
          : `Unblock time slot ${time} on ${bookingDate}?`)
      : (lang === 'ru'
          ? `Заблокировать время ${time} на дату ${bookingDate}?`
          : `Block time slot ${time} on ${bookingDate}?`);

    const action = async () => {
      setIsTogglingBlock(time);
      try {
        if (isManualBlock) {
          const res = await fetch(`/api/calendar/block?product_id=${productId}&slot_time=${encodeURIComponent(slotTimeStr)}&user_tg_id=${userTgId}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (data.success) {
            if (onRefreshBusySlots) onRefreshBusySlots();
          } else {
            showAlert(data.error || 'Failed to unblock slot');
          }
        } else {
          const res = await fetch(`/api/calendar/block`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_id: productId,
              slot_time: slotTimeStr,
              user_tg_id: userTgId
            })
          });
          const data = await res.json();
          if (data.success) {
            if (onRefreshBusySlots) onRefreshBusySlots();
          } else {
            showAlert(data.error || 'Failed to block slot');
          }
        }
      } catch (err: any) {
        showAlert(err.message || 'Error processing slot request');
      } finally {
        setIsTogglingBlock(null);
      }
    };

    if (typeof window !== 'undefined') {
      const WebApp = (window as any).Telegram?.WebApp;
      if (WebApp?.showConfirm) {
        WebApp.showConfirm(confirmMsg, (ok: boolean) => {
          if (ok) action();
        });
        return;
      }
    }

    if (window.confirm(confirmMsg)) {
      action();
    }
  };

  // Bulk Mode Action Handlers
  const handleBulkBlock = async () => {
    if (!productId || userTgId === undefined) return;
    setIsBulkActionLoading(true);
    try {
      const slotTimes: string[] = [];
      bulkSelectedDates.forEach(date => {
        bulkSelectedTimes.forEach(time => {
          slotTimes.push(`${date}T${time}:00Z`);
        });
      });

      const res = await fetch(`/api/calendar/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          slot_times: slotTimes,
          user_tg_id: userTgId
        })
      });
      const data = await res.json();
      if (data.success) {
        setBulkSelectedDates([]);
        setBulkSelectedTimes([]);
        setIsBulkMode(false);
        if (onRefreshBusySlots) onRefreshBusySlots();
        showAlert(lang === 'ru' ? 'Слоты успешно заблокированы!' : 'Slots blocked successfully!');
      } else {
        showAlert(data.error || 'Failed to block slots');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error blocking slots');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkUnblock = async () => {
    if (!productId || userTgId === undefined) return;
    setIsBulkActionLoading(true);
    try {
      const slotTimes: string[] = [];
      bulkSelectedDates.forEach(date => {
        bulkSelectedTimes.forEach(time => {
          slotTimes.push(`${date}T${time}:00Z`);
        });
      });

      const res = await fetch(`/api/calendar/block?product_id=${productId}&slot_times=${encodeURIComponent(slotTimes.join(','))}&user_tg_id=${userTgId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setBulkSelectedDates([]);
        setBulkSelectedTimes([]);
        setIsBulkMode(false);
        if (onRefreshBusySlots) onRefreshBusySlots();
        showAlert(lang === 'ru' ? 'Слоты успешно разблокированы!' : 'Slots unblocked successfully!');
      } else {
        showAlert(data.error || 'Failed to unblock slots');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error unblocking slots');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    const templateStr = JSON.stringify({
      workdays: workdaysRange,
      weekends: weekendsRange
    });
    if (onUpdateSlots) {
      const success = await onUpdateSlots(templateStr);
      if (success) {
        showAlert(lang === 'ru' ? 'Шаблон расписания сохранен!' : 'Schedule template saved!');
      } else {
        showAlert(lang === 'ru' ? 'Не удалось сохранить расписание.' : 'Failed to save schedule template.');
      }
    }
  };

  return (
    <div style={{
      background: 'var(--tg-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--tg-border)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }} className="animate-fade-up">

      {/* Tabs Selector */}
      <div className="calendar-view-tabs">
        <button 
          type="button" 
          className={`calendar-view-tab ${activeView === 'month' ? 'active' : ''}`}
          onClick={() => setActiveView('month')}
        >
          {lang === 'ru' ? 'Месяц' : 'Month'}
        </button>
        <button 
          type="button" 
          className={`calendar-view-tab ${activeView === 'week' ? 'active' : ''}`}
          onClick={() => setActiveView('week')}
        >
          {lang === 'ru' ? 'Неделя' : 'Week'}
        </button>
        <button 
          type="button" 
          className={`calendar-view-tab ${activeView === 'day' ? 'active' : ''}`}
          onClick={() => setActiveView('day')}
        >
          {lang === 'ru' ? 'День' : 'Day'}
        </button>
      </div>

      {/* Owner controls: Bulk Mode toggle */}
      {isOwner && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--tg-border)' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--tg-text)' }}>
            ⛓️ {lang === 'ru' ? 'Массовый выбор слотов' : 'Bulk Slot Selection'}
          </span>
          <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '38px', height: '20px' }}>
            <input 
              type="checkbox" 
              checked={isBulkMode} 
              onChange={(e) => {
                setIsBulkMode(e.target.checked);
                setBulkSelectedDates([]);
                setBulkSelectedTimes([]);
              }}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: isBulkMode ? 'var(--tg-accent)' : 'rgba(255,255,255,0.1)',
              transition: '.2s', borderRadius: '20px'
            }}>
              <span style={{
                position: 'absolute', content: '""', height: '14px', width: '14px', left: isBulkMode ? '20px' : '3px', bottom: '3px',
                backgroundColor: 'white', transition: '.2s', borderRadius: '50%'
              }} />
            </span>
          </label>
        </div>
      )}

      {/* 1. MONTH VIEW */}
      {activeView === 'month' && (
        <>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--tg-border)',
            paddingBottom: '12px'
          }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', color: 'var(--tg-text)', cursor: 'pointer',
                fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              ←
            </button>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--tg-text)' }}>
              {lang === 'ru' ? monthNamesRU[month] : monthNamesEN[month]} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', color: 'var(--tg-text)', cursor: 'pointer',
                fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
              {(lang === 'ru' ? weekdayNamesRU : weekdayNamesEN).map((day, idx) => (
                <span key={idx} style={{ fontSize: '11px', color: 'var(--tg-hint)', fontWeight: 600 }}>
                  {day}
                </span>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {calendarDays.map((day, idx) => {
                const isSelected = isBulkMode 
                  ? bulkSelectedDates.includes(day.dateStr) 
                  : bookingDate === day.dateStr;
                const disabled = day.isPast || !day.isCurrentMonth;
                
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (!disabled) {
                        if (isBulkMode) {
                          setBulkSelectedDates(prev => 
                            prev.includes(day.dateStr) 
                              ? prev.filter(d => d !== day.dateStr) 
                              : [...prev, day.dateStr]
                          );
                        } else {
                          setBookingDate(day.dateStr);
                          setBookingTime('');
                        }
                      }
                    }}
                    disabled={disabled}
                    style={{
                      height: '38px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isSelected 
                        ? (isBulkMode ? 'rgba(82,158,255,0.2)' : 'var(--tg-accent)')
                        : !day.isCurrentMonth
                        ? 'transparent'
                        : 'rgba(255,255,255,0.03)',
                      border: isBulkMode && isSelected ? '1.5px solid var(--tg-accent)' : 'none',
                      color: isSelected
                        ? (isBulkMode ? 'var(--tg-text)' : '#fff')
                        : disabled
                        ? 'rgba(255,255,255,0.15)'
                        : 'var(--tg-text)',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      fontWeight: isSelected ? 'bold' : 'normal',
                      fontSize: '13px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    {day.dayNum}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* 2. WEEK VIEW */}
      {activeView === 'week' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '11px', color: 'var(--tg-hint)', margin: 0, fontWeight: 600 }}>
            {lang === 'ru' ? 'Выберите день:' : 'Select day:'}
          </p>
          <div className="week-selector-container">
            {weekDays.map((day, idx) => {
              const isSelected = isBulkMode 
                ? bulkSelectedDates.includes(day.dateStr) 
                : bookingDate === day.dateStr;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (isBulkMode) {
                      setBulkSelectedDates(prev => 
                        prev.includes(day.dateStr) 
                          ? prev.filter(d => d !== day.dateStr) 
                          : [...prev, day.dateStr]
                      );
                    } else {
                      setBookingDate(day.dateStr);
                      setBookingTime('');
                    }
                  }}
                  className={`week-day-btn ${isSelected ? 'active' : ''}`}
                  style={isBulkMode && isSelected ? { background: 'rgba(82,158,255,0.15)', border: '1.5px solid var(--tg-accent)' } : undefined}
                >
                  <span style={{ fontSize: '10px', opacity: 0.8, textTransform: 'uppercase' }}>{day.dayName}</span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '2px' }}>{day.dayNum}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. DAY VIEW */}
      {activeView === 'day' && (
        <div style={{ padding: '8px 0', borderBottom: '1px solid var(--tg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--tg-text)' }}>
            📅 {new Date(bookingDate || todayStr + 'Z').toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          {bookingDate !== todayStr && (
            <button
              type="button"
              onClick={() => {
                setBookingDate(todayStr);
                setBookingTime('');
              }}
              style={{
                background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '12px',
                padding: '4px 10px', fontSize: '11px', color: 'var(--tg-text)', cursor: 'pointer'
              }}
            >
              {lang === 'ru' ? 'Сегодня' : 'Today'}
            </button>
          )}
        </div>
      )}

      {/* Hourly Slots Selection */}
      {(bookingDate || isBulkMode) && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          borderTop: '1px solid var(--tg-border)',
          paddingTop: '14px',
        }} className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--tg-text)', margin: 0 }}>
              {isOwner 
                ? (isBulkMode 
                    ? (lang === 'ru' ? 'Выберите слоты времени для блокировки:' : 'Select time slots to manage:') 
                    : (lang === 'ru' ? 'Управление расписанием:' : 'Manage Schedule:'))
                : (lang === 'ru' ? 'Доступное время для записи:' : 'Available slots:')}
            </p>
            {isOwner && (
              <span style={{
                fontSize: '10px', background: 'rgba(255,255,255,0.06)',
                padding: '3px 8px', borderRadius: '12px', color: 'var(--tg-hint)', fontWeight: 600
              }}>
                {lang === 'ru' ? 'Режим креатора' : 'Creator Mode'}
              </span>
            )}
          </div>
          
          {isOwner && (
            <p style={{ fontSize: '11px', color: 'var(--tg-hint)', margin: '0 0 4px 0', lineHeight: 1.4 }}>
              💡 {isBulkMode 
                ? (lang === 'ru'
                    ? 'Шаг 1: Выберите даты на календаре выше. Шаг 2: Выберите слоты времени ниже. Шаг 3: Нажмите заблокировать/разблокировать.'
                    : 'Step 1: Select dates on the calendar above. Step 2: Select time slots below. Step 3: Block or unblock them.')
                : (lang === 'ru' 
                    ? 'Нажмите на слот, чтобы заблокировать или разблокировать это время для клиентов.' 
                    : 'Tap a slot to block or unblock this hour for customers.')}
            </p>
          )}

          {/* Bulk Action Buttons Panel */}
          {isBulkMode && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '8px', 
              background: 'rgba(255,255,255,0.02)', padding: '12px',
              borderRadius: '12px', border: '1px solid var(--tg-border)', marginBottom: '8px'
            }}>
              <p style={{ fontSize: '12px', margin: 0, color: 'var(--tg-hint)' }}>
                📍 {lang === 'ru' ? 'Выбрано дат:' : 'Selected dates:'} <b>{bulkSelectedDates.length}</b> | {lang === 'ru' ? 'слотов времени:' : 'time slots:'} <b>{bulkSelectedTimes.length}</b>
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleBulkBlock}
                  disabled={isBulkActionLoading || bulkSelectedDates.length === 0 || bulkSelectedTimes.length === 0}
                  className="btn-primary"
                  style={{ flex: 1, background: 'rgba(233,92,92,0.85)', fontSize: '12.5px', height: '36px' }}
                >
                  🚫 {isBulkActionLoading ? '...' : (lang === 'ru' ? 'Заблокировать' : 'Block Selected')}
                </button>
                <button
                  type="button"
                  onClick={handleBulkUnblock}
                  disabled={isBulkActionLoading || bulkSelectedDates.length === 0 || bulkSelectedTimes.length === 0}
                  className="btn-secondary"
                  style={{ flex: 1, fontSize: '12.5px', height: '36px' }}
                >
                  🔓 {isBulkActionLoading ? '...' : (lang === 'ru' ? 'Разблокировать' : 'Unblock')}
                </button>
              </div>
            </div>
          )}

          {/* Slots grid */}
          {(!isBulkMode || bulkSelectedDates.length > 0) && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
            }}>
              {(isBulkMode ? ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'] : hourlySlots).map((time, idx) => {
                const booking = isBulkMode ? null : getBookingForSlot(bookingDate, time);
                const isManualBlock = booking && !booking.order_id;
                const isCustomerBooking = booking && !!booking.order_id;
                const isExtBusy = isBulkMode ? false : (isSlotBusy(bookingDate, time) && !booking);
                
                const busy = !!booking || isExtBusy;
                const isSelected = isBulkMode 
                  ? bulkSelectedTimes.includes(time) 
                  : bookingTime === time;
                const loading = isTogglingBlock === time;

                let btnBg = 'rgba(255,255,255,0.04)';
                let btnColor = 'var(--tg-text)';
                let border = 'none';
                let textDecor = 'none';

                if (isSelected) {
                  btnBg = 'var(--tg-accent)';
                  btnColor = '#fff';
                } else if (isManualBlock) {
                  btnBg = 'rgba(233,92,92,0.08)';
                  btnColor = 'var(--tg-destructive, #e53935)';
                  border = '1px solid rgba(233,92,92,0.2)';
                  textDecor = 'line-through';
                } else if (isCustomerBooking || isExtBusy) {
                  btnBg = 'rgba(255,255,255,0.02)';
                  btnColor = 'rgba(255,255,255,0.15)';
                  textDecor = 'line-through';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (isOwner) {
                        if (isBulkMode) {
                          setBulkSelectedTimes(prev => 
                            prev.includes(time) 
                              ? prev.filter(t => t !== time) 
                              : [...prev, time]
                          );
                        } else {
                          handleSlotClickOwner(time);
                        }
                      } else if (!busy) {
                        setBookingTime(time);
                      }
                    }}
                    disabled={loading || (!isOwner && busy)}
                    style={{
                      padding: '8px 0', borderRadius: '8px', border,
                      background: btnBg, color: btnColor,
                      cursor: (loading || (!isOwner && busy)) ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: (isSelected || isManualBlock) ? 'bold' : 500,
                      textDecoration: textDecor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '4px', transition: 'all 0.2s', position: 'relative'
                    }}
                    title={
                      loading ? '...' : isManualBlock ? (lang === 'ru' ? 'Заблокировано вами' : 'Blocked by you')
                      : isCustomerBooking ? (lang === 'ru' ? 'Забронировано клиентом' : 'Booked by customer')
                      : isExtBusy ? (lang === 'ru' ? 'Внешний календарь' : 'External calendar') : undefined
                    }
                  >
                    {loading ? (
                      <span style={{ fontSize: '10px' }}>⏳</span>
                    ) : isManualBlock ? (
                      <span style={{ fontSize: '10px' }}>🚫</span>
                    ) : (isCustomerBooking || isExtBusy) ? (
                      <span style={{ fontSize: '10px' }}>🔒</span>
                    ) : null}
                    {time}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Weekday / Weekend Schedule templates configuration (Owner-only) */}
      {isOwner && onUpdateSlots && (
        <div style={{
          borderTop: '1px solid var(--tg-border)', paddingTop: '14px', 
          marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <p style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: 'var(--tg-text)' }}>
            ⚙️ {lang === 'ru' ? 'Настройка рабочих часов и выходных' : 'Schedule Template Settings'}
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--tg-hint)', display: 'block', marginBottom: '4px' }}>
                📅 {lang === 'ru' ? 'Будние дни (Пн-Пт):' : 'Workdays (Mon-Fri):'}
              </label>
              <select 
                value={workdaysRange} 
                onChange={(e) => setWorkdaysRange(e.target.value)} 
                className="tg-input" 
                style={{ fontSize: '12.5px', padding: '8px', background: 'var(--tg-secondary-bg)', color: 'var(--tg-text)', border: '1px solid var(--tg-border)', width: '100%', borderRadius: '10px' }}
              >
                <option value="09:00-18:00">09:00 - 18:00</option>
                <option value="08:00-17:00">08:00 - 17:00</option>
                <option value="10:00-19:00">10:00 - 19:00</option>
                <option value="09:00-20:00">09:00 - 20:00</option>
                <option value="closed">{lang === 'ru' ? 'Выходной / Closed' : 'Closed'}</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--tg-hint)', display: 'block', marginBottom: '4px' }}>
                🏖️ {lang === 'ru' ? 'Выходные дни (Сб-Вс):' : 'Weekends (Sat-Sun):'}
              </label>
              <select 
                value={weekendsRange} 
                onChange={(e) => setWeekendsRange(e.target.value)} 
                className="tg-input" 
                style={{ fontSize: '12.5px', padding: '8px', background: 'var(--tg-secondary-bg)', color: 'var(--tg-text)', border: '1px solid var(--tg-border)', width: '100%', borderRadius: '10px' }}
              >
                <option value="closed">{lang === 'ru' ? 'Выходной / Closed' : 'Closed'}</option>
                <option value="10:00-16:00">10:00 - 16:00</option>
                <option value="09:00-18:00">09:00 - 18:00</option>
                <option value="11:00-17:00">11:00 - 17:00</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleSaveTemplate}
              className="btn-primary"
              style={{ marginTop: '6px', background: 'var(--tg-accent)', height: '38px', borderRadius: '10px', fontSize: '13px' }}
            >
              ⚡ {lang === 'ru' ? 'Применить шаблон расписания' : 'Apply Schedule Template'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
"""

with codecs.open(file_path, 'w', 'utf-8') as f:
    f.write(new_code)

print("BookingCalendar.tsx overwritten successfully!")
