const relative = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' });

/** "şimdi", "5 saat önce", "dün"; bir haftadan eskiyse "12 Kasım". */
export function relativeTime(ts, now = Date.now()) {
    if (!ts) return '';
    const minutes = Math.round((now - ts) / 60000);
    if (minutes < 1) return 'şimdi';
    if (minutes < 60) return relative.format(-minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (hours < 24) return relative.format(-hours, 'hour');
    const days = Math.round(hours / 24);
    if (days < 7) return relative.format(-days, 'day');
    return new Date(ts).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}

export const fullTime = ts => new Date(ts).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' });

/** "Elif · 5 saat önce"; isim yoksa "Anonim". */
export const byline = (item, now) => [item.author || 'Anonim', relativeTime(item.ts, now)].filter(Boolean).join(' · ');
