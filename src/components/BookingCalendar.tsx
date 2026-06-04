import { useState, useMemo } from 'react';

interface BookingCalendarProps {
  slotsText: string;
  busySlots: { start: string; end: string }[];
  bookingDate: string;
  setBookingDate: (date: string) => void;
  bookingTime: string;
  setBookingTime: (time: string) => void;
  lang: 'en' | 'ru';
}

export default function BookingCalendar({
  slotsText,
  busySlots,
  bookingDate,
  setBookingDate,
  bookingTime,
  setBookingTime,
  lang,
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

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
    // 0 = Sunday, 1 = Monday, etc.
    // Monday-indexed: 0 = Mo, 1 = Tu, ..., 6 = Su
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
    
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isPast: boolean }[] = [];
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
    const totalSlots = 42; // Grid length (6 rows of 7 days)
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

  // Hourly slots generation
  const hourlySlots = useMemo(() => {
    let startHour = 9;
    let endHour = 20;
    
    // Parse time range e.g. "10:00-18:00" from slotsText
    const match = slotsText.match(/(\d{1,2}):\d{2}\s*-\s*(\d{1,2}):\d{2}/);
    if (match) {
      startHour = parseInt(match[1], 10);
      endHour = parseInt(match[2], 10);
    }
    
    const slots: string[] = [];
    for (let h = startHour; h < endHour; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
    }
    return slots;
  }, [slotsText]);

  // Check if a specific slot is busy
  const isSlotBusy = (dateStr: string, timeStr: string) => {
    const slotStart = new Date(`${dateStr}T${timeStr}:00`).getTime();
    const slotEnd = slotStart + 60 * 60 * 1000; // 1-hour slots
    
    return busySlots.some(slot => {
      const start = new Date(slot.start).getTime();
      const end = new Date(slot.end).getTime();
      return slotStart < end && slotEnd > start;
    });
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
      
      {/* Month Header Navigation */}
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
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            color: 'var(--tg-text)',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s'
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
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            color: 'var(--tg-text)',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s'
          }}
        >
          →
        </button>
      </div>

      {/* Calendar Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
          {(lang === 'ru' ? weekdayNamesRU : weekdayNamesEN).map((day, idx) => (
            <span key={idx} style={{ fontSize: '11px', color: 'var(--tg-hint)', fontWeight: 600 }}>
              {day}
            </span>
          ))}
        </div>

        {/* Days grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {calendarDays.map((day, idx) => {
            const isSelected = bookingDate === day.dateStr;
            const disabled = day.isPast || !day.isCurrentMonth;
            
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (!disabled) {
                    setBookingDate(day.dateStr);
                    setBookingTime(''); // reset time when date changes
                  }
                }}
                disabled={disabled}
                style={{
                  height: '38px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isSelected 
                    ? 'var(--tg-accent)' 
                    : !day.isCurrentMonth
                    ? 'transparent'
                    : 'rgba(255,255,255,0.03)',
                  color: isSelected
                    ? '#fff'
                    : disabled
                    ? 'rgba(255,255,255,0.15)'
                    : 'var(--tg-text)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontWeight: isSelected ? 'bold' : 'normal',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                {day.dayNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hourly Slots Selection */}
      {bookingDate && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          borderTop: '1px solid var(--tg-border)',
          paddingTop: '14px',
        }} className="animate-fade-in">
          <p style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--tg-text)', margin: 0 }}>
            {lang === 'ru' ? 'Доступное время для записи:' : 'Available slots:'}
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
          }}>
            {hourlySlots.map((time, idx) => {
              const busy = isSlotBusy(bookingDate, time);
              const isSelected = bookingTime === time;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (!busy) {
                      setBookingTime(time);
                    }
                  }}
                  disabled={busy}
                  style={{
                    padding: '8px 0',
                    borderRadius: '8px',
                    border: 'none',
                    background: isSelected
                      ? 'var(--tg-accent)'
                      : busy
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(255,255,255,0.04)',
                    color: isSelected
                      ? '#fff'
                      : busy
                      ? 'rgba(255,255,255,0.15)'
                      : 'var(--tg-text)',
                    cursor: busy ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: isSelected ? 'bold' : 500,
                    textDecoration: busy ? 'line-through' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.2s'
                  }}
                  title={busy ? (lang === 'ru' ? 'Занято' : 'Booked') : undefined}
                >
                  {busy && <span style={{ fontSize: '10px' }}>🔒</span>}
                  {time}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
