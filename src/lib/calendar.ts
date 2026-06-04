export interface BusyInterval {
  start: string; // ISO DateTime string
  end: string;   // ISO DateTime string
}

/**
 * Parses DTSTART or DTEND line from an iCalendar event.
 * Handles formats like:
 * - DTSTART:20260604T100000Z
 * - DTSTART;TZID=America/New_York:20260604T100000
 * - DTSTART;VALUE=DATE:20260604
 */
function parseIcsDate(line: string): Date | null {
  const parts = line.split(':');
  if (parts.length < 2) return null;
  const value = parts.slice(1).join(':').trim();

  // YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
  const dateTimeMatch = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (dateTimeMatch) {
    const [, y, m, d, hh, mm, ss, z] = dateTimeMatch;
    const isoString = `${y}-${m}-${d}T${hh}:${mm}:${ss}${z ? 'Z' : ''}`;
    return new Date(isoString);
  }

  // YYYYMMDD (all day event)
  const dateMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateMatch) {
    const [, y, m, d] = dateMatch;
    // All day events span from 00:00 to 23:59:59 (we return start of the day)
    return new Date(`${y}-${m}-${d}T00:00:00Z`);
  }

  return null;
}

/**
 * Parses iCalendar text content and extracts event intervals.
 */
export function parseICS(icsText: string): BusyInterval[] {
  const intervals: BusyInterval[] = [];
  
  // Unfold folded lines (lines starting with space/tab represent continuation of previous line)
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  
  let currentEvent: { start?: Date; end?: Date } | null = null;

  for (let line of lines) {
    line = line.trim();
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT') {
      if (currentEvent && currentEvent.start) {
        const start = currentEvent.start;
        // Default end time to start time if missing
        const end = currentEvent.end || start;
        intervals.push({
          start: start.toISOString(),
          end: end.toISOString()
        });
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith('DTSTART')) {
        const d = parseIcsDate(line);
        if (d) currentEvent.start = d;
      } else if (line.startsWith('DTEND')) {
        const d = parseIcsDate(line);
        if (d) currentEvent.end = d;
      }
    }
  }

  return intervals;
}

/**
 * Merges overlapping and adjacent busy intervals.
 */
export function mergeIntervals(intervals: BusyInterval[]): BusyInterval[] {
  if (intervals.length === 0) return [];
  
  // Sort intervals by start time
  const sorted = [...intervals].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const merged: BusyInterval[] = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    
    const lastEnd = new Date(last.end).getTime();
    const currentStart = new Date(current.start).getTime();
    const currentEnd = new Date(current.end).getTime();
    
    if (currentStart <= lastEnd) {
      // Overlap or adjacency: merge them by updating end time
      if (currentEnd > lastEnd) {
        last.end = current.end;
      }
    } else {
      merged.push(current);
    }
  }
  
  return merged;
}

/**
 * Fetches public calendar .ics from URL, parses and returns future busy slots.
 */
export async function fetchBusySlots(icsUrl: string): Promise<BusyInterval[]> {
  try {
    let targetUrl = icsUrl.trim();
    
    // Convert webcal links to https so fetch can fetch them
    if (targetUrl.startsWith('webcal://')) {
      targetUrl = 'https://' + targetUrl.slice(9);
    }
    
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      console.warn('Invalid calendar URL protocol:', icsUrl);
      return [];
    }

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PayBioBot/1.0; +https://paybio.io)',
        'Accept': 'text/calendar, text/plain, */*'
      },
      next: { revalidate: 60 } // Cache calendar response for 60 seconds
    });

    if (!res.ok) {
      console.error(`Failed to fetch calendar from ${targetUrl}: HTTP ${res.status}`);
      return [];
    }

    const icsText = await res.text();
    const allSlots = parseICS(icsText);
    
    const now = new Date();
    const limitDate = new Date();
    limitDate.setDate(now.getDate() + 60); // Check 60 days ahead
    
    // Filter only active future events
    const futureSlots = allSlots.filter(slot => {
      const end = new Date(slot.end);
      const start = new Date(slot.start);
      return end > now && start < limitDate;
    });

    return mergeIntervals(futureSlots);
  } catch (error) {
    console.error('Error fetching/parsing calendar:', error);
    return [];
  }
}
