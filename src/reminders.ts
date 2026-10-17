/** Study reminders without a server: calendar event (Google / .ics) + browser notification while the app is open. */

const SITE = typeof location !== 'undefined' ? location.origin : 'https://pmp-trainer-xi.vercel.app'

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

/** Next occurrence of HH:MM in local time, formatted for Google Calendar (local, no Z) */
function nextLocal(time: string): Date {
  const [h, m] = time.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1)
  return d
}

const fmtLocal = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`

export function googleCalendarUrl(time: string, title: string, details: string): string {
  const start = nextLocal(time)
  const end = new Date(start.getTime() + 15 * 60_000)
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: `${details}\n${SITE}`,
    dates: `${fmtLocal(start)}/${fmtLocal(end)}`,
    recur: 'RRULE:FREQ=DAILY',
  })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

export function icsFile(time: string, title: string, details: string): string {
  const start = nextLocal(time)
  const end = new Date(start.getTime() + 15 * 60_000)
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PMP Trainer//RU',
    'BEGIN:VEVENT',
    `UID:pmp-trainer-${time.replace(':', '')}@pmp-trainer`,
    `DTSTAMP:${fmtLocal(new Date())}`,
    `DTSTART;TZID=${tz}:${fmtLocal(start)}`,
    `DTEND;TZID=${tz}:${fmtLocal(end)}`,
    'RRULE:FREQ=DAILY',
    `SUMMARY:${title}`,
    `DESCRIPTION:${details.replace(/\n/g, '\\n')} ${SITE}`,
    `URL:${SITE}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${title}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestNotifications(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

/** Show a one-off browser notification (only works while the site is open / in background tab). */
export function notify(title: string, body: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/favicon.ico' })
  } catch {
    /* ignore */
  }
}
